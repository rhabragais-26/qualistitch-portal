'use client';

import React, { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { getMonth, getYear, format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';

type Lead = {
  grandTotal?: number;
  paidAmount?: number;
  balance?: number;
  submissionDateTime: string;
  salesRepresentative: string;
  priorityType: string;
};

const chartConfig = {
  amount: {
    label: "Sales Amount",
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

const renderAmountLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === 0) return null;
  
    return (
      <text x={x + width / 2} y={y} dy={-4} fill="black" fontSize={12} textAnchor="middle" fontWeight="bold">
        {formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </text>
    );
};

const DoughnutChartCard = ({ title, amount, percentage, color }: { title: string; amount: number; percentage: number; color: string }) => {
    const data = [
        { name: 'value', value: Math.max(0, Math.min(100, percentage)) },
        { name: 'remaining', value: Math.max(0, 100 - Math.max(0, Math.min(100, percentage))) },
    ];
    
    const COLORS = [color, '#e5e7eb'];

    return (
        <Card className="flex flex-col items-center justify-center p-4">
            <CardHeader className="p-0 mb-2 text-center">
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
                  </PieChart>
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

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    const year = parseInt(selectedYear, 10);
    const month = parseInt(selectedMonth, 10);

    return leads.filter(lead => {
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
  }, [leads, selectedYear, selectedMonth]);

  const summaryData = useMemo(() => {
    if (!filteredLeads) return { totalSales: 0, totalPaid: 0, totalBalance: 0 };
    let totalSales = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    filteredLeads.forEach(lead => {
        totalSales += lead.grandTotal || 0;
        totalPaid += lead.paidAmount || 0;
        totalBalance += lead.balance || 0;
    });

    return { totalSales, totalPaid, totalBalance };
  }, [filteredLeads]);
  
  const priorityData = useMemo(() => {
    if (!filteredLeads) return { Rush: { count: 0, percentage: 0 }, Regular: { count: 0, percentage: 0 } };

    const counts = filteredLeads.reduce((acc, lead) => {
        if (lead.priorityType === 'Rush') {
            acc.Rush++;
        } else {
            acc.Regular++;
        }
        return acc;
    }, { Rush: 0, Regular: 0 });

    const total = counts.Rush + counts.Regular;

    return {
        Rush: {
            count: counts.Rush,
            percentage: total > 0 ? (counts.Rush / total) * 100 : 0
        },
        Regular: {
            count: counts.Regular,
            percentage: total > 0 ? (counts.Regular / total) * 100 : 0
        }
    };
  }, [filteredLeads]);

  const salesData = useMemo(() => {
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
      .filter(rep => rep.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [filteredLeads]);

  const salesByRepTitle = useMemo(() => {
    let period;
    if (selectedYear === 'all') {
        period = 'All Time';
    } else if (selectedMonth === 'all') {
        period = `the Year ${selectedYear}`;
    } else {
        const monthLabel = months.find(m => m.value === selectedMonth)?.label || '';
        period = `${monthLabel} ${selectedYear}`;
    }
    return `Sold Amount per Sales Specialist for ${period}`;
  }, [selectedYear, selectedMonth, months]);

  if (isLoading) {
      return (
           <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                </div>
                <Separator />
                <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
      )
  }

  if (error) {
    return <p className="text-destructive">Error loading summary data: {error.message}</p>;
  }

  const { totalSales, totalPaid, totalBalance } = summaryData;
  const totalPaidPercentage = totalSales > 0 ? (totalPaid / totalSales) * 100 : 0;
  const totalBalancePercentage = totalSales > 0 ? (totalBalance / totalSales) * 100 : 0;
  const monthlySalesTarget = 12000000;
  const totalSalesPercentage = monthlySalesTarget > 0 ? (totalSales / monthlySalesTarget) * 100 : 0;

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
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DoughnutChartCard title="Total Sales of the Period" amount={totalSales} percentage={totalSalesPercentage} color="hsl(var(--chart-1))" />
            <DoughnutChartCard title="Total Paid" amount={totalPaid} percentage={totalPaidPercentage} color="hsl(var(--chart-2))" />
            <DoughnutChartCard title="Total Balance" amount={totalBalance} percentage={totalBalancePercentage} color="hsl(var(--chart-3))" />
            <Card>
                <CardHeader className="p-4 pb-2 text-center">
                    <CardTitle className="text-base font-medium">Priority Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 flex flex-col gap-4">
                    <PriorityBar percentage={priorityData.Rush.percentage} count={priorityData.Rush.count} label="Rush" color="#ef4444" />
                    <PriorityBar percentage={priorityData.Regular.percentage} count={priorityData.Regular.count} label="Regular" color="#22c55e" />
                </CardContent>
            </Card>
        </div>
        <Separator />
        <div>
            <CardHeader className="p-0 mb-4">
              <CardTitle>{salesByRepTitle}</CardTitle>
              <CardDescription>Total sales amount by SCES for the selected period.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                                      <Cell key={`cell-amount-${index}`} fill={COLORS[index % COLORS.length]} />
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
        </div>
      </CardContent>
    </Card>
  );
}
