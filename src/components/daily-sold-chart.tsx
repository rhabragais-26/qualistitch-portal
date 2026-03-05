'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import { format, startOfWeek, eachDayOfInterval, subDays, startOfDay } from 'date-fns';

// Type definitions
type Order = {
  productType: string;
  quantity: number;
};

type Lead = {
  submissionDateTime: string;
  orders: Order[];
};

type InventoryItem = {
    id: string;
    productType: string;
    color: string;
    size: string;
    stock: number;
};

const COLORS = ['#0088FE', '#FF8042'];

export function DailySoldQuantityChart() {
  const firestore = useFirestore();
  const [timeRange, setTimeRange] = useState('7d');
  const [productTypeFilter, setProductTypeFilter] = useState('');

  const leadsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'leads')) : null), [firestore]);
  const { data: leads, isLoading: areLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery, undefined, { listen: false });
  
  const inventoryQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'inventory')) : null), [firestore]);
  const { data: inventoryItems, isLoading: isInventoryLoading, error: inventoryError } = useCollection<InventoryItem>(inventoryQuery, undefined, { listen: false });

  const productTypes = useMemo(() => {
    if (!leads && !inventoryItems) return [];
    const fromLeads = leads?.flatMap(l => l.orders.map(o => o.productType)) || [];
    const fromInventory = inventoryItems?.map(i => i.productType) || [];
    return [...new Set([...fromLeads, ...fromInventory])]
        .filter(type => type && type !== 'Patches' && type !== 'Client Owned')
        .sort();
  }, [leads, inventoryItems]);

  useEffect(() => {
    if (productTypes.length > 0 && !productTypeFilter) {
        setProductTypeFilter(productTypes[0]);
    }
  }, [productTypes, productTypeFilter]);

  const { chartData } = useMemo(() => {
    if (!leads || !inventoryItems || !productTypeFilter) return { chartData: [] };

    // 1. Determine date range
    const endDate = new Date();
    let startDate: Date;

    if (timeRange === '7d') {
      startDate = subDays(endDate, 6);
    } else if (timeRange === '14d') {
      startDate = subDays(endDate, 13);
    } else if (timeRange === '30d') {
      startDate = subDays(endDate, 29);
    } else { // 'this_week'
      startDate = startOfWeek(endDate, { weekStartsOn: 1 });
    }
    
    startDate = startOfDay(startDate);

    // 2. Calculate initial stock at the beginning of the period
    const totalInitialStock = inventoryItems
      .filter(item => item.productType === productTypeFilter)
      .reduce((sum, item) => sum + item.stock, 0);

    const salesBeforePeriod = leads
      .filter(lead => new Date(lead.submissionDateTime) < startDate)
      .flatMap(lead => lead.orders)
      .filter(order => order.productType === productTypeFilter)
      .reduce((sum, order) => sum + order.quantity, 0);
      
    let runningStock = totalInitialStock - salesBeforePeriod;
    
    // 3. Process sales within the date range
    const salesByDay: { [key: string]: number } = {};
    const relevantLeads = leads.filter(lead => {
        try {
            const submissionDate = new Date(lead.submissionDateTime);
            return submissionDate >= startDate && submissionDate <= endDate;
        } catch(e) { return false; }
    });

    relevantLeads.forEach(lead => {
        const dateStr = format(new Date(lead.submissionDateTime), 'MMM dd');
        lead.orders.forEach(order => {
            if (order.productType === productTypeFilter) {
                if (!salesByDay[dateStr]) {
                    salesByDay[dateStr] = 0;
                }
                salesByDay[dateStr] += order.quantity;
            }
        });
    });
    
    // 4. Generate final chart data
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    const finalChartData = allDays.map(day => {
        const dateStr = format(day, 'MMM dd');
        const sold = salesByDay[dateStr] || 0;
        runningStock -= sold;
        return {
            date: dateStr,
            sold: sold,
            remaining: runningStock,
        };
    });

    return { chartData: finalChartData };
  }, [leads, inventoryItems, timeRange, productTypeFilter]);
  
  const isLoading = areLeadsLoading || isInventoryLoading;
  const error = leadsError || inventoryError;

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (error) {
    return <Card><CardContent><p className="text-destructive">Error loading chart data.</p></CardContent></Card>;
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle>Daily Sold vs. Remaining Stocks</CardTitle>
              <CardDescription>Daily sold quantity and remaining stocks for the selected product.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
                    <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Select Product Type" />
                    </SelectTrigger>
                    <SelectContent>
                        {productTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="this_week">This Week</SelectItem>
                        <SelectItem value="7d">Last 7 Days</SelectItem>
                        <SelectItem value="14d">Last 14 Days</SelectItem>
                        <SelectItem value="30d">Last 30 Days</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" stroke={COLORS[0]} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" stroke={COLORS[1]} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line 
                  yAxisId="left"
                  key="sold"
                  type="monotone" 
                  dataKey="sold" 
                  name="Quantity Sold"
                  stroke={COLORS[0]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
              >
                <LabelList dataKey="sold" position="top" />
              </Line>
              <Line 
                  yAxisId="right"
                  key="remaining"
                  type="monotone" 
                  dataKey="remaining" 
                  name="Stocks Remaining"
                  stroke={COLORS[1]} 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
              >
                 <LabelList dataKey="remaining" position="top" />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
