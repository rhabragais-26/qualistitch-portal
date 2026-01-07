
"use client";

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell, PieChart, Pie, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from './ui/skeleton';
import { format, parse, getYear } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from './ui/button';
import { Printer } from 'lucide-react';
import { generateReport, GenerateReportOutput, Lead } from '@/ai/flows/generate-report-flow';

const chartConfig = {
  quantity: {
    label: 'Quantity',
  },
  customerCount: {
    label: 'Customers',
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
  'hsl(100, 70%, 70%)',
  'hsl(20, 70%, 70%)',
  'hsl(260, 70%, 70%)',
  'hsl(60, 70%, 70%)',
  'hsl(180, 70%, 70%)',
];

export function ReportsSummary() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  
  const [reportData, setReportData] = useState<GenerateReportOutput | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'));
  }, [firestore, user]);

  const { data: leads, isLoading: isLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery);

  const months = useMemo(() => [
      { value: '1', label: 'January' }, { value: '2', label: 'February' },
      { value: '3', label: 'March' }, { value: '4', label: 'April' },
      { value: '5', label: 'May' }, { value: '6', label: 'June' },
      { value: '7', label: 'July' }, { value: '8', label: 'August' },
      { value: '9', label: 'September' }, { value: '10', label: 'October' },
      { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ], []);

  const processReport = useCallback(async () => {
    if (!leads) return;
    setIsReportLoading(true);
    setReportError(null);
    try {
      const result = await generateReport({
        leads,
        selectedYear,
        selectedMonth,
        selectedWeek,
      });
      setReportData(result);
    } catch (e: any) {
      console.error('Failed to generate report:', e);
      setReportError(e.message || 'An unknown error occurred.');
    } finally {
      setIsReportLoading(false);
    }
  }, [leads, selectedYear, selectedMonth, selectedWeek]);

  useEffect(() => {
    if (leads) {
      processReport();
    }
  }, [leads, processReport]);

  const totalPriorityQuantity = useMemo(() => reportData?.priorityData.reduce((sum, item) => sum + item.value, 0) || 0, [reportData?.priorityData]);
  
  const isLoading = isLeadsLoading || isReportLoading;
  const error = leadsError || reportError;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
           <Card className="lg:col-span-2 w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
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
    return <p className="text-destructive">Error loading data: {typeof error === 'string' ? error : (error as Error).message}</p>;
  }
  
  if (!reportData) {
     return <p>No data available to generate reports.</p>;
  }

  const { salesRepData, priorityData, dailySalesData, soldQtyByProductType, availableYears, availableWeeks } = reportData;

  return (
    <>
      <div className="mb-8 p-4 bg-card text-card-foreground rounded-lg shadow-xl no-print">
        <div className="flex justify-between items-center">
            <div className="flex gap-4 items-center">
                <div className='flex items-center gap-2'>
                    <span className="text-sm font-medium text-card-foreground">Year:</span>
                    <Select value={selectedYear} onValueChange={(value) => { setSelectedYear(value); setSelectedWeek(''); }}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className='flex items-center gap-2'>
                    <span className="text-sm font-medium text-card-foreground">Month:</span>
                    <Select value={selectedMonth} onValueChange={(value) => { setSelectedMonth(value); setSelectedWeek(''); }} disabled={!!selectedWeek}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(month => (
                                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className='flex items-center gap-2'>
                    <span className="text-sm font-medium text-card-foreground">Week:</span>
                    <Select value={selectedWeek} onValueChange={(value) => setSelectedWeek(value === 'all' ? '' : value)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Week" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Year</SelectItem>
                            {availableWeeks.map(week => (
                                <SelectItem key={week} value={week}>{week}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
      </div>
      <div className="printable-area grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
          <CardHeader>
            <CardTitle>CSR Performance</CardTitle>
            <CardDescription>Total quantity of orders and number of customers by each CSR.</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '250px' }}>
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesRepData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <YAxis yAxisId="left" orientation="left" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      content={<ChartTooltipContent />}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="quantity" name="Quantity" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]}>
                       <LabelList dataKey="quantity" position="top" fill="hsl(var(--foreground))" fontSize={12} />
                    </Bar>
                    <Bar yAxisId="right" dataKey="customerCount" name="Customers" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="customerCount" position="top" fill="hsl(var(--foreground))" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
             <div className="mt-4 mx-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs p-1">CSR</TableHead>
                    <TableHead className="text-right text-xs p-1">Quantity</TableHead>
                    <TableHead className="text-right text-xs p-1">Customers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesRepData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium flex items-center text-xs p-1">
                         <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        {item.name}
                      </TableCell>
                      <TableCell className="text-right text-xs p-1">{item.quantity}</TableCell>
                      <TableCell className="text-right text-xs p-1">{item.customerCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground flex flex-col">
          <CardHeader>
            <CardTitle>QTY by Priority Type</CardTitle>
            <CardDescription>Total quantity of orders for each priority type.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="flex-1 h-[250px] -mt-4">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<ChartTooltipContent nameKey="value" />} />
                    <Pie
                      data={priorityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="80%"
                      labelLine={false}
                      label={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        percent,
                        index,
                      }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);

                        return (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor={x > cx ? "start" : "end"}
                            dominantBaseline="central"
                            fontSize={14}
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                     <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            <div className="mt-auto mx-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs p-1">Priority Type</TableHead>
                    <TableHead className="text-right text-xs p-1">Quantity</TableHead>
                    <TableHead className="text-right text-xs p-1">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priorityData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium flex items-center text-xs p-1">
                         <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        {item.name}
                      </TableCell>
                      <TableCell className="text-right text-xs p-1">{item.value}</TableCell>
                      <TableCell className="text-right text-xs p-1">
                        {totalPriorityQuantity > 0 ? `${((item.value / totalPriorityQuantity) * 100).toFixed(2)}%` : '0.00%'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
       <div className="mt-8">
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
          <CardHeader>
            <CardTitle>Sold QTY by Product Type</CardTitle>
            <CardDescription>Total quantity of items sold for each product type for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={soldQtyByProductType}
                    layout="vertical"
                    margin={{
                      top: 20, right: 30, left: 20, bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--foreground))' }} width={150} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
                      {soldQtyByProductType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      <LabelList dataKey="quantity" position="right" fill="hsl(var(--foreground))" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
          <CardHeader>
            <CardTitle>Daily Sold QTY</CardTitle>
            <CardDescription>Total quantity of items sold each day for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailySalesData}
                    margin={{
                      top: 20, right: 30, left: 20, bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3-3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(value) => format(parse(value, 'MMM-dd-yyyy', new Date()), 'MMM dd')} tick={{ fill: 'hsl(var(--foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="quantity" name="Quantity" radius={[4, 4, 0, 0]}>
                      {dailySalesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      <LabelList dataKey="quantity" position="top" fill="hsl(var(--foreground))" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
