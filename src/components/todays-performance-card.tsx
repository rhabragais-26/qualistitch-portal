
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

type Lead = {
  id: string;
  salesRepresentative: string;
  submissionDateTime: string;
  grandTotal?: number;
};

const chartConfig = {
  amount: {
    label: 'Amount',
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
        acc[rep] = 0;
      }
      acc[rep] += lead.grandTotal || 0;
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(salesByRep)
      .map(([name, amount]) => ({ name, amount }))
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
        <CardDescription>Total sales amount by SCES for {format(new Date(), 'MMMM dd, yyyy')}.</CardDescription>
      </CardHeader>
      <CardContent>
        {todaysSalesData.length > 0 ? (
            <div style={{ height: '300px' }}>
             <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={todaysSalesData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid horizontal={false} />
                        <XAxis type="number" tickFormatter={(value) => `₱${(value as number).toLocaleString()}`} />
                        <YAxis dataKey="name" type="category" width={80} />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))' }}
                            content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                        />
                        <Bar dataKey="amount" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]}>
                            <LabelList dataKey="amount" position="right" formatter={(value: number) => formatCurrency(value)} />
                        </Bar>
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
