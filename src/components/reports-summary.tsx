"use client";

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell, PieChart, Pie, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from './ui/skeleton';

type Order = {
  quantity: number;
  [key: string]: any;
};

type Lead = {
  id: string;
  salesRepresentative: string;
  priorityType: string;
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

  const salesRepData = useMemo(() => {
    if (!leads) {
      return [];
    }

    const quantityBySalesRep = leads.reduce((acc, lead) => {
      const leadQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
      if (acc[lead.salesRepresentative]) {
        acc[lead.salesRepresentative] += leadQuantity;
      } else {
        acc[lead.salesRepresentative] = leadQuantity;
      }
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(quantityBySalesRep)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [leads]);
  
  const priorityData = useMemo(() => {
    if (!leads) {
      return [];
    }

    const quantityByPriority = leads.reduce((acc, lead) => {
      const leadQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
      const priority = lead.priorityType || 'Regular';
      if (acc[priority]) {
        acc[priority] += leadQuantity;
      } else {
        acc[priority] = leadQuantity;
      }
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(quantityByPriority)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);


  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading data: {error.message}</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>CSR Performance</CardTitle>
          <CardDescription>Total quantity of orders processed by each CSR.</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: '300px' }}>
            <ChartContainer config={chartConfig} className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesRepData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--foreground))' }} />
                  <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={<ChartTooltipContent />}
                  />
                  <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="quantity" position="top" style={{ fill: 'hsl(var(--foreground))' }} />
                    {salesRepData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
      <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Quantities by Priority</CardTitle>
          <CardDescription>Total quantity of orders for each priority type.</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: '300px' }}>
            <ChartContainer config={chartConfig} className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent nameKey="value" />} />
                  <Pie
                    data={priorityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    labelLine={false}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      value,
                      index,
                    }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = 25 + innerRadius + (outerRadius - innerRadius);
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);

                      return (
                        <text
                          x={x}
                          y={y}
                          fill="hsl(var(--foreground))"
                          textAnchor={x > cx ? "start" : "end"}
                          dominantBaseline="central"
                        >
                          {priorityData[index].name} ({value})
                        </text>
                      );
                    }}
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                   <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
