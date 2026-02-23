'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { PieChart, Pie, Cell } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { getMonth, getYear, isSameMonth } from 'date-fns';

type Lead = {
  grandTotal?: number;
  paidAmount?: number;
  balance?: number;
  submissionDateTime: string;
};

const DoughnutChartCard = ({ title, amount, percentage, color }: { title: string; amount: number; percentage: number; color: string }) => {
    const data = [
        { name: 'value', value: percentage },
        { name: 'remaining', value: 100 - percentage },
    ];
    
    const COLORS = [color, '#e5e7eb']; // Main color and a light gray for the rest

    return (
        <Card className="flex flex-col items-center justify-center p-4">
            <CardHeader className="p-0 mb-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 relative w-32 h-32">
                <ChartContainer config={{}} className="w-full h-full">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius="60%"
                            outerRadius="80%"
                            startAngle={90}
                            endAngle={450}
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                </ChartContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">{formatCurrency(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    <span className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</span>
                </div>
            </CardContent>
        </Card>
    )
}

export function SalesSummaryCards() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery, undefined, { listen: false });

  const summaryData = useMemo(() => {
    if (!leads) return { totalSales: 0, totalPaid: 0, totalBalance: 0, currentMonthSales: 0 };

    const today = new Date();

    let totalSales = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let currentMonthSales = 0;

    leads.forEach(lead => {
        const leadSales = lead.grandTotal || 0;
        const leadPaid = lead.paidAmount || 0;
        const leadBalance = lead.balance || 0;

        totalSales += leadSales;
        totalPaid += leadPaid;
        totalBalance += leadBalance;

        const submissionDate = new Date(lead.submissionDateTime);
        if (isSameMonth(submissionDate, today)) {
            currentMonthSales += leadSales;
        }
    });

    return { totalSales, totalPaid, totalBalance, currentMonthSales };
  }, [leads]);

  if (isLoading) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading summary data: {error.message}</p>;
  }

  const { totalSales, totalPaid, totalBalance, currentMonthSales } = summaryData;
  const monthlyTarget = 12000000;

  const totalPaidPercentage = totalSales > 0 ? (totalPaid / totalSales) * 100 : 0;
  const totalBalancePercentage = totalSales > 0 ? (totalBalance / totalSales) * 100 : 0;
  const monthlyTargetPercentage = monthlyTarget > 0 ? (currentMonthSales / monthlyTarget) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DoughnutChartCard title="Total Sales" amount={totalSales} percentage={100} color="hsl(var(--chart-1))" />
        <DoughnutChartCard title="Total Paid" amount={totalPaid} percentage={totalPaidPercentage} color="hsl(var(--chart-2))" />
        <DoughnutChartCard title="Total Balance" amount={totalBalance} percentage={totalBalancePercentage} color="hsl(var(--chart-3))" />
        <DoughnutChartCard title="Monthly Sales Target" amount={currentMonthSales} percentage={monthlyTargetPercentage} color="hsl(var(--chart-4))" />
    </div>
  );
}
