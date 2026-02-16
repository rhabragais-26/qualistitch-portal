'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

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
    color: "hsl(var(--chart-1))",
  },
  quantity: {
    label: "Items Sold",
    color: "hsl(var(--chart-2))",
  },
};

export function TodaysPerformanceCard() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery, undefined, { listen: false });

  const todaysSalesData = useMemo(() => {
    if (!leads) return [];

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    const todaysLeads = leads.filter(lead => {
        try {
            return format(new Date(lead.submissionDateTime), 'yyyy-MM-dd') === todayStr;
        } catch (e) {
            console.warn(`Invalid date format for lead ${lead.id}: ${lead.submissionDateTime}`);
            return false;
        }
    });

    const salesByRep = todaysLeads.reduce((acc, lead) => {
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
  }, [leads]);
  
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
                <CardDescription>Total sales amount by SCES for {format(new Date(), 'MMMM dd, yyyy')}.</CardDescription>
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
        <CardTitle>Today's Performance</CardTitle>
        <CardDescription>Total sales amount and items sold by SCES for {format(new Date(), 'MMMM dd, yyyy')}.</CardDescription>
      </CardHeader>
      <CardContent>
        {todaysSalesData.length > 0 ? (
            <div style={{ height: '300px' }}>
             <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={todaysSalesData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
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
                        <Legend />
                        <Bar yAxisId="left" dataKey="amount" name="Sales Amount" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="quantity" name="Items Sold" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
             </ChartContainer>
            </div>
        ) : (
            <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">No sales recorded today.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
