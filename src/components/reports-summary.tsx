'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Skeleton } from './ui/skeleton';
import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';


type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
}

type Lead = {
  id: string;
  orders: Order[];
}

type SummaryData = {
  name: string;
  quantity: number;
}

const chartConfig = {
  quantity: {
    label: "Quantity",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function ReportsSummary() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'));
  }, [firestore, user]);

  const { data: leads, isLoading: isLeadsLoading, error } = useCollection<Lead>(leadsQuery);

  const isLoading = isAuthLoading || isLeadsLoading;

  const { productTypeSummary, colorSummary, sizeSummary } = useMemo(() => {
    if (!leads) {
      return { productTypeSummary: [], colorSummary: [], sizeSummary: [] };
    }

    const productTypeMap = new Map<string, number>();
    const colorMap = new Map<string, number>();
    const sizeMap = new Map<string, number>();

    leads.forEach(lead => {
      lead.orders.forEach(order => {
        // Product Type Summary
        productTypeMap.set(order.productType, (productTypeMap.get(order.productType) || 0) + order.quantity);

        // Color Summary
        colorMap.set(order.color, (colorMap.get(order.color) || 0) + order.quantity);
        
        // Size Summary
        sizeMap.set(order.size, (sizeMap.get(order.size) || 0) + order.quantity);
      });
    });

    const productTypeSummary: SummaryData[] = Array.from(productTypeMap.entries()).map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity);
    const colorSummary: SummaryData[] = Array.from(colorMap.entries()).map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity);
    const sizeSummary: SummaryData[] = Array.from(sizeMap.entries()).map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity);

    return { productTypeSummary, colorSummary, sizeSummary };
  }, [leads]);

  const renderSummaryChart = (title: string, data: SummaryData[]) => (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-card-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => ( <Skeleton key={i} className="h-24 w-full" /> ))}
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <ResponsiveContainer width="100%" height={Math.max(300, data.length * 40)}>
                 <BarChart data={data} layout="vertical" margin={{ left: 30, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} interval={0} />
                  <Tooltip cursor={{fill: 'hsl(var(--muted))'}} content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )
        }
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {renderSummaryChart('Quantity by Product Type', productTypeSummary)}
      {renderSummaryChart('Quantity by Color', colorSummary)}
      {renderSummaryChart('Quantity by Size', sizeSummary)}
    </div>
  );
}
