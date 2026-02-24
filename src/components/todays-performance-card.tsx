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
import { Separator } from './ui/separator';

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
    const { x, y, width, value, stroke } = props;
    if (value === 0 || typeof x !== 'number' || typeof y !== 'number') return null;
  
    const rectWidth = 80;
    const rectHeight = 18;
    const xPos = width ? x + width / 2 : x;
    
    // Convert hsl(a, b, c) to hsla(a, b, c, 0.4)
    const rectFill = stroke ? stroke.replace('hsl(', 'hsla(').replace(')', ', 0.4)') : 'rgba(255, 255, 255, 0.4)';

    return (
      <g>
        <rect x={xPos - rectWidth / 2} y={y - rectHeight - 5} width={rectWidth} height={rectHeight} fill={rectFill} rx={4} ry={4} />
        <text 
          x={xPos} 
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
            console.warn(`Invalid date format for lead ${'\'\'\''}${lead.id}: ${'\'\'\''}${lead.submissionDateTime}`);
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
      .filter(rep => rep.amount > 0 || rep.quantity > 0)
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
            <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start h-[400px]">
                <Skeleton className="lg:col-span-2 h-full w-full" />
                <Skeleton className="h-full w-full" />
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
  
  const layoutChartData = salesData.filter(d => d.layoutCount > 0);


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
                <p className="text-3xl font-bold">{formatCurrency(totalSales)}</p>
            </div>
            <div className="flex-1 flex justify-end items-center gap-4">
                <Button variant={timeRange === 'yesterday' ? 'default' : 'outline'} onClick={() => setTimeRange('yesterday')}>Yesterday</Button>
                <Button variant={timeRange === 'today' ? 'default' : 'outline'} onClick={() => setTimeRange('today')}>Today</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start h-[400px]">
        {salesData.length > 0 ? (
            <>
                <div className="lg:col-span-2 h-full">
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
                                        stroke="hsl(var(--chart-2))"
                                        tickFormatter={(value) => `₱${Number(value) / 1000}k`}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        stroke="hsl(var(--chart-1))"
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
                                    <Bar yAxisId="right" dataKey="quantity" name="Items Sold" radius={[4, 4, 0, 0]}>
                                        {salesData.map((entry, index) => (
                                            <Cell key={`cell-amount-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                        <LabelList dataKey="quantity" content={renderQuantityLabel} />
                                    </Bar>
                                    <Line yAxisId="left" type="monotone" dataKey="amount" name="Sales Amount" stroke="hsl(var(--chart-2))" strokeWidth={2}>
                                        <LabelList content={renderAmountLabel} dataKey="amount" />
                                    </Line>
                                </ComposedChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                </div>
                <div className="w-full lg:col-span-1 h-full">
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
                                        data={layoutChartData}
                                        dataKey="layoutCount"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={90}
                                        labelLine={true}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {layoutChartData.map((entry, index) => (
                                            <Cell key={`cell-layout-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                        <LabelList dataKey="layoutCount" position="inside" fill="white" fontSize={12} fontWeight="bold" />
                                    </Pie>
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                </div>
            </>
        ) : (
            <div className="lg:col-span-3 flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">No sales recorded for {timeRange === 'today' ? 'today' : 'yesterday'}.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
