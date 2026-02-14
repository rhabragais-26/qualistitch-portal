
'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
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

const MOCK_DATA = {
  rollups: [
    { month: '2024-03', totalForecastExpense: 450000, totalsByCategory: { Payroll: 200000, Materials: 100000, Marketing: 50000, Logistics: 40000, 'Mgr.': 30000, Other: 30000 } },
    { month: '2024-04', totalForecastExpense: 470000, totalsByCategory: { Payroll: 210000, Materials: 110000, Marketing: 50000, Logistics: 40000, 'Mgr.': 30000, Other: 30000 } },
    { month: '2024-05', totalForecastExpense: 500000, totalsByCategory: { Payroll: 220000, Materials: 120000, Marketing: 55000, Logistics: 45000, 'Mgr.': 30000, Other: 30000 } },
    { month: '2024-06', totalForecastExpense: 650000, totalsByCategory: { Payroll: 280000, Materials: 180000, Marketing: 70000, Logistics: 50000, 'Mgr.': 40000, Other: 30000 } },
    { month: '2024-07', totalForecastExpense: 820000, totalsByCategory: { Payroll: 350000, Materials: 250000, Marketing: 90000, Logistics: 60000, 'Mgr.': 40000, Other: 30000 } },
    { month: '2024-08', totalForecastExpense: 900000, totalsByCategory: { Payroll: 400000, Materials: 280000, Marketing: 100000, Logistics: 70000, 'Mgr.': 20000, Other: 30000 } },
    { month: '2024-09', totalForecastExpense: 950000, totalsByCategory: { Payroll: 420000, Materials: 300000, Marketing: 110000, Logistics: 70000, 'Mgr.': 20000, Other: 30000 } },
    { month: '2024-10', totalForecastExpense: 980000, totalsByCategory: { Payroll: 430000, Materials: 320000, Marketing: 110000, Logistics: 70000, 'Mgr.': 20000, Other: 30000 } },
    { month: '2024-11', totalForecastExpense: 1050000, totalsByCategory: { Payroll: 450000, Materials: 350000, Marketing: 120000, Logistics: 80000, 'Mgr.': 20000, Other: 30000 } },
    { month: '2024-12', totalForecastExpense: 1100000, totalsByCategory: { Payroll: 480000, Materials: 370000, Marketing: 120000, Logistics: 80000, 'Mgr.': 20000, Other: 30000 } },
  ],
  assumptions: {
    grossMarginPercent: 0.40,
    desiredProfit: 300000,
    contingencyPercent: 0.10,
  }
};

const CATEGORY_COLORS = {
  Payroll: "hsl(var(--chart-1))",
  Materials: "hsl(var(--chart-2))",
  Marketing: "hsl(var(--chart-3))",
  Logistics: "hsl(var(--chart-4))",
  'Mgr.': "hsl(var(--chart-5))",
  Other: "hsl(var(--muted))",
};


export function FinancialForecastDashboard() {
  const [dateRange, setDateRange] = useState('6');
  
  // MOCK DATA USAGE
  const isLoading = false;
  const assumptions = MOCK_DATA.assumptions;
  const data = MOCK_DATA.rollups;

  const filteredData = useMemo(() => {
    const months = parseInt(dateRange, 10);
    return data.slice(0, months);
  }, [data, dateRange]);

  const totalForecastedExpenses = useMemo(() => {
    return filteredData.reduce((acc, month) => acc + month.totalForecastExpense, 0);
  }, [filteredData]);
  
  const revenueTarget = useMemo(() => {
      if (!assumptions || totalForecastedExpenses === 0) return 0;
      const { grossMarginPercent, desiredProfit, contingencyPercent } = assumptions;
      if (grossMarginPercent === 0) return Infinity; // Avoid division by zero
      
      const totalMonths = filteredData.length || 1;
      const totalDesiredProfit = desiredProfit * totalMonths;

      return (totalForecastedExpenses * (1 + contingencyPercent) + totalDesiredProfit) / grossMarginPercent;
  }, [totalForecastedExpenses, assumptions, filteredData.length]);


  if (isLoading) {
    return <div><Skeleton className="h-[600px] w-full" /></div>;
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
            <div className="text-3xl font-bold">{formatCurrency(assumptions.desiredProfit)}</div>
             <p className="text-xs text-muted-foreground">Per month</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(assumptions.grossMarginPercent * 100).toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Target margin</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Forecasted Expenses Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] w-full">
            <ResponsiveContainer>
              <LineChart data={filteredData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickFormatter={(value) => value.substring(5)} />
                <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                <Line type="monotone" dataKey="totalForecastExpense" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{r: 5}}/>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Expense Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] w-full">
             <ResponsiveContainer>
                <BarChart data={filteredData} layout="vertical" stackOffset="expand">
                    <XAxis type="number" hide />
                    <YAxis dataKey="month" type="category" tickFormatter={(value) => value.substring(5)} hide />
                    <Tooltip content={<ChartTooltipContent formatter={(value, name, item) => `${(item.payload[name] / item.payload.totalForecastExpense * 100).toFixed(0)}% (${formatCurrency(item.payload[name])})` } />} />
                    <Legend />
                    {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
                        <Bar key={category} dataKey={`totalsByCategory.${category}`} stackId="a" fill={color} name={category} />
                    ))}
                </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
       <Card className="rounded-2xl shadow-sm bg-primary text-primary-foreground text-center p-6">
        <h3 className="text-lg font-semibold uppercase tracking-wider">Minimum Monthly Sales Target</h3>
        <p className="text-5xl font-bold my-2">{formatCurrency(revenueTarget / (filteredData.length || 1))}</p>
        <p className="text-sm opacity-80">Required Revenue to Meet Profit Goals</p>
      </Card>
    </div>
  );
}

