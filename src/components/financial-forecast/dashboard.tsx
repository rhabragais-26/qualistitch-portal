
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Banknote, TrendingUp, PiggyBank, Percent, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, limit } from 'firebase/firestore';
import { format, subMonths, addMonths } from 'date-fns';

type FinanceAssumption = {
  grossMarginPercent: number;
  desiredProfit: number;
  contingencyPercent: number;
};

type FinanceForecastRollup = {
  month: string;
  totalForecastExpense: number;
  scheduledForecastExpense: number;
  combinedForecastExpense: number;
  totalsByCategory: { [key: string]: number };
};

const CATEGORY_COLORS = {
  Payroll: "hsl(var(--chart-1))",
  Materials: "hsl(var(--chart-2))",
  Marketing: "hsl(var(--chart-3))",
  Logistics: "hsl(var(--chart-4))",
  'Mgr.': "hsl(var(--chart-5))",
  Other: "hsl(var(--muted))",
};

const chartConfig = {
  combinedForecastExpense: {
    label: "Total Expense",
    color: "hsl(var(--chart-1))",
  },
  // ... other categories if needed
};


export function FinancialForecastDashboard() {
  const [dateRange, setDateRange] = useState('6');
  const firestore = useFirestore();

  const assumptionsRef = useMemoFirebase(() => firestore ? doc(firestore, 'financeAssumptions', 'current') : null, [firestore]);
  const { data: assumptions, isLoading: assumptionsLoading } = useDoc<FinanceAssumption>(assumptionsRef);
  
  const rollupsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      const months = parseInt(dateRange, 10);
      const startMonth = format(new Date(), 'yyyy-MM');
      // We fetch one extra month in case the last month has recurring expenses affecting the rollup
      const endMonth = format(addMonths(new Date(), months), 'yyyy-MM'); 
      return query(
          collection(firestore, 'financeForecastRollups'),
          where('month', '>=', startMonth),
          orderBy('month', 'asc'),
          limit(months)
      );
  }, [firestore, dateRange]);

  const { data: rollups, isLoading: rollupsLoading } = useCollection<FinanceForecastRollup>(rollupsQuery);
  
  const isLoading = assumptionsLoading || rollupsLoading;

  const filteredData = useMemo(() => {
    if (!rollups) return [];
    const months = parseInt(dateRange, 10);
    return rollups.slice(0, months);
  }, [rollups, dateRange]);

  const totalForecastedExpenses = useMemo(() => {
    return filteredData.reduce((acc, month) => acc + (month.combinedForecastExpense || 0), 0);
  }, [filteredData]);
  
  const revenueTarget = useMemo(() => {
      if (!assumptions || totalForecastedExpenses === 0) return 0;
      const { grossMarginPercent, desiredProfit, contingencyPercent } = assumptions;
      if (grossMarginPercent === 0) return Infinity;
      
      const totalMonths = filteredData.length || 1;
      const totalDesiredProfit = desiredProfit * totalMonths;

      return (totalForecastedExpenses * (1 + contingencyPercent) + totalDesiredProfit) / grossMarginPercent;
  }, [totalForecastedExpenses, assumptions, filteredData.length]);


  if (isLoading) {
    return <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
            <Skeleton className="lg:col-span-3 h-[400px] rounded-2xl" />
            <Skeleton className="lg:col-span-2 h-[400px] rounded-2xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financial Forecast</h1>
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Next 6 Months</SelectItem>
              <SelectItem value="12">Next 12 Months</SelectItem>
              <SelectItem value="custom" disabled>Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="base">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Scenario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="base">Base</SelectItem>
              <SelectItem value="conservative" disabled>Conservative</SelectItem>
              <SelectItem value="aggressive" disabled>Aggressive</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forecasted Expenses</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalForecastedExpenses / (filteredData.length || 1))}</div>
            <p className="text-xs text-muted-foreground">Average per month</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Target</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(revenueTarget)}</div>
             <p className="text-xs text-muted-foreground">Total for the period</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desired Profit</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(assumptions?.desiredProfit || 0)}</div>
             <p className="text-xs text-muted-foreground">Per month</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{((assumptions?.grossMarginPercent || 0) * 100).toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Target margin</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Forecasted Expenses Trend</CardTitle>
            <CardDescription>Monthly forecasted expense trend.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] w-full">
            <ChartContainer config={chartConfig} className="w-full h-full">
              <LineChart data={filteredData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickFormatter={(value) => format(new Date(`${value}-02`), 'MMM')} />
                <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                <Line type="monotone" dataKey="combinedForecastExpense" name="Total Expense" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{r: 5}}/>
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Expense Breakdown by Category</CardTitle>
            <CardDescription>Breakdown of expenses for the selected period.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] w-full">
             <ChartContainer config={chartConfig} className="w-full h-full">
                <BarChart data={filteredData} layout="vertical" stackOffset="expand">
                    <XAxis type="number" hide />
                    <YAxis dataKey="month" type="category" tickFormatter={(value) => format(new Date(`${value}-02`), 'MMM')} hide />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value, name, item) => `${item.payload.totalsByCategory[name] ? (item.payload.totalsByCategory[name] / item.payload.combinedForecastExpense * 100).toFixed(0) : 0}% (${formatCurrency(item.payload.totalsByCategory[name] || 0)})` } />} />
                    <Legend />
                    {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
                        <Bar key={category} dataKey={`totalsByCategory.${category}`} stackId="a" fill={color} name={category} />
                    ))}
                </BarChart>
             </ChartContainer>
          </CardContent>
        </Card>
      </div>
      
       <Card className="rounded-2xl shadow-sm bg-primary text-primary-foreground text-center p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider">Minimum Monthly Sales Target</h3>
        <p className="text-3xl font-bold my-1">{formatCurrency(revenueTarget / (filteredData.length || 1))}</p>
        <p className="text-xs opacity-80">Required Revenue to Meet Profit Goals</p>
      </Card>
    </div>
  );
}
