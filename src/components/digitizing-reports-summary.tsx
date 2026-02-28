

'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell, PieChart, Pie, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { generateDigitizingReportAction } from '@/app/digitizing/reports/actions';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';

type GenerateDigitizingReportOutput = {
  salesRepData: any[];
  priorityData: { name: string; value: number }[];
  dailySalesData: any[];
  soldQtyByProductType: any[];
  availableYears: number[];
  availableWeeks: string[];
};

type Lead = {
  id: string;
  joNumber?: number;
  isUnderProgramming?: boolean;
  isInitialApproval?: boolean;
  isLogoTesting?: boolean;
  isRevision?: boolean;
  isFinalApproval?: boolean;
  isFinalProgram?: boolean;
  priorityType: 'Rush' | 'Regular';
  submissionDateTime: string;
};

const chartConfig = {
  count: {
    label: 'Count',
  },
};

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(220, 70%, 70%)',
  'hsl(340, 70%, 70%)',
];

export function DigitizingReportsSummary() {
  const [priorityFilter, setPriorityFilter] = useState('All');
  
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading: isLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery, undefined, { listen: false });
  
  const [reportData, setReportData] = useState<any>(null);
  const [isReportLoading, setIsReportLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);

  const processReport = useCallback(async () => {
    if (!leads) return;
    setIsReportLoading(true);
    setReportError(null);
    try {
      const result = await generateDigitizingReportAction({
        leads,
        priorityFilter,
      });
      setReportData(result);
    } catch (e: any) {
      console.error('Failed to generate digitizing report:', e);
      setReportError(e.message || 'An unknown error occurred.');
    } finally {
      setIsReportLoading(false);
    }
  }, [leads, priorityFilter]);

  useEffect(() => {
    if (leads && leads.length > 0) {
      processReport();
    } else if (!isLeadsLoading) {
        setIsReportLoading(false);
    }
  }, [leads, processReport, isLeadsLoading]);
  
  const isLoading = isLeadsLoading || isReportLoading;
  const error = leadsError || reportError;

  const { statusSummary, overdueSummary } = useMemo<{
    statusSummary: any[];
    overdueSummary: any[];
  }>(() => {
    if (!reportData) return { statusSummary: [], overdueSummary: [] };
    return reportData as any;
  }, [reportData]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading data: {typeof error === 'string' ? error : (error as Error).message}</p>;
  }
  
  if (!reportData) {
     return <p>No data available to generate reports.</p>;
  }

  return (
    <>
      <div className="mb-8 p-4 bg-card text-card-foreground rounded-lg shadow-xl no-print">
        <div className="flex justify-between items-center">
            <div className="flex gap-4 items-center">
                <div className='flex items-center gap-2'>
                    <span className="text-sm font-medium text-card-foreground">Priority:</span>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All</SelectItem>
                            <SelectItem value="Rush">Rush</SelectItem>
                            <SelectItem value="Regular">Regular</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
      </div>
      <div className="printable-area grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground border-none">
          <CardHeader>
            <CardTitle>Programming Status Summary</CardTitle>
            <CardDescription>Number of job orders in each programming stage.</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '350px' }}>
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusSummary} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--foreground))' }} width={150} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                       {statusSummary.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                       <LabelList dataKey="count" position="right" fill="hsl(var(--foreground))" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground border-none">
          <CardHeader>
            <CardTitle>Overdue Status</CardTitle>
            <CardDescription>Breakdown of overdue job orders.</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '350px' }}>
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<ChartTooltipContent nameKey="count" />} />
                    <Pie
                      data={overdueSummary}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ name, count }) => `${name}: ${count}`}
                    >
                      {overdueSummary.map((entry, index) => (
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
    </>
  );
}
