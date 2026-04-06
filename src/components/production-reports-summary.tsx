'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { getYear, format } from 'date-fns';
import type { Lead } from '@/app/production/reports/actions';
import { generateProductionReportAction } from '@/app/production/reports/actions';
import { Separator } from './ui/separator';

const chartConfig = {
  count: {
    label: 'Count',
  },
};

export function ProductionReportsSummary() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading: areLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery, undefined, { listen: false });

  const [reportData, setReportData] = useState<any>(null);
  const [isReportLoading, setIsReportLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const { availableYears, monthOptions } = useMemo(() => {
    if (!leads) {
        const currentYear = new Date().getFullYear();
        return {
            availableYears: [currentYear.toString()],
            monthOptions: Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: format(new Date(2000, i), 'MMMM') }))
        };
    }
    const yearsSet = new Set(leads.map(l => getYear(new Date(l.submissionDateTime))));
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a).map(String);

    const months = Array.from({ length: 12 }, (_, i) => ({
      value: (i + 1).toString(),
      label: format(new Date(2000, i), 'MMMM')
    }));

    return { availableYears: sortedYears, monthOptions: months };
  }, [leads]);

  useEffect(() => {
    if (areLeadsLoading) {
        setIsReportLoading(true);
        return;
    }
    if (!leads) {
        setIsReportLoading(false);
        setReportData(null);
        return;
    }
    
    const generate = async () => {
        setIsReportLoading(true);
        try {
          const result = await generateProductionReportAction({ 
              leads,
              selectedMonth: selectedMonth,
              selectedYear: selectedYear,
          });
          setReportData(result);
        } catch (e: any) {
          console.error('Failed to generate report:', e);
          setReportData(null);
        } finally {
          setIsReportLoading(false);
        }
    };
    generate();
  }, [leads, areLeadsLoading, selectedMonth, selectedYear]);

  const { dailyProgressData, dailyBreakdownData } = useMemo(() => {
    if (!reportData) return { dailyProgressData: [], dailyBreakdownData: [] };
    return reportData;
  }, [reportData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      return (
        <div className="bg-card p-2.5 text-card-foreground rounded-md border shadow-md">
          <p className="font-bold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: entry.fill }} />
                <span>{entry.name}:</span>
              </div>
              <span className="font-bold">{entry.value}</span>
            </div>
          ))}
           {payload.length > 1 && (
            <>
              <Separator className="my-2" />
              <div className="flex items-center justify-between font-bold text-sm">
                  <span>Total:</span>
                  <span>{total}</span>
              </div>
            </>
          )}
        </div>
      );
    }
  
    return null;
  };


  if (areLeadsLoading || isReportLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (leadsError) {
    return <p className="text-destructive p-4">Error loading data: {leadsError.message}</p>;
  }
  
  if (!leads || leads.length === 0 || !reportData) {
      return (
        <div className="flex items-center justify-center h-full p-8">
            <p>No data available to generate reports.</p>
        </div>
      );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Production Reports</CardTitle>
                <CardDescription>Daily production output metrics.</CardDescription>
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
                        {monthOptions.map(month => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
            <h3 className="font-semibold text-lg text-center mb-2">Daily Production Output (by Item Quantity)</h3>
            <div className="h-[400px]">
              <ChartContainer config={{}} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyProgressData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis allowDecimals={false} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Area type="monotone" dataKey="quantity" name="Quantity Produced" stroke="hsl(var(--chart-1))" strokeWidth={2} fillOpacity={1} fill="url(#colorQuantity)">
                            <LabelList dataKey="quantity" position="top" className="fill-black font-bold" formatter={(value: number) => value > 0 ? value : null} />
                        </Area>
                    </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
        </div>
        <Separator />
         <div>
            <h3 className="font-semibold text-lg text-center mb-2">Daily Design Production (by Type)</h3>
             <ChartContainer config={chartConfig} className="w-full h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyBreakdownData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false}/>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ bottom: 0 }}/>
                    <Bar dataKey="logo" stackId="a" name="Logos" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="logo" position="center" className="fill-white" formatter={(value: number) => value > 0 ? value : ''} />
                    </Bar>
                    <Bar dataKey="backDesign" stackId="a" name="Back Designs" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="backDesign" position="center" className="fill-white" formatter={(value: number) => value > 0 ? value : ''} />
                    </Bar>
                    <Bar dataKey="names" stackId="a" name="Names" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="names" position="center" className="fill-white" formatter={(value: number) => value > 0 ? value : ''} />
                    </Bar>
                     <Bar dataKey="total" name="Total" fill="transparent">
                        <LabelList dataKey="total" position="top" className="fill-black" formatter={(value: number) => value > 0 ? value : ''} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
