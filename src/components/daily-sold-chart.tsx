'use client';

import React, { useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Skeleton } from './ui/skeleton';
import { format, startOfWeek, eachDayOfInterval, subDays, startOfDay } from 'date-fns';

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

    // 2. Assume `inventoryItems.stock` is the total quantity *ever added* for that item.
    const totalStockAdded = inventoryItems
      .filter(item => item.productType === productTypeFilter)
      .reduce((sum, item) => sum + item.stock, 0);

    // 3. Group all sales by date.
    const salesByDate: { [dateStr: string]: number } = {};
    leads.forEach(lead => {
      try {
        const submissionDate = new Date(lead.submissionDateTime);
        const dateStr = format(submissionDate, 'yyyy-MM-dd');
        lead.orders.forEach(order => {
          if (order.productType === productTypeFilter) {
            salesByDate[dateStr] = (salesByDate[dateStr] || 0) + order.quantity;
          }
        });
      } catch (e) { /* ignore invalid dates */ }
    });

    // 4. Calculate cumulative sales up to the day before the start date.
    let cumulativeSales = 0;
    const sortedDates = Object.keys(salesByDate).sort();
    
    for (const dateStr of sortedDates) {
      if (new Date(dateStr) < startOfDay(startDate)) {
        cumulativeSales += salesByDate[dateStr];
      }
    }

    // 5. Generate chart data for the selected range.
    const allDaysInRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    const finalChartData = allDaysInRange.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const soldToday = salesByDate[dateStr] || 0;

      cumulativeSales += soldToday;
      
      return {
        date: format(day, 'MMM dd'),
        sold: soldToday,
        remaining: totalStockAdded - cumulativeSales,
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
