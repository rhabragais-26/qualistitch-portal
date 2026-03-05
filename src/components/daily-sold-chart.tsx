'use client';

import React, { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays, startOfDay } from 'date-fns';

type Order = {
  productType: string;
  quantity: number;
};

type Lead = {
  submissionDateTime: string;
  orders: Order[];
};

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1967',
  '#3498DB', '#2ECC71', '#F1C40F', '#E67E22', '#9B59B6', '#E74C3C',
  '#1ABC9C', '#34495E',
];

export function DailySoldQuantityChart() {
  const firestore = useFirestore();
  const [timeRange, setTimeRange] = useState('7d');

  const leadsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'leads')) : null), [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery, undefined, { listen: false });

  const { chartData, productTypes } = useMemo(() => {
    if (!leads) return { chartData: [], productTypes: [] };

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

    const dateMap: { [key: string]: { [product: string]: number } } = {};
    const allProductTypes = new Set<string>();

    const relevantLeads = leads.filter(lead => {
        try {
            const submissionDate = new Date(lead.submissionDateTime);
            return submissionDate >= startDate && submissionDate <= endDate;
        } catch(e) {
            return false;
        }
    });

    relevantLeads.forEach(lead => {
      const dateStr = format(new Date(lead.submissionDateTime), 'MMM dd');
      
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = {};
      }

      lead.orders.forEach(order => {
        if (order.productType && order.productType !== 'Patches' && order.productType !== 'Client Owned') {
          allProductTypes.add(order.productType);
          if (!dateMap[dateStr][order.productType]) {
            dateMap[dateStr][order.productType] = 0;
          }
          dateMap[dateStr][order.productType] += order.quantity;
        }
      });
    });
    
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    const finalChartData = allDays.map(day => {
        const dateStr = format(day, 'MMM dd');
        const dayData = { date: dateStr };
        allProductTypes.forEach(pt => {
            (dayData as any)[pt] = dateMap[dateStr]?.[pt] || 0;
        })
        return dayData;
    });

    return { chartData: finalChartData, productTypes: Array.from(allProductTypes).sort() };
  }, [leads, timeRange]);

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
            <CardTitle>Daily Sold Quantity</CardTitle>
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
        <CardDescription>Daily sold quantity for each product type.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {productTypes.map((productType, index) => (
                <Line 
                    key={productType}
                    type="monotone" 
                    dataKey={productType} 
                    stroke={COLORS[index % COLORS.length]} 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}