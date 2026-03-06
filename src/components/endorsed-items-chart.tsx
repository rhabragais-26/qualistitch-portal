'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Skeleton } from './ui/skeleton';
import { format, startOfWeek, eachDayOfInterval, subDays, startOfDay } from 'date-fns';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

type Order = {
  productType: string;
  quantity: number;
  color: string;
  size: string;
};

type Lead = {
  isSentToProduction?: boolean;
  sentToProductionTimestamp?: string;
  isEndorsedToLogistics?: boolean;
  endorsedToLogisticsTimestamp?: string;
  orders: Order[];
};

type EndorsedItemsChartProps = {
  productTypeFilter: string;
  colorFilter: string;
  sizeFilter: string;
  timeRange: string;
};

const chartConfig = {
  endorsed: {
    label: "Items Endorsed",
    color: "#8884d8", // a purple color
  },
};

export function EndorsedItemsChart({ productTypeFilter, colorFilter, sizeFilter, timeRange }: EndorsedItemsChartProps) {
  const firestore = useFirestore();

  const leadsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'leads')) : null), [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery, undefined, { listen: false });

  const chartData = useMemo(() => {
    if (!leads || !productTypeFilter) return [];

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

    // 2. Group endorsed items by date
    const endorsedByDate: { [dateStr: string]: number } = {};
    leads.forEach(lead => {
      let endorsementTimestamp: string | undefined;
      if (lead.isSentToProduction && lead.sentToProductionTimestamp) {
        endorsementTimestamp = lead.sentToProductionTimestamp;
      } else if (lead.isEndorsedToLogistics && lead.endorsedToLogisticsTimestamp) {
        endorsementTimestamp = lead.endorsedToLogisticsTimestamp;
      }

      if (endorsementTimestamp) {
        try {
          const endorsementDate = new Date(endorsementTimestamp);
          if (endorsementDate >= startDate && endorsementDate <= endDate) {
            const dateStr = format(endorsementDate, 'yyyy-MM-dd');
            lead.orders.forEach(order => {
              if (order.productType === productTypeFilter && (colorFilter === 'All Colors' || order.color === colorFilter) && (sizeFilter === 'All Sizes' || order.size === sizeFilter)) {
                endorsedByDate[dateStr] = (endorsedByDate[dateStr] || 0) + order.quantity;
              }
            });
          }
        } catch (e) { /* ignore invalid dates */ }
      }
    });

    // 3. Generate chart data for the selected range.
    const allDaysInRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    return allDaysInRange.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const endorsedToday = endorsedByDate[dateStr] || 0;
      
      return {
        date: format(day, 'MMM dd'),
        endorsed: endorsedToday,
      };
    });
  }, [leads, timeRange, productTypeFilter, colorFilter, sizeFilter]);
  
  if (isLoading) {
    return <Skeleton className="h-[250px] w-full" />;
  }

  if (error) {
    return <div className="h-[250px] flex items-center justify-center"><p className="text-destructive">Error loading chart data.</p></div>;
  }

  return (
    <div className="h-[250px]">
      <ChartContainer config={chartConfig} className="w-full h-full">
        <ResponsiveContainer>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} interval={0} />
            <YAxis allowDecimals={false} domain={[0, dataMax => Math.round(dataMax * 1.2)]} />
            <Tooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => `${value} items`}
                  cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                />
              }
            />
            <Area 
                type="monotone" 
                dataKey="endorsed" 
                name="Items Endorsed"
                stroke={chartConfig.endorsed.color}
                fillOpacity={0.4}
                fill={chartConfig.endorsed.color}
            >
              <LabelList dataKey="endorsed" position="top" fill={chartConfig.endorsed.color} formatter={(value: number) => value > 0 ? value : ''} />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
