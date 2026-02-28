

'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { getYear, format } from 'date-fns';
import { generateDigitizingReportAction } from '@/app/digitizing/reports/actions';
import type { Lead, GenerateDigitizingReportInput } from '@/app/digitizing/reports/actions';
import { Separator } from './ui/separator';

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
    const chartColors = [color, '#e5e7eb']; // Active color and a light gray for the rest

    return (
        <Card className="flex flex-col items-center justify-start p-4 text-center">
            <CardHeader className="p-0 mb-2">
                <CardTitle className="text-lg font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 relative w-36 h-36">
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
                                outerRadius="100%"
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
                    <span className="text-3xl font-bold">{count}</span>
                </div>
            </CardContent>
            <div className="mt-2 text-center">
                 <span className="text-sm font-bold">{percentage.toFixed(1)}%</span>
            </div>
        </Card>
    );
};

const PriorityBar = ({ percentage, count, label, color }: { percentage: number, count: number, label: string, color: string }) => {
    return (
        <div className="flex flex-col items-center w-full">
            <p className="font-medium text-sm self-start">{label}</p>
            <div className="w-full h-8 bg-gray-200 rounded-lg my-1 relative overflow-hidden">
                <div style={{ width: `${percentage}%`, backgroundColor: color }} className="h-full rounded-lg flex items-center justify-center transition-all duration-500">
                    <span className="text-white font-bold text-sm">{percentage.toFixed(0)}%</span>
                </div>
            </div>
            <p className="text-sm font-bold self-end">{count} orders</p>
        </div>
    )
}

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
          <Separator className="my-2" />
          <div className="flex items-center justify-between font-bold text-sm">
              <span>Total:</span>
              <span>{total}</span>
          </div>
        </div>
      );
    }
  
    return null;
};

export function DigitizingReportsSummary() {
  
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading: areLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery, undefined, { listen: false });
  
  const [reportData, setReportData] = useState<any>(null);
  const [isReportLoading, setIsReportLoading] = useState(true);

  const [progressChartMonth, setProgressChartMonth] = useState((new Date().getMonth() + 1).toString());
  const [progressChartYear, setProgressChartYear] = useState(new Date().getFullYear().toString());

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
          const input: GenerateDigitizingReportInput = { 
              leads,
              priorityFilter: 'All',
              selectedMonth: progressChartMonth,
              selectedYear: progressChartYear,
          };
          const result = await generateDigitizingReportAction(input);
          setReportData(result);
        } catch (e: any) {
          console.error('Failed to generate report:', e);
          setReportData(null);
        } finally {
          setIsReportLoading(false);
        }
    };
    generate();
  }, [leads, areLeadsLoading, progressChartMonth, progressChartYear]);


  const { statusSummary, overdueSummary, digitizerSummary, dailyProgressData, totalStatusCount, ongoingVsCompletedData, monthlyProgramsDone } = useMemo(() => {
    if (!reportData) return { statusSummary: [], overdueSummary: [], digitizerSummary: [], dailyProgressData: [], totalStatusCount: 0, ongoingVsCompletedData: [], monthlyProgramsDone: [] };
    return reportData;
  }, [reportData]);

  const totalPrograms = useMemo(() => {
    if (!ongoingVsCompletedData) return 0;
    return ongoingVsCompletedData.reduce((sum: any, item: any) => sum + item.count, 0);
  }, [ongoingVsCompletedData]);


  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, count, fill }: any) => {
    if (percent === 0) return null;
    const radiusInside = innerRadius + (outerRadius - innerRadius) * 0.5;
    const xInside = cx + radiusInside * Math.cos(-midAngle * RADIAN);
    const yInside = cy + radiusInside * Math.sin(-midAngle * RADIAN);
  
    const radiusOutside = outerRadius + 15;
    const xStart = cx + outerRadius * Math.cos(-midAngle * RADIAN);
    const yStart = cy + outerRadius * Math.sin(-midAngle * RADIAN);
    const xEnd = cx + radiusOutside * Math.cos(-midAngle * RADIAN);
    const yEnd = cy + radiusOutside * Math.sin(-midAngle * RADIAN);
    const textAnchor = xEnd > cx ? 'start' : 'end';
  
    return (
      <g>
        <text x={xInside} y={yInside} fill="white" textAnchor="middle" dominantBaseline="central" fontWeight="bold" fontSize={14}>
          {`${(percent * 100).toFixed(0)}%`}
        </text>
        <path d={`M${xStart},${yStart} L${xEnd},${yEnd}`} stroke={fill} fill="none" />
        <text x={xEnd + (xEnd > cx ? 1 : -1) * 4} y={yEnd} textAnchor={textAnchor} fill="#333" dominantBaseline="central" fontWeight="bold">
          {`${count}`}
        </text>
      </g>
    );
  };

  const overdueColors: { [key: string]: string } = {
      'On Track': '#22c55e', // green
      'Nearly Overdue': '#eab308', // yellow
      'Overdue': '#ef4444', // red
  };

  const isLoading = areLeadsLoading || isReportLoading;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
            <Card key={i} className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
                <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                <Skeleton className="h-[250px] w-full" />
                </CardContent>
            </Card>
            ))}
        </div>
        <Card className="lg:col-span-3">
             <CardHeader>
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
        </Card>
      </div>
    );
  }

  if (leadsError) {
    return <p className="text-destructive p-4">Error loading data: {leadsError.message}</p>;
  }
  
  if (!leads || leads.length === 0) {
      return (
        <div className="flex items-center justify-center h-full p-8">
            <p>No data available to generate reports.</p>
        </div>
      );
  }


  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statusSummary.map((status: any, index: any) => (
            <StatusDoughnutCard
                key={status.name}
                title={status.name}
                count={status.count}
                total={totalStatusCount}
                color={COLORS[index % COLORS.length]}
            />
        ))}
    </div>

      <div className="printable-area grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground border-none">
          <CardHeader>
            <CardTitle>Program Status</CardTitle>
            <CardDescription>Comparison of ongoing vs. completed programs.</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex flex-col justify-center items-center gap-4">
            {ongoingVsCompletedData.map((item: any) => {
              const percentage = totalPrograms > 0 ? (item.count / totalPrograms) * 100 : 0;
              return (
                <PriorityBar
                  key={item.name}
                  percentage={percentage}
                  count={item.count}
                  label={item.name}
                  color={item.fill}
                />
              )
            })}
          </CardContent>
        </Card>
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground border-none">
          <CardHeader>
            <CardTitle>Overdue Status</CardTitle>
            <CardDescription>Breakdown of overdue job orders.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<ChartTooltipContent nameKey="count" />} />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="left"
                      iconType="circle"
                      wrapperStyle={{ lineHeight: 2, fontSize: 12 }}
                    />
                    <Pie
                      data={overdueSummary}
                      dataKey="count"
                      nameKey="name"
                      cx="60%"
                      cy="50%"
                      outerRadius={80}
                      labelLine={false}
                      label={renderCustomizedLabel}
                    >
                      {overdueSummary.map((entry: any) => (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={overdueColors[entry.name as keyof typeof overdueColors]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
          </CardContent>
        </Card>
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground border-none">
            <CardHeader>
                <CardTitle>Assigned Orders per Digitizer</CardTitle>
                <CardDescription>Number of active orders assigned to each digitizer.</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
                <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer>
                        <BarChart
                            data={digitizerSummary}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                        >
                            <CartesianGrid horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12 }}
                                width={100}
                            />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))' }}
                                content={<ChartTooltipContent />}
                            />
                            <Bar dataKey="count" name="Orders" radius={[0, 4, 4, 0]}>
                                {digitizerSummary.map((entry: any, index: any) => (
                                    <Cell key={`cell-${index}`} fill={entry.name === 'Unassigned' ? '#6B7280' : COLORS[index % COLORS.length]} />
                                ))}
                                <LabelList dataKey="count" position="right" offset={8} className="fill-foreground" fontSize={12} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
        <Card className="lg:col-span-3">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Daily Productivity per Digitizer</CardTitle>
                        <CardDescription>Combined count of Uploaded Initial Program Images and Final DST Files (Logo, Back Design and Names) on a daily basis</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={progressChartYear} onValueChange={setProgressChartYear}>
                            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={progressChartMonth} onValueChange={setProgressChartMonth}>
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {monthOptions.map(month => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
             <div className="h-80">
                <ChartContainer config={{}} className="w-full h-full">
                    <ResponsiveContainer>
                        <LineChart data={dailyProgressData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis allowDecimals={false} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend />
                            {dailyProgressData.length > 0 && Object.keys(dailyProgressData[0]).filter(k => k !== 'date').map((key, index) => (
                                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
             </div>
              <Separator />
              <div>
                <CardHeader className="p-0 mb-4">
                    <CardTitle>Monthly Programs Done by each Digitizers</CardTitle>
                </CardHeader>
                <CardContent className="h-80 p-0">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                      <ResponsiveContainer>
                          <BarChart
                              data={monthlyProgramsDone}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                              <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                              <YAxis allowDecimals={false} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <Bar dataKey="logo" fill="hsl(var(--chart-1))" name="Logo">
                                <LabelList dataKey="logo" position="top" fontSize={14} fontWeight="bold" fill="black" />
                              </Bar>
                              <Bar dataKey="backDesign" fill="hsl(var(--chart-4))" name="Back Design">
                                <LabelList dataKey="backDesign" position="top" fontSize={14} fontWeight="bold" fill="black" />
                              </Bar>
                              <Bar dataKey="names" fill="hsl(var(--chart-5))" name="Names">
                                <LabelList dataKey="names" position="top" fontSize={14} fontWeight="bold" fill="black" />
                              </Bar>
                          </BarChart>
                      </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
