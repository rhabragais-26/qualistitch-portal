
'use client';

import React, { useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Skeleton } from './ui/skeleton';
import { format, startOfWeek, eachDayOfInterval, subDays, startOfDay } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

type DailySoldQuantityChartProps = {
  productTypeFilter: string;
  timeRange: string;
};

export function DailySoldQuantityChart({ productTypeFilter, timeRange }: DailySoldQuantityChartProps) {
  const firestore = useFirestore();

  const leadsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'leads')) : null), [firestore]);
  const { data: leads, isLoading: areLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery, undefined, { listen: false });
  
  const inventoryQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'inventory')) : null), [firestore]);
  const { data: inventoryItems, isLoading: isInventoryLoading, error: inventoryError } = useCollection<InventoryItem>(inventoryQuery, undefined, { listen: false });

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
    return <Skeleton className="h-[350px] w-full" />;
  }

  if (error) {
    return <div className="h-[350px] flex items-center justify-center"><p className="text-destructive">Error loading chart data.</p></div>;
  }

  return (
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
  );
}
