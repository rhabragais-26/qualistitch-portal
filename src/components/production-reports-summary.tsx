
'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, LineChart, Line, ReferenceLine, ComposedChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { getYear, format, parse } from 'date-fns';
import type { Lead } from '@/app/production/reports/actions';
import { Separator } from './ui/separator';
import { generateProductionReportAction } from '@/app/production/reports/actions';

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
      const designPayloads = payload.filter(p => ['logo', 'backDesign', 'names'].includes(p.dataKey));
      const totalDesigns = designPayloads.reduce((sum: number, entry: any) => sum + entry.value, 0);
      
      return (
        <div className="bg-card p-2.5 text-card-foreground rounded-md border shadow-md">
          <p className="font-bold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey === 'total') return null;
            return (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: entry.stroke || entry.fill }} />
                  <span>{entry.name}:</span>
                </div>
                <span className="font-bold">{entry.value}</span>
              </div>
            );
          })}
          {designPayloads.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="flex items-center justify-between font-bold text-sm">
                  <span>Total Designs:</span>
                  <span>{totalDesigns}</span>
              </div>
            </>
          )}
        </div>
      );
    }
  
    return null;
};

export function ProductionReportsSummary() {
  
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading: areLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery, undefined, { listen: false });
  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const { data: users, isLoading: areUsersLoading, error: usersError } = useCollection(usersQuery, undefined, { listen: false });

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
    if (areLeadsLoading || areUsersLoading) {
        setIsReportLoading(true);
        return;
    }
    if (!leads || !users) {
        setIsReportLoading(false);
        setReportData(null);
        return;
    }
    
    const generate = async () => {
        setIsReportLoading(true);
        try {
          const result = await generateProductionReportAction({ 
              leads,
              users: [],
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
  }, [leads, users, areLeadsLoading, areUsersLoading, selectedMonth, selectedYear]);


  const { dailyProgressData, dailyBreakdownData, designTypeQuantities } = useMemo(() => {
    if (!reportData) return { dailyProgressData: [], dailyBreakdownData: [], designTypeQuantities: [] };
    return reportData;
  }, [reportData]);
  
  const totalDesignQuantities = useMemo(() => {
    if (!designTypeQuantities) return 0;
    return designTypeQuantities.reduce((sum: number, item: any) => sum + item.count, 0);
  }, [designTypeQuantities]);

  const totalPrograms = useMemo(() => {
    if (!dailyBreakdownData) return 0;
    return dailyBreakdownData.reduce((sum: any, item: any) => sum + item.doneJoCount, 0);
  }, [dailyBreakdownData]);


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
  
  const renderTotalLabel = (props: any) => {
    const { x, y, width, value, payload } = props;
    if (!payload || typeof x !== 'number' || typeof y !== 'number') return null;
    const { total } = payload;
  
    if (total > 0) {
      return (
        <text x={x + width / 2} y={y} dy={-4} fill="#000" fontSize={12} textAnchor="middle" fontWeight="bold">
          {total}
        </text>
      );
    }
    return null;
  };

  const overdueColors: { [key: string]: string } = {
      'On Track': '#22c55e', // green
      'Nearly Overdue': '#eab308', // yellow
      'Overdue': '#ef4444', // red
  };

  const isLoading = areLeadsLoading || isReportLoading || areUsersLoading;
  const error = leadsError || usersError;

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

  if (error) {
    return <p className="text-destructive p-4">Error loading data: {error.message}</p>;
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
        <Card>
          <CardHeader>
              <CardTitle>Total Items Embroidered</CardTitle>
              <CardDescription>
                  Total quantity of embroidered items based on design type for the selected month.
              </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {designTypeQuantities.map((item: any) => (
                  <StatusDoughnutCard
                      key={item.name}
                      title={item.name}
                      count={item.count}
                      total={totalDesignQuantities}
                      color={item.color}
                  />
              ))}
          </CardContent>
        </Card>
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
            <CardHeader className="p-0 mb-4">
                <CardTitle className="text-lg text-center">Daily Productivity by Design Type</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px] p-0">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                      <ResponsiveContainer>
                          <ComposedChart
                              data={dailyBreakdownData}
                              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                              barGap={0}
                              barCategoryGap="20%"
                          >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" xAxisId="bottom" tickLine={false} axisLine={true} dy={10} interval={0} tick={{ fontSize: 12 }} scale="band" />
                              <XAxis dataKey="date" xAxisId="top" orientation="top" tickFormatter={(value) => format(parse(value, 'MMM-dd', new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1)), 'E')} tickLine={false} axisLine={false} interval={0} height={1} tick={{ fontSize: 10 }} />
                              <YAxis yAxisId="left" orientation="left" allowDecimals={false} />
                              <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend wrapperStyle={{ bottom: 0 }}/>
                              <ReferenceLine y={0} yAxisId="left" xAxisId="bottom" stroke="#000" />
                              <Bar yAxisId="left" xAxisId="bottom" dataKey="logo" stackId="a" name="Logos" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]}>
                                  <LabelList dataKey="logo" position="center" className="fill-white" formatter={(value: number) => value > 0 ? value : ''} />
                              </Bar>
                              <Bar yAxisId="left" xAxisId="bottom" dataKey="backDesign" stackId="a" name="Back Designs" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]}>
                                  <LabelList dataKey="backDesign" position="center" className="fill-white" formatter={(value: number) => value > 0 ? value : ''} />
                              </Bar>
                              <Bar yAxisId="left" xAxisId="bottom" dataKey="names" stackId="a" name="Names" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]}>
                                  <LabelList dataKey="names" position="center" className="fill-white" formatter={(value: number) => value > 0 ? value : ''} />
                                  <LabelList dataKey="total" content={renderTotalLabel} />
                              </Bar>
                              <Line
                                  yAxisId="right"
                                  xAxisId="bottom"
                                  type="monotone" 
                                  dataKey="doneJoCount" 
                                  name="J.O.s Done" 
                                  stroke="purple"
                                  strokeWidth={2}
                                  dot={{ r: 4, fill: 'purple' }}
                                  activeDot={{ r: 6 }}
                              >
                                <LabelList dataKey="doneJoCount" position="top" formatter={(value: number) => value > 0 ? value : null} fill="purple" fontWeight="bold" />
                              </Line>
                          </ComposedChart>
                      </ResponsiveContainer>
                  </ChartContainer>
            </CardContent>
          </div>
      </CardContent>
    </Card>
  );
}
