'use client';

import React, { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell, PieChart, Pie, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from './ui/button';

type Order = {
  quantity: number;
};

type Layout = {
  layoutImage?: string | null;
};

type Lead = {
  id: string;
  salesRepresentative: string;
  submissionDateTime: string;
  grandTotal?: number;
  orders: Order[];
  layouts?: Layout[];
};

const chartConfig = {
  amount: {
    label: "Sales Amount",
  },
  quantity: {
    label: "Items Sold",
  },
  layoutCount: {
    label: "Layouts Created"
  }
};

const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(220, 70%, 70%)',
    'hsl(340, 70%, 70%)',
    'hsl(100, 70%, 70%)',
    'hsl(20, 70%, 70%)',
    'hsl(260, 70%, 70%)',
    'hsl(60, 70%, 70%)',
    'hsl(180, 70%, 70%)',
];

const renderAmountLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === 0 || !width || typeof x !== 'number' || typeof y !== 'number') return null;
  
    const rectWidth = 80;
    const rectHeight = 18;
  
    return (
      <g>
        <rect x={x + width / 2 - rectWidth / 2} y={y - rectHeight - 5} width={rectWidth} height={rectHeight} fill={'hsla(160, 60%, 45%, 0.4)'} rx={4} ry={4} />
        <text 
          x={x + width / 2} 
          y={y - rectHeight/2 - 5}
          textAnchor="middle" 
          dominantBaseline="middle" 
          fill="black"
          fontSize={12} 
          fontWeight="bold"
        >
          {formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </text>
      </g>
    );
};
  
const renderQuantityLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    
    if (value === 0 || !height || typeof x !== 'number' || typeof y !== 'number') return null;
  
    return (
      <text x={x + width / 2} y={y + height / 2} fill="white" fontSize={12} textAnchor="middle" dominantBaseline="middle" fontWeight="bold">
        {value}
      </text>
    );
};

export function TodaysPerformanceCard() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery, undefined, { listen: false });

  const [timeRange, setTimeRange] = useState<'today' | 'yesterday'>('today');

  const salesData = useMemo(() => {
    if (!leads) return [];

    const targetDate = timeRange === 'today' ? new Date() : subDays(new Date(), 1);
    const rangeStart = startOfDay(targetDate);
    const rangeEnd = endOfDay(targetDate);
    
    const filteredLeads = leads.filter(lead => {
        try {
            const submissionDate = new Date(lead.submissionDateTime);
            return submissionDate >= rangeStart && submissionDate <= rangeEnd;
        } catch (e) {
            console.warn(`Invalid date format for lead ${lead.id}: ${lead.submissionDateTime}`);
            return false;
        }
    });

    const salesByRep = filteredLeads.reduce((acc, lead) => {
      const rep = lead.salesRepresentative;
      if (!acc[rep]) {
        acc[rep] = { amount: 0, quantity: 0, layoutCount: 0 };
      }
      acc[rep].amount += lead.grandTotal || 0;
      const orderQuantity = lead.orders?.reduce((sum, order) => sum + (order.quantity || 0), 0) || 0;
      acc[rep].quantity += orderQuantity;
      const layoutCount = lead.layouts?.filter(l => l.layoutImage).length || 0;
      acc[rep].layoutCount += layoutCount;
      return acc;
    }, {} as { [key: string]: { amount: number; quantity: number; layoutCount: number } });

    return Object.entries(salesByRep)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [leads, timeRange]);

  const totalSales = useMemo(() => {
    if (!salesData) return 0;
    return salesData.reduce((acc, curr) => acc + curr.amount, 0);
  }, [salesData]);
  
  if (isLoading) {
      return (
           <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <Skeleton className="h-[350px] w-full" />
                <Skeleton className="h-[350px] w-full" />
            </CardContent>
          </Card>
      )
  }

  if (error) {
      return (
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
             <CardHeader>
                <CardTitle>{timeRange === 'today' ? "Today's" : "Yesterday's"} Performance</CardTitle>
                <CardDescription>Total sales amount and items sold by SCES for {format(timeRange === 'today' ? new Date() : subDays(new Date(), 1), 'MMMM dd, yyyy')}.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center h-[300px]">
                    <p className="text-destructive">Error loading performance data: {error.message}</p>
                </div>
            </CardContent>
        </Card>
      )
  }

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div className="flex-1">
                <CardTitle>{timeRange === 'today' ? "Today's" : "Yesterday's"} Performance</CardTitle>
                <CardDescription>Total sales amount and items sold by SCES for {format(timeRange === 'today' ? new Date() : subDays(new Date(), 1), 'MMMM dd, yyyy')}.</CardDescription>
            </div>
             <div className="flex-1 text-center">
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
            </div>
            <div className="flex-1 flex justify-end items-center gap-4">
                <Button variant={timeRange === 'yesterday' ? 'default' : 'outline'} onClick={() => setTimeRange('yesterday')}>Yesterday</Button>
                <Button variant={timeRange === 'today' ? 'default' : 'outline'} onClick={() => setTimeRange('today')}>Today</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {salesData.length > 0 ? (
            <>
                <div className="w-full">
                    <CardHeader className="p-0 mb-4 text-center">
                        <CardTitle>Sales &amp; Items Sold</CardTitle>
                    </CardHeader>
                    <div style={{ height: '350px' }}>
                        <ChartContainer config={chartConfig} className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={salesData} margin={{ top: 30 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} tick={{ fill: 'black', fontWeight: 'bold', fontSize: 12, opacity: 1 }} />
                                    <YAxis
                                        yAxisId="left"
                                        orientation="left"
                                        stroke="hsl(var(--chart-1))"
                                        tickFormatter={(value) => `₱${Number(value) / 1000}k`}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        stroke="hsl(var(--chart-2))"
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted))' }}
                                        content={<ChartTooltipContent
                                            formatter={(value, name) => {
                                                if (name === 'amount') return formatCurrency(value as number);
                                                return value.toLocaleString();
                                            }}
                                        />}
                                    />
                                    <Bar yAxisId="left" dataKey="amount" name="Sales Amount" radius={[4, 4, 0, 0]}>
                                        {salesData.map((entry, index) => (
                                            <Cell key={`cell-amount-${index}`} fill={index % 2 === 0 ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-2))'} />
                                        ))}
                                        <LabelList dataKey="amount" content={renderAmountLabel} />
                                    </Bar>
                                    <Line yAxisId="right" type="monotone" dataKey="quantity" name="Items Sold" stroke="hsl(var(--chart-5))" strokeWidth={2}>
                                        <LabelList dataKey="quantity" content={renderQuantityLabel} />
                                    </Line>
                                </ComposedChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                </div>
                <div className="w-full">
                     <CardHeader className="p-0 mb-4 text-center">
                        <CardTitle>Layouts Created</CardTitle>
                    </CardHeader>
                    <div style={{ height: '350px' }}>
                       <ChartContainer config={{ layoutCount: { label: 'Layouts' } }} className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted))' }}
                                        content={<ChartTooltipContent nameKey="layoutCount" />}
                                    />
                                    <Pie
                                        data={salesData.filter(d => d.layoutCount > 0)}
                                        dataKey="layoutCount"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={110}
                                        labelLine={false}
                                        label={({ name, layoutCount, percent }) => `${name}: ${(percent * 100).toFixed(0)}% (${layoutCount})`}
                                    >
                                        {salesData.filter(d => d.layoutCount > 0).map((entry, index) => (
                                            <Cell key={`cell-layout-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                </div>
            </>
        ) : (
            <div className="lg:col-span-2 flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">No sales recorded for {timeRange === 'today' ? 'today' : 'yesterday'}.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
