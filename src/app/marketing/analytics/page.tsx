
'use client';

import React, { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { format, getYear, getMonth } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Header } from '@/components/header';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';


type AdSpendInquiry = {
  id: string;
  date: string; // ISO string
  adsSpent: number;
  metaInquiries: number;
};

const chartConfig = {
  adsSpent: {
    label: 'Ads Spent',
    color: 'hsl(var(--chart-1))',
  },
  cpm: {
    label: 'CPM',
    color: 'hsl(var(--chart-2))',
  },
};

const renderAmountLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === 0 || typeof x !== 'number' || typeof y !== 'number') return null;
    
    const xPos = width ? x + width / 2 : x;
  
    return (
      <text x={xPos} y={y} dy={-10} fill="black" fontSize={12} textAnchor="middle" fontWeight="bold">
        {formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </text>
    );
};

export default function AnalyticsPage() {
  const firestore = useFirestore();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());

  const adSpendQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'ad_spend_inquiries')) : null),
    [firestore]
  );
  const { data: adSpendData, isLoading, error } = useCollection<AdSpendInquiry>(adSpendQuery);

  const { availableYears, months } = useMemo(() => {
    if (!adSpendData) {
        const currentYear = new Date().getFullYear();
        return {
            availableYears: [currentYear.toString()],
            months: Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: format(new Date(2000, i), 'MMMM') }))
        };
    }
    const yearsSet = new Set(adSpendData.map(d => getYear(new Date(d.date))));
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a).map(String);

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
      value: (i + 1).toString(),
      label: format(new Date(2000, i), 'MMMM')
    }));

    return { availableYears: sortedYears, months: monthOptions };
  }, [adSpendData]);
  
  const filteredData = useMemo(() => {
    if (!adSpendData) return [];
    
    const year = parseInt(selectedYear, 10);
    const month = parseInt(selectedMonth, 10) -1;

    const dailyData: Record<string, { adsSpent: number; metaInquiries: number }> = {};
    
    adSpendData.forEach(item => {
        const itemDate = new Date(item.date);
        if (getYear(itemDate) === year && getMonth(itemDate) === month) {
            const day = format(itemDate, 'MMM-dd');
            if(!dailyData[day]) {
                dailyData[day] = { adsSpent: 0, metaInquiries: 0 };
            }
            dailyData[day].adsSpent += item.adsSpent;
            dailyData[day].metaInquiries += item.metaInquiries;
        }
    });
    
    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      adsSpent: data.adsSpent,
      cpm: data.metaInquiries > 0 ? data.adsSpent / data.metaInquiries : 0,
    })).sort((a,b) => new Date(a.date).getDate() - new Date(b.date).getDate());

  }, [adSpendData, selectedYear, selectedMonth]);

  if (isLoading) {
    return (
      <Header>
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          <Skeleton className="h-[500px] w-full" />
        </main>
      </Header>
    );
  }

  if (error) {
    return <div className="text-destructive text-center p-4">Error loading analytics data: {error.message}</div>;
  }

  return (
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
             <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Daily Ad Performance</CardTitle>
                    <CardDescription>Ads Spent vs. Cost Per Mille (CPM) for the selected period.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {months.map(month => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
             </div>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={chartConfig} className="w-full h-full">
              <ResponsiveContainer>
                <ComposedChart data={filteredData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis yAxisId="left" stroke={chartConfig.adsSpent.color} tickFormatter={(value) => formatCurrency(value, { notation: 'compact' })} />
                  <YAxis yAxisId="right" orientation="right" stroke={chartConfig.cpm.color} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<ChartTooltipContent formatter={(value, name) => formatCurrency(value as number)} />} />
                  <Legend />
                  <Bar dataKey="cpm" yAxisId="right" fill={chartConfig.cpm.color} name="CPM" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="cpm" position="top" formatter={(value: number) => value > 0 ? formatCurrency(value) : ''} fontSize={12} />
                  </Bar>
                  <Line dataKey="adsSpent" type="monotone" yAxisId="left" stroke={chartConfig.adsSpent.color} name="Ads Spent" strokeWidth={2}>
                    <LabelList dataKey="adsSpent" content={renderAmountLabel} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </main>
    </Header>
  );
}
