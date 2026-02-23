'use client';

import React, { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { PieChart, Pie, Cell } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { getMonth, getYear } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type Lead = {
  grandTotal?: number;
  paidAmount?: number;
  balance?: number;
  submissionDateTime: string;
};

const DoughnutChartCard = ({ title, amount, percentage, color }: { title: string; amount: number; percentage: number; color: string }) => {
    const data = [
        { name: 'value', value: Math.max(0, Math.min(100, percentage)) },
        { name: 'remaining', value: 100 - Math.max(0, Math.min(100, percentage)) },
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
                    </ChartContainer>
                </ChartContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold">{percentage.toFixed(0)}%</span>
                </div>
            </CardContent>
            <div className="mt-2 text-center">
                 <span className="text-lg font-bold">{formatCurrency(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
        </Card>
    )
}

export function SalesSummaryCards() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery, undefined, { listen: false });

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());

  const availableYears = useMemo(() => {
    if (!leads) return [new Date().getFullYear().toString()];
    const years = new Set(leads.map(lead => new Date(lead.submissionDateTime).getFullYear().toString()));
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [leads]);

  const months = useMemo(() => [
    { value: 'all', label: 'Year-to-Date' },
    { value: '1', label: 'January' }, { value: '2', label: 'February' },
    { value: '3', label: 'March' }, { value: '4', label: 'April' },
    { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' },
    { value: '9', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ], []);

  const summaryData = useMemo(() => {
    if (!leads) return { totalSales: 0, totalPaid: 0, totalBalance: 0 };

    const year = parseInt(selectedYear, 10);
    const month = parseInt(selectedMonth, 10);

    const filteredLeads = leads.filter(lead => {
      try {
        const submissionDate = new Date(lead.submissionDateTime);
        
        if (selectedYear !== 'all' && getYear(submissionDate) !== year) {
          return false;
        }

        if (selectedMonth !== 'all' && (getMonth(submissionDate) + 1) !== month) {
          return false;
        }
        
        return true;
      } catch (e) {
        console.warn(`Invalid date format for lead`);
        return false;
      }
    });

    let totalSales = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    filteredLeads.forEach(lead => {
        totalSales += lead.grandTotal || 0;
        totalPaid += lead.paidAmount || 0;
        totalBalance += lead.balance || 0;
    });

    return { totalSales, totalPaid, totalBalance };
  }, [leads, selectedYear, selectedMonth]);

  if (isLoading) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading summary data: {error.message}</p>;
  }

  const { totalSales, totalPaid, totalBalance } = summaryData;
  const totalPaidPercentage = totalSales > 0 ? (totalPaid / totalSales) * 100 : 0;
  const totalBalancePercentage = totalSales > 0 ? (totalBalance / totalSales) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Sales Overview</CardTitle>
                <CardDescription>A summary of sales, payments, and balances for the selected period.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                 <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {availableYears.map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {months.map(month => (
                            <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DoughnutChartCard title="Total Sales of the Period" amount={totalSales} percentage={100} color="hsl(var(--chart-1))" />
        <DoughnutChartCard title="Total Paid" amount={totalPaid} percentage={totalPaidPercentage} color="hsl(var(--chart-2))" />
        <DoughnutChartCard title="Total Balance" amount={totalBalance} percentage={totalBalancePercentage} color="hsl(var(--chart-3))" />
      </CardContent>
    </Card>
  );
}
