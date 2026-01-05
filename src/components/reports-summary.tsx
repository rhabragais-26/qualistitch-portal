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
import { Skeleton } from './ui/skeleton';
import React, { useMemo } from 'react';
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from 'recharts';
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
  value: number;
  fill: string;
}

const chartConfig = {
  quantity: {
    label: "Quantity",
  },
} satisfies ChartConfig

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

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
        productTypeMap.set(order.productType, (productTypeMap.get(order.productType) || 0) + order.quantity);
        colorMap.set(order.color, (colorMap.get(order.color) || 0) + order.quantity);
        sizeMap.set(order.size, (sizeMap.get(order.size) || 0) + order.quantity);
      });
    });

    const productTypeSummary: SummaryData[] = Array.from(productTypeMap.entries()).map(([name, value], index) => ({ name, value, fill: COLORS[index % COLORS.length] })).sort((a, b) => b.value - a.value);
    const colorSummary: SummaryData[] = Array.from(colorMap.entries()).map(([name, value], index) => ({ name, value, fill: COLORS[index % COLORS.length] })).sort((a, b) => b.value - a.value);
    const sizeSummary: SummaryData[] = Array.from(sizeMap.entries()).map(([name, value], index) => ({ name, value, fill: COLORS[index % COLORS.length] })).sort((a, b) => b.value - a.value);
    
    // Add quantity to chartConfig dynamically
    productTypeSummary.forEach(item => { (chartConfig as any)[item.name] = { label: item.name, color: item.fill } });
    colorSummary.forEach(item => { (chartConfig as any)[item.name] = { label: item.name, color: item.fill } });
    sizeSummary.forEach(item => { (chartConfig as any)[item.name] = { label: item.name, color: item.fill } });


    return { productTypeSummary, colorSummary, sizeSummary };
  }, [leads]);

  const renderSummaryChart = (title: string, data: SummaryData[]) => (
    <Card className="flex-1 shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-card-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Tooltip cursor={{fill: 'hsl(var(--muted))'}} content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
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
                      const RADIAN = Math.PI / 180
                      const radius = 25 + innerRadius + (outerRadius - innerRadius)
                      const x = cx + radius * Math.cos(-midAngle * RADIAN)
                      const y = cy + radius * Math.sin(-midAngle * RADIAN)

                      return (
                        <text
                          x={x}
                          y={y}
                          className="fill-muted-foreground text-xs"
                          textAnchor={x > cx ? "start" : "end"}
                          dominantBaseline="central"
                        >
                          {data[index].name} ({value})
                        </text>
                      )
                    }}
                  >
                     {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          )
        }
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {renderSummaryChart('Quantity by Product Type', productTypeSummary)}
      {renderSummaryChart('Quantity by Color', colorSummary)}
      {renderSummaryChart('Quantity by Size', sizeSummary)}
    </div>
  );
}
