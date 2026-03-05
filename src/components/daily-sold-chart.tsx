'use client';

import React, { useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Legend } from 'recharts';
import { Skeleton } from './ui/skeleton';
import { format, startOfWeek, eachDayOfInterval, subDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';


type Order = {
  productType: string;
  quantity: number;
  color: string;
};

type Lead = {
  submissionDateTime: string;
  isSentToProduction?: boolean;
  sentToProductionTimestamp?: string;
  isEndorsedToLogistics?: boolean;
  endorsedToLogisticsTimestamp?: string;
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
  colorFilter: string;
  timeRange: string;
};

const renderRemainingStockLabel = (props: any) => {
    const { x, y, value } = props;
    if (value === null || typeof x !== 'number' || typeof y !== 'number') {
        return null;
    }

    const color = value < 0 ? '#ef4444' : COLORS[1];

    return (
        <text x={x} y={y} dy={-4} fill={color} fontSize={12} textAnchor="middle">
            {value}
        </text>
    );
};


export function DailySoldQuantityChart({ productTypeFilter, colorFilter, timeRange }: DailySoldQuantityChartProps) {
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

    // 2. Calculate total initial stock
    const totalStockAdded = inventoryItems
      .filter(item => 
        item.productType === productTypeFilter &&
        (colorFilter === 'All Colors' || item.color === colorFilter)
      )
      .reduce((sum, item) => sum + item.stock, 0);

    // 3. Group all sales by date based on submission date.
    const salesByDate: { [dateStr: string]: number } = {};
    leads.forEach(lead => {
        try {
            const submissionDate = new Date(lead.submissionDateTime);
            const dateStr = format(submissionDate, 'yyyy-MM-dd');
            lead.orders.forEach(order => {
                if (order.productType === productTypeFilter && (colorFilter === 'All Colors' || order.color === colorFilter)) {
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
  }, [leads, inventoryItems, timeRange, productTypeFilter, colorFilter]);
  
  const isLoading = areLeadsLoading || isInventoryLoading;
  const error = leadsError || inventoryError;

  const chartConfig = {
    sold: {
        label: "Quantity Sold",
        color: COLORS[0],
    },
    remaining: {
        label: "Stocks Remaining",
        color: COLORS[1],
    },
  };

  if (isLoading) {
    return <Skeleton className="h-[350px] w-full" />;
  }

  if (error) {
    return <div className="h-[350px] flex items-center justify-center"><p className="text-destructive">Error loading chart data.</p></div>;
  }

  return (
    <div className="h-[350px]">
      <ChartContainer config={chartConfig} className="w-full h-full">
        <ResponsiveContainer>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} interval={0} />
            <YAxis yAxisId="left" stroke={COLORS[0]} allowDecimals={false} domain={[0, dataMax => Math.round(dataMax * 1.2)]} />
            <YAxis yAxisId="right" orientation="right" stroke={COLORS[1]} allowDecimals={false} domain={[dataMin => Math.round(dataMin * 0.9), dataMax => Math.round(dataMax * 1.2)]} />
            <Tooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                      if (typeof value !== 'number') return value;
                      const isRemaining = name === 'Stocks Remaining';
                      const color = name === 'Quantity Sold' ? COLORS[0] : (value < 0 ? '#ef4444' : COLORS[1]);
                      return (
                          <div className="flex w-full items-center justify-between gap-4 text-base">
                          <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                              <span style={{color}}>{name}</span>
                          </div>
                          <span className={cn("font-mono font-medium", isRemaining && value < 0 && "text-destructive")}>
                              {value.toLocaleString()}
                          </span>
                          </div>
                      )
                  }}
                  cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                />
              }
            />
            <Legend />
            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={COLORS[1]} floodOpacity="0.5" />
              </filter>
            </defs>
            <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="sold" 
                name="Quantity Sold"
                stroke={COLORS[0]}
                fillOpacity={0.4}
                fill={COLORS[0]}
            >
              <LabelList dataKey="sold" position="top" fill={COLORS[0]} formatter={(value: number) => value > 0 ? value : ''} />
            </Area>
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
                style={{ filter: 'url(#shadow)' }}
                zIndex={100}
            >
               <LabelList dataKey="remaining" content={renderRemainingStockLabel} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
