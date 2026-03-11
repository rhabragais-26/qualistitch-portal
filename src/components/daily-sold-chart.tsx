'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Legend, Bar } from 'recharts';
import { Skeleton } from './ui/skeleton';
import { format, startOfWeek, eachDayOfInterval, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChartContainer } from '@/components/ui/chart';


type Order = {
  productType: string;
  quantity: number;
  color: string;
  size: string;
};

type Lead = {
  submissionDateTime: string;
  isSentToProduction?: boolean;
  sentToProductionTimestamp?: string;
  isEndorsedToLogistics?: boolean;
  endorsedToLogisticsTimestamp?: string;
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  shippedTimestamp?: string;
  deliveredTimestamp?: string;
  orders: Order[];
};

type InventoryReplenishment = {
  id: string;
  date: string;
  productType: string;
  color: string;
  size: string;
  quantity: number;
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
  sizeFilter: string;
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


export function DailySoldQuantityChart({ productTypeFilter, colorFilter, sizeFilter, timeRange }: DailySoldQuantityChartProps) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const leadsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'leads')) : null), [firestore]);
  const { data: leads, isLoading: areLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery, undefined, { listen: false });
  
  const replenishmentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'inventory_replenishments')) : null), [firestore]);
  const { data: replenishments, isLoading: areReplenishmentsLoading, error: replenishmentsError } = useCollection<InventoryReplenishment>(replenishmentsQuery, undefined, { listen: false });
  
  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return query(collection(firestore, 'inventory'));
  }, [firestore, user, isUserLoading]);
  
  const { data: inventoryItems, isLoading: isInventoryLoading, error: inventoryError } = useCollection<InventoryItem>(inventoryQuery, undefined, { listen: false });
  
  const chartData = useMemo(() => {
    if (!leads || !inventoryItems || !productTypeFilter || !replenishments) return [];

    // 1. Define date range
    const endDate = endOfDay(new Date());
    let startDate: Date;

    if (timeRange === '7d') {
      startDate = startOfDay(subDays(endDate, 6));
    } else if (timeRange === '14d') {
      startDate = startOfDay(subDays(endDate, 13));
    } else if (timeRange === '30d') {
      startDate = startOfDay(subDays(endDate, 29));
    } else { // 'this_week'
      startDate = startOfDay(startOfWeek(endDate, { weekStartsOn: 1 }));
    }

    // 2. Filter relevant data once
    const relevantItems = inventoryItems.filter(item => 
      item.productType === productTypeFilter &&
      (colorFilter === 'All Colors' || item.color === colorFilter) &&
      (sizeFilter === 'All Sizes' || item.size === sizeFilter)
    );
    const relevantLeads = leads.filter(lead => 
        lead.orders.some(order => 
            order.productType === productTypeFilter && 
            (colorFilter === 'All Colors' || order.color === colorFilter) &&
            (sizeFilter === 'All Sizes' || order.size === sizeFilter)
        )
    );
    const relevantReplenishments = (replenishments || []).filter(repl => 
        repl.productType === productTypeFilter && 
        (colorFilter === 'All Colors' || repl.color === colorFilter) &&
        (sizeFilter === 'All Sizes' || repl.size === sizeFilter)
    );

    // 3. Create daily maps for sales and replenishments
    const dailySales: Record<string, number> = {};
    relevantLeads.forEach(lead => {
        lead.orders.forEach(order => {
            if (order.productType === productTypeFilter && (colorFilter === 'All Colors' || order.color === colorFilter) && (sizeFilter === 'All Sizes' || order.size === sizeFilter)) {
                try {
                    const submissionDateStr = format(new Date(lead.submissionDateTime), 'yyyy-MM-dd');
                    dailySales[submissionDateStr] = (dailySales[submissionDateStr] || 0) + order.quantity;
                } catch (e) {}
            }
        });
    });

    const dailyReplenishments: Record<string, number> = {};
    relevantReplenishments.forEach(repl => {
      try {
        const dateStr = format(new Date(repl.date), 'yyyy-MM-dd');
        dailyReplenishments[dateStr] = (dailyReplenishments[dateStr] || 0) + repl.quantity;
      } catch(e) {}
    });

    // 4. Calculate today's "Remaining Stock" to use as an anchor
    const onHandToday = relevantItems.reduce((sum, item) => sum + item.stock, 0);
    const soldEver = relevantLeads.reduce((sum, lead) => sum + lead.orders.filter(o => o.productType === productTypeFilter && (colorFilter === 'All Colors' || o.color === colorFilter) && (sizeFilter === 'All Sizes' || o.size === sizeFilter)).reduce((orderSum, order) => orderSum + order.quantity, 0), 0);
    const onProcessToday = relevantLeads.filter(l => (l.isSentToProduction || l.isEndorsedToLogistics) && l.shipmentStatus !== 'Shipped' && l.shipmentStatus !== 'Delivered').reduce((sum, lead) => sum + lead.orders.filter(o => o.productType === productTypeFilter && (colorFilter === 'All Colors' || o.color === colorFilter) && (sizeFilter === 'All Sizes' || o.size === sizeFilter)).reduce((orderSum, order) => orderSum + order.quantity, 0), 0);
    const dispatchedToday = relevantLeads.filter(l => l.shipmentStatus === 'Shipped' || l.shipmentStatus === 'Delivered').reduce((sum, lead) => sum + lead.orders.filter(o => o.productType === productTypeFilter && (colorFilter === 'All Colors' || o.color === colorFilter) && (sizeFilter === 'All Sizes' || o.size === sizeFilter)).reduce((orderSum, order) => orderSum + order.quantity, 0), 0);
    const remainingToday = (onHandToday + onProcessToday + dispatchedToday) - soldEver;

    // 5. Work backwards to calculate historical remaining stock
    const historicalRemaining: Record<string, number> = {};
    let runningRemaining = remainingToday;
    const todayStr = format(endDate, 'yyyy-MM-dd');
    historicalRemaining[todayStr] = runningRemaining;

    const allDaysInRange = eachDayOfInterval({ start: startDate, end: endDate });

    for (let i = allDaysInRange.length - 2; i >= 0; i--) {
      const currentDay = allDaysInRange[i+1];
      const currentDayStr = format(currentDay, 'yyyy-MM-dd');
      
      const soldOnCurrentDay = dailySales[currentDayStr] || 0;
      const replenishedOnCurrentDay = dailyReplenishments[currentDayStr] || 0;
      
      runningRemaining = runningRemaining + soldOnCurrentDay - replenishedOnCurrentDay;
      
      const previousDayStr = format(allDaysInRange[i], 'yyyy-MM-dd');
      historicalRemaining[previousDayStr] = runningRemaining;
    }

    // 6. Generate final chart data
    const dataForChart = allDaysInRange.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return {
            date: format(day, 'MMM dd'),
            sold: dailySales[dateStr] || 0,
            replenished: dailyReplenishments[dateStr] || 0,
            remaining: historicalRemaining[dateStr] ?? null,
        };
    });
    
    return dataForChart;

  }, [leads, inventoryItems, replenishments, timeRange, productTypeFilter, colorFilter, sizeFilter]);

  const yDomainRight = useMemo(() => {
    const remainingValues = chartData.map(d => d.remaining).filter(v => v !== null) as number[];
    if (remainingValues.length === 0) return [0, 100];
    const minVal = Math.min(...remainingValues);
    const maxVal = Math.max(...remainingValues);
  
    const padding = Math.max(Math.abs(maxVal - minVal) * 0.1, 50);
    const yMin = Math.floor(minVal - padding);
    const yMax = Math.ceil(maxVal + padding);
    
    return [yMin, yMax];
  }, [chartData]);
  
  const isLoading = areLeadsLoading || isInventoryLoading || areReplenishmentsLoading;
  const error = leadsError || inventoryError || replenishmentsError;

  const chartConfig = {
    sold: {
        label: "Quantity Sold",
        color: COLORS[0],
    },
    remaining: {
        label: "Remaining Stocks",
        color: COLORS[1],
    },
    replenished: {
        label: "Replenishment Count",
        color: "#22c55e",
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const replenishment = data.replenished;
        return (
            <div className="p-2.5 bg-background border rounded-md shadow-lg text-sm">
                <p className="font-bold mb-2">{label}</p>
                <div className="space-y-1">
                    {payload.map((entry: any) => {
                        if (entry.dataKey === 'replenished') return null;

                        let color;
                        if (entry.dataKey === 'sold') {
                            color = COLORS[0];
                        } else if (entry.dataKey === 'remaining') {
                            color = entry.value < 0 ? '#ef4444' : COLORS[1];
                        }

                        return (
                            <div key={`tooltip-${entry.dataKey}`} className="flex justify-between items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}/>
                                    <span>{entry.name}:</span>
                                </div>
                                <span className="font-mono font-medium" style={{ color }}>{entry.value.toLocaleString()}</span>
                            </div>
                        );
                    })}
                    {replenishment > 0 && (
                        <div key="tooltip-replenished" className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }}/>
                                <span>Replenishment Count:</span>
                            </div>
                            <span className="font-mono font-medium" style={{ color: '#22c55e' }}>{replenishment.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
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
            <YAxis yAxisId="left" stroke={COLORS[0]} allowDecimals={false} domain={[0, dataMax => Math.round(dataMax * 1.5)]} />
            <YAxis yAxisId="right" orientation="right" stroke={COLORS[1]} allowDecimals={false} domain={yDomainRight} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
            <Legend />
            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={COLORS[1]} floodOpacity="0.5" />
              </filter>
            </defs>
            <Bar yAxisId="left" dataKey="replenished" name="Replenishment Count" barSize={20} radius={[4, 4, 0, 0]} fill="#22c55e" fillOpacity={0.6}>
              <LabelList dataKey="replenished" position="top" formatter={(value: number) => value > 0 ? value.toLocaleString() : null} fill="black" fontWeight="bold" />
            </Bar>
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
                name="Remaining Stocks"
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
