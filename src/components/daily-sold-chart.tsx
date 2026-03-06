
'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Legend, Bar } from 'recharts';
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
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  shippedTimestamp?: string;
  deliveredTimestamp?: string;
  orders: Order[];
};

type CostOfGoods = {
    id: string;
    date: string;
    itemDescription: string;
    supplier: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    submittedBy: string;
    timestamp: string;
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
  
  const cogsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'cost_of_goods')) : null), [firestore]);
  const { data: cogs, isLoading: areCogsLoading, error: cogsError } = useCollection<CostOfGoods>(cogsQuery, undefined, { listen: false });
  
  const inventoryQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'inventory')) : null), [firestore]);
  const { data: inventoryItems, isLoading: isInventoryLoading, error: inventoryError } = useCollection<InventoryItem>(inventoryQuery, undefined, { listen: false });
  
  const chartData = useMemo(() => {
    if (!leads || !inventoryItems || !cogs || !productTypeFilter) return [];

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

    // 2. Filter relevant data once
    const relevantItems = inventoryItems.filter(item => 
      item.productType === productTypeFilter &&
      (colorFilter === 'All Colors' || item.color === colorFilter)
    );
    const relevantLeads = leads.filter(lead => 
        lead.orders.some(order => 
            order.productType === productTypeFilter && 
            (colorFilter === 'All Colors' || order.color === colorFilter)
        )
    );
    const relevantCogs = cogs.filter(cog => cog.itemDescription === productTypeFilter);

    // 3. Create daily maps for events
    const dailySales: Record<string, number> = {};
    relevantLeads.forEach(lead => {
        lead.orders.forEach(order => {
            if (order.productType === productTypeFilter && (colorFilter === 'All Colors' || order.color === colorFilter)) {
                try {
                    const submissionDateStr = format(new Date(lead.submissionDateTime), 'yyyy-MM-dd');
                    dailySales[submissionDateStr] = (dailySales[submissionDateStr] || 0) + order.quantity;
                } catch (e) {}
            }
        });
    });
    
    const dailyReplenishments: Record<string, number> = {};
    relevantCogs.forEach(cog => {
      try {
        const dateStr = format(new Date(cog.date), 'yyyy-MM-dd');
        dailyReplenishments[dateStr] = (dailyReplenishments[dateStr] || 0) + cog.quantity;
      } catch(e) {}
    });

    // 4. Calculate total historical values to find the starting stock
    const currentOnHand = relevantItems.reduce((sum, item) => sum + item.stock, 0);
    const totalSoldEver = Object.values(dailySales).reduce((sum, qty) => sum + qty, 0);
    const totalReplenishmentsEver = Object.values(dailyReplenishments).reduce((sum, qty) => sum + qty, 0);
    const initialStockEver = currentOnHand + totalSoldEver - totalReplenishmentsEver;

    // 5. Calculate cumulative values up to the day before the chart starts
    let cumulativeSoldBeforeStart = 0;
    let cumulativeReplenishmentsBeforeStart = 0;

    const allEventDates = new Set([...Object.keys(dailySales), ...Object.keys(dailyReplenishments)]);
    
    Array.from(allEventDates).sort().forEach(dateStr => {
        if (new Date(dateStr) < startDate) {
            cumulativeSoldBeforeStart += dailySales[dateStr] || 0;
            cumulativeReplenishmentsBeforeStart += dailyReplenishments[dateStr] || 0;
        }
    });
    
    let runningStock = initialStockEver + cumulativeReplenishmentsBeforeStart - cumulativeSoldBeforeStart;

    // 6. Generate chart data for the selected range.
    const allDaysInRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    const dataForChart = [];

    for (const day of allDaysInRange) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const soldToday = dailySales[dateStr] || 0;
        const replenishedToday = dailyReplenishments[dateStr] || 0;
        
        // This is a simplified calculation of physical on-hand stock
        runningStock = runningStock + replenishedToday - soldToday;
        
        dataForChart.push({
            date: format(day, 'MMM dd'),
            sold: soldToday,
            replenished: replenishedToday,
            remaining: runningStock,
        });
    }

    return dataForChart;

  }, [leads, inventoryItems, cogs, timeRange, productTypeFilter, colorFilter]);

  const yDomainRight = useMemo(() => {
    if (!chartData || chartData.length === 0) return [0, 100];
    const remainingValues = chartData.map(d => d.remaining);
    const minVal = Math.min(...remainingValues);
    const maxVal = Math.max(...remainingValues);
  
    const padding = Math.max(Math.abs(maxVal - minVal) * 0.1, 50);
    const yMin = Math.floor(minVal - padding);
    const yMax = Math.ceil(maxVal + padding);
    
    return [yMin, yMax];
  }, [chartData]);
  
  const isLoading = areLeadsLoading || isInventoryLoading || areCogsLoading;
  const error = leadsError || inventoryError || cogsError;

  const chartConfig = {
    sold: {
        label: "Quantity Sold",
        color: COLORS[0],
    },
    remaining: {
        label: "Remaining Stocks",
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
            <YAxis yAxisId="left" stroke={COLORS[0]} allowDecimals={false} domain={[0, dataMax => Math.round(dataMax * 1.5)]} />
            <YAxis yAxisId="right" orientation="right" stroke={COLORS[1]} allowDecimals={false} domain={yDomainRight} />
            <Tooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                      if (typeof value !== 'number') return value;
                      const isRemaining = name === 'Remaining Stocks';
                      const color = name === 'Quantity Sold' ? 'hsl(var(--chart-1))' : (value < 0 ? '#ef4444' : 'hsl(var(--chart-2))');
                      const replenishment = item.payload.replenished;
                      
                      return (
                          <div className="flex flex-col gap-1">
                              <div className="flex w-full items-center justify-between gap-4 text-base">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: name === 'Quantity Sold' ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))' }} />
                                    <span>{name}</span>
                                </div>
                                <span className={cn("font-mono font-medium", isRemaining && value < 0 && "text-destructive")} style={{ color: color }}>
                                    {value.toLocaleString()}
                                </span>
                              </div>
                              {replenishment > 0 && (
                                <div className="flex w-full items-center justify-between gap-4 text-base">
                                  <div className="flex items-center gap-1.5">
                                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                      <span>Replenishment Count</span>
                                  </div>
                                  <span className="font-mono font-medium text-green-600">
                                      {replenishment.toLocaleString()}
                                  </span>
                                </div>
                              )}
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
            <Bar yAxisId="left" dataKey="replenished" name="Replenishment Count" barSize={1} fill="transparent" hide={true} />
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
