'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { getYear, format } from 'date-fns';
import type { Lead } from '@/app/production/reports/actions';
import { generateProductionReportAction } from '@/app/production/reports/actions';

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

  const { dailyProgressData } = useMemo(() => {
    if (!reportData) return { dailyProgressData: [] };
    return reportData;
  }, [reportData]);

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
                <CardTitle>Daily Production Output</CardTitle>
                <CardDescription>Total quantity of items marked as "Done Production" per day.</CardDescription>
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
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyProgressData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="quantity" name="Quantity Produced" stroke="hsl(var(--chart-1))" strokeWidth={2}>
                <LabelList dataKey="quantity" position="top" formatter={(value: number) => value > 0 ? value : null} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}