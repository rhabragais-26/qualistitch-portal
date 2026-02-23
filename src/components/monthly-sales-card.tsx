'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import React, { useMemo, useState } from 'react';
import { getMonth, getYear } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type Lead = {
  id: string;
  salesRepresentative: string;
  submissionDateTime: string;
  grandTotal?: number;
};

const chartConfig = {
  amount: {
    label: "Sales Amount",
  },
};

const renderAmountLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === 0 || !y) return null;
  
    return (
      <text x={x + width / 2} y={y} dy={-4} fill="black" fontSize={12} textAnchor="middle" fontWeight="bold">
        {formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </text>
    );
};

export function MonthlySalesCard() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' for year-to-date

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

  const salesData = useMemo(() => {
    if (!leads) return [];

    const year = parseInt(selectedYear);
    
    const filteredLeads = leads.filter(lead => {
        try {
            const submissionDate = new Date(lead.submissionDateTime);
            const submissionYear = getYear(submissionDate);
            
            if (submissionYear !== year) return false;

            if (selectedMonth !== 'all') {
                return getMonth(submissionDate) + 1 === parseInt(selectedMonth);
            }
            
            return true; // Year-to-date matches all in the selected year
        } catch (e) {
            console.warn(`Invalid date format for lead ${'\'\'\''}${lead.id}: ${'\'\'\''}${lead.submissionDateTime}`);
            return false;
        }
    });

    const salesByRep = filteredLeads.reduce((acc, lead) => {
      const rep = lead.salesRepresentative;
      if (!acc[rep]) {
        acc[rep] = { amount: 0 };
      }
      acc[rep].amount += lead.grandTotal || 0;
      return acc;
    }, {} as { [key: string]: { amount: number } });

    return Object.entries(salesByRep)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [leads, selectedYear, selectedMonth]);

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
                <CardTitle>Monthly Sales per Sales Representative</CardTitle>
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
                <CardTitle>Monthly Sales per Sales Representative</CardTitle>
                <CardDescription>Total sales amount by SCES for the selected period.</CardDescription>
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
      <CardContent>
        {salesData.length > 0 ? (
            <div style={{ height: '300px' }}>
             <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData} margin={{ top: 30 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} tick={{ fill: 'black', fontWeight: 'bold', fontSize: 12, opacity: 1 }} />
                        <YAxis
                            stroke="hsl(var(--chart-1))"
                            tickFormatter={(value) => `₱${Number(value) / 1000}k`}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))' }}
                            content={<ChartTooltipContent
                                formatter={(value) => formatCurrency(value as number)}
                            />}
                        />
                        <Bar dataKey="amount" name="Sales Amount" radius={[4, 4, 0, 0]}>
                            {salesData.map((entry, index) => (
                                <Cell key={`cell-amount-${index}`} fill={index % 2 === 0 ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-2))'} />
                            ))}
                            <LabelList dataKey="amount" content={renderAmountLabel} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
             </ChartContainer>
            </div>
        ) : (
            <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">No sales recorded for the selected period.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
