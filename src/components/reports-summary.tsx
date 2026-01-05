"use client";

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from './ui/skeleton';

type Order = {
  quantity: number;
  [key: string]: any;
};

type Lead = {
  id: string;
  csr: string;
  orders: Order[];
  [key: string]: any;
};

const chartConfig = {
  quantity: {
    label: 'Quantity',
  },
};

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(220, 70%, 60%)',
  'hsl(340, 70%, 60%)',
  'hsl(100, 70%, 60%)',
  'hsl(20, 70%, 60%)',
];

export function ReportsSummary() {
  const firestore = useFirestore();
  const { user } = useUser();

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'));
  }, [firestore, user]);

  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

  const csrData = useMemo(() => {
    if (!leads) {
      return [];
    }

    const quantityByCsr = leads.reduce((acc, lead) => {
      const leadQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
      if (acc[lead.csr]) {
        acc[lead.csr] += leadQuantity;
      } else {
        acc[lead.csr] = leadQuantity;
      }
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(quantityByCsr)
      .map(([csr, quantity]) => ({ csr, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [leads]);

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading data: {error.message}</p>;
  }

  return (
    <Card className="w-full max-w-4xl shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>CSR Performance</CardTitle>
        <CardDescription>Total quantity of orders processed by each CSR.</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height: '400px' }}>
          <ChartContainer config={chartConfig} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={csrData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="csr" tick={{ fill: 'hsl(var(--foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
                   <LabelList dataKey="quantity" position="top" style={{ fill: 'hsl(var(--foreground))' }} />
                   {csrData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
