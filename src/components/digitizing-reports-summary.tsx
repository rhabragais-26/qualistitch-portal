'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { generateDigitizingReportAction } from '@/app/digitizing/reports/actions';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';

type Lead = {
  id: string;
  joNumber?: number;
  orderType: string;
  isUnderProgramming?: boolean;
  isInitialApproval?: boolean;
  isLogoTesting?: boolean;
  isRevision?: boolean;
  isFinalApproval?: boolean;
  isFinalProgram?: boolean;
  isDigitizingArchived?: boolean;
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

const StatusDoughnutCard = ({ title, count, total, color }: { title: string; count: number; total: number; color: string }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    const data = [
        { name: title, value: count },
        { name: 'other', value: Math.max(0, total - count) },
    ];
    const chartColors = [color, '#f1f5f9']; // Active color and a light gray for the rest

    return (
        <Card className="flex flex-col items-center justify-start p-2 text-center">
            <CardHeader className="p-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 relative w-24 h-24">
                <ChartContainer config={{}} className="w-full h-full">
                    <ResponsiveContainer>
                        <PieChart>
                            <Tooltip
                                cursor={false}
                                content={<ChartTooltipContent
                                    hideLabel
                                    formatter={(value, name) => (
                                        <div className="flex flex-col">
                                            <span className="font-bold">{name === 'other' ? 'Other' : title}</span>
                                            <span>{value} orders</span>
                                        </div>
                                    )}
                                />}
                            />
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
                                    <Cell key={`cell-${index}`} fill={chartColors[index]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold">{count}</span>
                </div>
            </CardContent>
            <div className="mt-2 text-center">
                 <span className="text-xs font-bold">{percentage.toFixed(1)}%</span>
            </div>
        </Card>
    );
};


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
    statusSummary: {name: string, count: number}[];
    overdueSummary: any[];
  }>(() => {
    if (!reportData) return { statusSummary: [], overdueSummary: [] };
    return reportData as any;
  }, [reportData]);
  
  const totalStatusCount = useMemo(() => statusSummary.reduce((sum, item) => sum + item.count, 0), [statusSummary]);


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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statusSummary.map((status, index) => (
            <StatusDoughnutCard
                key={status.name}
                title={status.name}
                count={status.count}
                total={totalStatusCount}
                color={COLORS[index % COLORS.length]}
            />
        ))}
    </div>

      <div className="printable-area grid grid-cols-1 gap-8">
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
