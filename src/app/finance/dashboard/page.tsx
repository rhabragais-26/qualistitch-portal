'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  LabelList,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/header';
import { format, startOfMonth, endOfMonth, getMonth, getYear, isWithinInterval } from 'date-fns';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

type OperationalExpense = {
  id: string;
  date: string;
  category: string;
  amount: number;
};

type CostOfGoods = {
  id: string;
  date: string;
  totalCost: number;
};

type CapitalExpense = {
    id: string;
    date: string;
    cost: number;
    assetName: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a2d2ff', '#cdb4db'];

function FinanceDashboard() {
  const firestore = useFirestore();
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const operationalExpensesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'operational_expenses'), orderBy('date', 'desc')) : null, [firestore]);
  const { data: operationalExpenses, isLoading: opExLoading } = useCollection<OperationalExpense>(operationalExpensesQuery);

  const cogsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'cost_of_goods'), orderBy('date', 'desc')) : null, [firestore]);
  const { data: cogs, isLoading: cogsLoading } = useCollection<CostOfGoods>(cogsQuery);

  const capitalExpensesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'capital_expenses'), orderBy('date', 'desc')) : null, [firestore]);
  const { data: capitalExpenses, isLoading: capExLoading } = useCollection<CapitalExpense>(capitalExpensesQuery);
  
  const { years, months } = useMemo(() => {
    const allExpenses = [...(operationalExpenses || []), ...(cogs || []), ...(capitalExpenses || [])];
    if (allExpenses.length === 0) {
      const currentYear = new Date().getFullYear();
      return {
        years: [currentYear.toString()],
        months: Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: format(new Date(currentYear, i), 'MMMM') }))
      };
    }
    const yearsSet = new Set(allExpenses.map(e => getYear(new Date(e.date))));
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
      value: (i + 1).toString(),
      label: format(new Date(2000, i), 'MMMM')
    }));

    return { years: sortedYears.map(String), months: monthOptions };
  }, [operationalExpenses, cogs, capitalExpenses]);

  const filteredData = useMemo(() => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth) - 1;
    const startDate = startOfMonth(new Date(year, month));
    const endDate = endOfMonth(new Date(year, month));
    
    const filterByMonth = (data: any[] | null) => {
        if (!data) return [];
        return data.filter(item => {
            const itemDate = new Date(item.date);
            return isWithinInterval(itemDate, { start: startDate, end: endDate });
        });
    };

    return {
        monthlyOpEx: filterByMonth(operationalExpenses),
        monthlyCogs: filterByMonth(cogs),
        monthlyCapEx: filterByMonth(capitalExpenses),
    }
  }, [operationalExpenses, cogs, capitalExpenses, selectedMonth, selectedYear]);

  const { monthlyOpEx, monthlyCogs, monthlyCapEx } = filteredData;
  
  const opExByCategory = useMemo(() => {
    if (!monthlyOpEx) return [];
    const byCategory = monthlyOpEx.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as { [key: string]: number });
    return Object.entries(byCategory).map(([name, value]) => ({ name, value }));
  }, [monthlyOpEx]);

  const totalExpensesData = useMemo(() => {
    const totalOpEx = monthlyOpEx.reduce((sum, item) => sum + item.amount, 0);
    const totalCogs = monthlyCogs.reduce((sum, item) => sum + item.totalCost, 0);
    const totalCapEx = monthlyCapEx.reduce((sum, item) => sum + item.cost, 0);

    return [
      { name: 'Operational', value: totalOpEx },
      { name: 'COGS', value: totalCogs },
      { name: 'Capital', value: totalCapEx },
    ].filter(item => item.value > 0);
  }, [monthlyOpEx, monthlyCogs, monthlyCapEx]);

  const expensesOverTime = useMemo(() => {
    const allExpenses = [
        ...monthlyOpEx.map(e => ({ date: e.date, type: 'Operational', amount: e.amount })),
        ...monthlyCogs.map(c => ({ date: c.date, type: 'COGS', amount: c.totalCost })),
        ...monthlyCapEx.map(c => ({ date: c.date, type: 'Capital', amount: c.cost }))
    ];
    
    const dailyTotals: {[key: string]: { Operational: number, COGS: number, Capital: number }} = {};

    allExpenses.forEach(exp => {
        const day = format(new Date(exp.date), 'MMM-dd');
        if (!dailyTotals[day]) {
            dailyTotals[day] = { Operational: 0, COGS: 0, Capital: 0 };
        }
        dailyTotals[day][exp.type as 'Operational' | 'COGS' | 'Capital'] += exp.amount;
    });

    return Object.entries(dailyTotals).map(([date, values]) => ({ date, ...values })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [monthlyOpEx, monthlyCogs, monthlyCapEx]);


  if (opExLoading || cogsLoading || capExLoading) {
    return (
        <Header>
            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full lg:col-span-2" />
            </div>
        </Header>
    );
  }

  return (
    <Header>
      <main className="p-4 sm:p-6 lg:p-8">
        <Card className="mb-8 p-4">
            <div className="flex justify-start items-center gap-4">
                 <div className="flex items-center gap-2">
                    <span className="font-medium">Year:</span>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="font-medium">Month:</span>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(month => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
            </div>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Expenses Breakdown</CardTitle>
              <CardDescription>Comparison of different expense types for the selected month.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)}/>} />
                    <Pie data={totalExpensesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {totalExpensesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Operational Expenses by Category</CardTitle>
              <CardDescription>Breakdown of operational costs for the selected month.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={opExByCategory} layout="vertical" margin={{ left: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickFormatter={(value) => formatCurrency(value as number)} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} />
                        <Tooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                        <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]}>
                            <LabelList dataKey="value" position="right" formatter={(value: number) => formatCurrency(value)} fontSize={12} />
                        </Bar>
                   </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
           <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Daily Expense Trend</CardTitle>
                <CardDescription>Total expenses logged per day for the selected month.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="w-full h-80">
                  <ResponsiveContainer>
                    <LineChart data={expensesOverTime} margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis tickFormatter={(value) => formatCurrency(value as number)}/>
                        <Tooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                        <Legend />
                        <Line type="monotone" dataKey="Operational" stroke={COLORS[0]} />
                        <Line type="monotone" dataKey="COGS" stroke={COLORS[1]} />
                        <Line type="monotone" dataKey="Capital" stroke={COLORS[2]} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
           </Card>
        </div>
      </main>
    </Header>
  );
}

export default FinanceDashboard;
