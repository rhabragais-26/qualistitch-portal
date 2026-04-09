'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

type Lead = {
  isEndorsedToLogistics?: boolean;
  isQualityApproved?: boolean;
  isSalesAuditRequested?: boolean;
  isSalesAuditComplete?: boolean;
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  orders: { quantity: number }[];
};

const chartConfig = {
  count: {
    label: 'Count',
  },
};

const COLORS = {
  awaitingQualityCheck: 'hsl(var(--chart-1))',
  awaitingSalesAudit: 'hsl(var(--chart-2))',
  shipped: 'hsl(var(--chart-4))',
  delivered: 'hsl(var(--chart-5))',
};

const DoughnutChart = ({ data, title, total }: { data: { name: string; value: number; fill: string }[], title: string, total: number }) => {
    const value = data.length > 0 ? data[0].value : 0;
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const chartData = [
        { name: title, value: value },
        { name: 'other', value: Math.max(0, total - value) },
    ];
    const chartColors = [data.length > 0 ? data[0].fill : '#ccc', '#e5e7eb']; // Active color and a light gray for the rest

    return (
        <div className="w-full h-[250px] flex flex-col items-center border rounded-lg p-4">
            <h3 className="text-center font-semibold text-lg mb-2">{title}</h3>
            {value > 0 ? (
                <ChartContainer config={chartConfig} className="w-full h-full max-w-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Tooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" stroke="none" startAngle={90} endAngle={450}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                ))}
                            </Pie>
                            <text
                                x="50%"
                                y="50%"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="fill-foreground text-3xl font-bold"
                            >
                                {value}
                            </text>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            ) : (
                 <div className="flex-1 flex items-center justify-center text-muted-foreground">No data</div>
            )}
            <div className="mt-2 text-center">
                 <span className="text-sm font-bold">{percentage.toFixed(1)}%</span>
                 <p className="text-xs text-muted-foreground">of {total} total</p>
            </div>
        </div>
    );
};

const LogisticsSummaryMemo = React.memo(function LogisticsSummary() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'leads')) : null), [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

  const summaryData = useMemo(() => {
    if (!leads) return { awaitingQualityCheck: 0, totalForQualityCheck: 0, awaitingSalesAudit: 0, totalForSalesAudit: 0, shippedItems: 0, deliveredItems: 0, totalShippedAndDelivered: 0 };
    
    const totalForQualityCheck = leads.filter(
        lead => lead.isEndorsedToLogistics
    ).length;

    const awaitingQualityCheck = leads.filter(
        lead => lead.isEndorsedToLogistics && !lead.isQualityApproved
    ).length;

    const totalForSalesAudit = leads.filter(
        lead => lead.isSalesAuditRequested || lead.isSalesAuditComplete
    ).length;

    const awaitingSalesAudit = leads.filter(
        lead => lead.isSalesAuditRequested && !lead.isSalesAuditComplete
    ).length;

    const calculateTotalQuantity = (filteredLeads: Lead[]): number => {
        return filteredLeads.reduce((sum, lead) => {
            const orderQuantity = lead.orders?.reduce((orderSum, order) => orderSum + order.quantity, 0) || 0;
            return sum + orderQuantity;
        }, 0);
    };

    const shippedLeads = leads.filter(lead => lead.shipmentStatus === 'Shipped');
    const deliveredLeads = leads.filter(lead => lead.shipmentStatus === 'Delivered');

    const shippedItems = calculateTotalQuantity(shippedLeads);
    const deliveredItems = calculateTotalQuantity(deliveredLeads);
    
    const totalShippedAndDelivered = shippedItems + deliveredItems;

    return { awaitingQualityCheck, totalForQualityCheck, awaitingSalesAudit, totalForSalesAudit, shippedItems, deliveredItems, totalShippedAndDelivered };
  }, [leads]);
  
  const { awaitingQualityCheck, totalForQualityCheck, awaitingSalesAudit, totalForSalesAudit, shippedItems, deliveredItems, totalShippedAndDelivered } = summaryData;
  const qualityCheckData = [{ name: 'Awaiting Quality Check', value: awaitingQualityCheck, fill: COLORS.awaitingQualityCheck }];
  const salesAuditData = [{ name: 'Awaiting Sales Audit', value: awaitingSalesAudit, fill: COLORS.awaitingSalesAudit }];
  const shippedData = [{ name: 'Shipped Items', value: shippedItems, fill: COLORS.shipped }];
  const deliveredData = [{ name: 'Delivered Items', value: deliveredItems, fill: COLORS.delivered }];


  if (isLoading) {
    return (
        <Card className="w-full shadow-xl">
            <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Skeleton className="h-[250px] w-full" />
                <Skeleton className="h-[250px] w-full" />
                <Skeleton className="h-[250px] w-full" />
                <Skeleton className="h-[250px] w-full" />
            </CardContent>
        </Card>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading summary data: {error.message}</p>;
  }

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black border-none">
      <CardHeader>
        <CardTitle className="text-black">Logistics Reports</CardTitle>
        <CardDescription className="text-gray-600">
          An overview of key metrics for the logistics department.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DoughnutChart data={qualityCheckData} title="Awaiting Quality Check" total={totalForQualityCheck} />
        <DoughnutChart data={salesAuditData} title="Awaiting Sales Audit" total={totalForSalesAudit} />
        <DoughnutChart data={shippedData} title="Shipped Items" total={totalShippedAndDelivered} />
        <DoughnutChart data={deliveredData} title="Delivered Items" total={totalShippedAndDelivered} />
      </CardContent>
    </Card>
  );
});

export { LogisticsSummaryMemo as LogisticsSummary };
