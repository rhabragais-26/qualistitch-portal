'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import React, { useMemo, useState } from 'react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from './ui/button';

type Order = {
  quantity: number;
};

type Lead = {
  id: string;
  salesRepresentative: string;
  submissionDateTime: string;
  grandTotal?: number;
  orders: Order[];
};

const chartConfig = {
  amount: {
    label: "Sales Amount",
  },
  quantity: {
    label: "Items Sold",
  },
};

const renderAmountLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    const color = index % 2 === 0 ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-2))';
    
    if (value === 0) return null;
  
    return (
      <text x={x + width / 2} y={y} dy={-4} fill="black" fontSize={12} textAnchor="middle" fontWeight="bold">
        {formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </text>
    );
};
  
const renderQuantityLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    const color = index % 2 === 0 ? 'hsl(var(--chart-4))' : 'hsl(var(--chart-5))';
    
    if (value === 0) return null;
  
    return (
      <text x={x + width / 2} y={y} dy={-4} fill={color} fontSize={12} textAnchor="middle" fontWeight="bold">
        {value}
      </text>
    );
};

export function TodaysPerformanceCard() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

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
        acc[rep] = { amount: 0, quantity: 0 };
      }
      acc[rep].amount += lead.grandTotal || 0;
      const orderQuantity = lead.orders?.reduce((sum, order) => sum + (order.quantity || 0), 0) || 0;
      acc[rep].quantity += orderQuantity;
      return acc;
    }, {} as { [key: string]: { amount: number; quantity: number } });

    return Object.entries(salesByRep)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [leads, timeRange]);
  
  if (isLoading) {
      return (
           <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
      )
  }

  if (error) {
      return (
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
             <CardHeader>
                <CardTitle>Today's Performance</CardTitle>
                <CardDescription>Total sales amount and items sold by SCES for {format(new Date(), 'MMMM dd, yyyy')}.</CardDescription>
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
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>{timeRange === 'today' ? "Today's" : "Yesterday's"} Performance</CardTitle>
                <CardDescription>Total sales amount and items sold by SCES for {format(timeRange === 'today' ? new Date() : subDays(new Date(), 1), 'MMMM dd, yyyy')}.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Button variant={timeRange === 'yesterday' ? 'default' : 'outline'} onClick={() => setTimeRange('yesterday')}>Yesterday</Button>
                <Button variant={timeRange === 'today' ? 'default' : 'outline'} onClick={() => setTimeRange('today')}>Today</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {salesData.length > 0 ? (
            <div style={{ height: '300px' }}>
             <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData} margin={{ top: 30 }}>
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
                        <Bar yAxisId="right" dataKey="quantity" name="Items Sold" radius={[4, 4, 0, 0]}>
                            {salesData.map((entry, index) => (
                                <Cell key={`cell-quantity-${index}`} fill={index % 2 === 0 ? 'hsl(var(--chart-4))' : 'hsl(var(--chart-5))'} />
                            ))}
                            <LabelList dataKey="quantity" content={renderQuantityLabel} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
             </ChartContainer>
            </div>
        ) : (
            <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">No sales recorded for {timeRange === 'today' ? 'today' : 'yesterday'}.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
