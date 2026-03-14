
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
  AreaChart,
  Area,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/header';
import { format, startOfMonth, endOfMonth, getMonth, getYear, isWithinInterval, eachDayOfInterval, endOfDay, isBefore, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

// Types for expenses
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

// Types for cash inflows
type Payment = {
    id?: string;
    type: 'down' | 'full' | 'balance' | 'additional' | 'securityDeposit';
    amount: number;
    mode: string;
    timestamp?: string;
    actualTransactionDate?: string;
};
  
type Lead = {
    id: string;
    payments?: Payment[];
    submissionDateTime: string;
};

type OtherCashInflow = {
    id: string;
    date: string;
    amount: number;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a2d2ff', '#cdb4db'];

const renderAmountLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === 0 || typeof x !== 'number' || typeof y !== 'number' || isNaN(x)) return null;
    
    const xPos = width ? x + width / 2 : x;

    return (
        <text
          x={xPos}
          y={y}
          dy={-8}
          fill="black"
          fontSize={12}
          fontWeight="bold"
          textAnchor="middle"
        >
          {formatCurrency(value, { maximumFractionDigits: 0 })}
        </text>
    );
};

const DoughnutChartCard = ({ title, amount, percentage, color }: { title: string; amount: number; percentage: number; color: string }) => {
  const data = [
      { name: 'value', value: Math.max(0, Math.min(100, percentage)) },
      { name: 'remaining', value: Math.max(0, 100 - Math.max(0, Math.min(100, percentage))) },
  ];
  
  const chartColors = [color, '#e5e7eb'];

  return (
      <Card className="flex flex-col items-center justify-center pt-4 px-2 pb-2 space-y-2">
          <CardHeader className="p-0 text-center">
              <CardTitle className="text-sm font-medium leading-none">{title}</CardTitle>
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
                        innerRadius="65%"
                        outerRadius="80%"
                        startAngle={90}
                        endAngle={450}
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                    </Pie>
                </PieChart>
              </ChartContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold">{formatCurrency(amount, { notation: 'compact', maximumFractionDigits: 1})}</span>
              </div>
          </CardContent>
      </Card>
  )
}


function FinanceDashboard() {
  const firestore = useFirestore();
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Expense queries
  const operationalExpensesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'operational_expenses'), orderBy('date', 'desc')) : null, [firestore]);
  const { data: operationalExpenses, isLoading: opExLoading } = useCollection<OperationalExpense>(operationalExpensesQuery);

  const cogsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'cost_of_goods'), orderBy('date', 'desc')) : null, [firestore]);
  const { data: cogs, isLoading: cogsLoading } = useCollection<CostOfGoods>(cogsQuery);

  const capitalExpensesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'capital_expenses'), orderBy('date', 'desc')) : null, [firestore]);
  const { data: capitalExpenses, isLoading: capExLoading } = useCollection<CapitalExpense>(capitalExpensesQuery);
  
  // Inflow queries
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading: leadsLoading } = useCollection<Lead>(leadsQuery);
  
  const otherInflowsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'other_cash_inflows'), orderBy('date', 'desc')) : null, [firestore]);
  const { data: otherInflows, isLoading: otherInflowsLoading } = useCollection<OtherCashInflow>(otherInflowsQuery);

  const isLoading = opExLoading || cogsLoading || capExLoading || leadsLoading || otherInflowsLoading;

  const { years, months } = useMemo(() => {
    const allEntries = [...(operationalExpenses || []), ...(cogs || []), ...(capitalExpenses || []), ...(otherInflows || []), ...(leads || []).flatMap(l => l.payments?.map(p => ({date: p.timestamp || l.submissionDateTime})) || [])];
    if (allEntries.length === 0) {
      const currentYear = new Date().getFullYear();
      return {
        years: [currentYear.toString()],
        months: Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: format(new Date(currentYear, i), 'MMMM') }))
      };
    }
    const yearsSet = new Set(allEntries.map(e => getYear(new Date(e.date))));
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
      value: (i + 1).toString(),
      label: format(new Date(2000, i), 'MMMM')
    }));

    return { years: sortedYears.map(String), months: monthOptions };
  }, [operationalExpenses, cogs, capitalExpenses, leads, otherInflows]);

  const { monthlyOpEx, monthlyCogs, monthlyCapEx } = useMemo(() => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth) - 1;
    const startDate = startOfMonth(new Date(year, month));
    const endDate = endOfMonth(new Date(year, month));
    
    const filterByMonth = (data: any[] | null) => {
        if (!data) return [];
        return data.filter(item => {
            try {
                const itemDate = new Date(item.date);
                return isWithinInterval(itemDate, { start: startDate, end: endDate });
            } catch(e) { return false; }
        });
    };

    return {
        monthlyOpEx: filterByMonth(operationalExpenses),
        monthlyCogs: filterByMonth(cogs),
        monthlyCapEx: filterByMonth(capitalExpenses),
    }
  }, [operationalExpenses, cogs, capitalExpenses, selectedMonth, selectedYear]);

  const dailyCashInflows = useMemo(() => {
    if (!leads && !otherInflows) return [];

    const year = parseInt(selectedYear, 10);
    const month = parseInt(selectedMonth, 10) - 1;
    const startDate = startOfMonth(new Date(year, month));
    
    const today = endOfDay(new Date());
    const monthEndForSelected = endOfMonth(new Date(year, month));
    const endDate = isBefore(monthEndForSelected, today) ? monthEndForSelected : today;

    const inflowsByDay: {[key: string]: number} = {};

    const processDate = (dateString: string, amount: number) => {
        try {
            const date = new Date(dateString);
            if (isWithinInterval(date, { start: startDate, end: endDate })) {
                const day = format(date, 'MMM-dd');
                inflowsByDay[day] = (inflowsByDay[day] || 0) + amount;
            }
        } catch (e) {
            // ignore invalid dates
        }
    };

    (leads || []).forEach(lead => {
        (lead.payments || []).forEach(payment => {
            const dateToUse = payment.actualTransactionDate || payment.timestamp || lead.submissionDateTime;
            processDate(dateToUse, payment.amount);
        });
    });

    (otherInflows || []).forEach(inflow => {
        processDate(inflow.date, inflow.amount);
    });

    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
    
    return daysInMonth.map(day => {
        const dateStr = format(day, 'MMM-dd');
        return {
            date: dateStr,
            amount: inflowsByDay[dateStr] || 0
        };
    });

  }, [leads, otherInflows, selectedMonth, selectedYear]);
  
  const totalInflowForPeriod = useMemo(() => {
    return dailyCashInflows.reduce((sum, day) => sum + day.amount, 0);
  }, [dailyCashInflows]);

  const dailyInflowBreakdown = useMemo(() => {
    if (!leads && !otherInflows) return [];

    const year = parseInt(selectedYear, 10);
    const month = parseInt(selectedMonth, 10) - 1;
    const startDate = startOfMonth(new Date(year, month));
    
    const today = endOfDay(new Date());
    const monthEndForSelected = endOfMonth(new Date(year, month));
    const endDate = isBefore(monthEndForSelected, today) ? monthEndForSelected : today;

    const inflowsByDay: {[key: string]: { [key: string]: number }} = {};

    const processPayment = (dateString: string, amount: number, type: string) => {
        try {
            const date = new Date(dateString);
            if (isWithinInterval(date, { start: startDate, end: endDate })) {
                const day = format(date, 'MMM-dd');
                if (!inflowsByDay[day]) {
                  inflowsByDay[day] = {};
                }
                inflowsByDay[day][type] = (inflowsByDay[day][type] || 0) + amount;
            }
        } catch (e) {
            // ignore invalid dates
        }
    };
    
    const typeMapping: {[key: string]: string} = {
        'down': 'Downpayment',
        'full': 'Full Payment',
        'balance': 'Balance Payment',
        'additional': 'Additional Payment',
        'securityDeposit': 'Security Deposit'
    };

    (leads || []).forEach(lead => {
        (lead.payments || []).forEach(payment => {
            const dateToUse = payment.actualTransactionDate || payment.timestamp || lead.submissionDateTime;
            const mappedType = typeMapping[payment.type];
            if (mappedType) {
              processPayment(dateToUse, payment.amount, mappedType);
            }
        });
    });

    (otherInflows || []).forEach(inflow => {
        processPayment(inflow.date, inflow.amount, 'Other Inflows');
    });

    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
    
    return daysInMonth.map(day => {
        const dateStr = format(day, 'MMM-dd');
        const breakdown = {
            'Downpayment': inflowsByDay[dateStr]?.['Downpayment'] || 0,
            'Full Payment': inflowsByDay[dateStr]?.['Full Payment'] || 0,
            'Balance Payment': inflowsByDay[dateStr]?.['Balance Payment'] || 0,
            'Additional Payment': inflowsByDay[dateStr]?.['Additional Payment'] || 0,
            'Security Deposit': inflowsByDay[dateStr]?.['Security Deposit'] || 0,
            'Other Inflows': inflowsByDay[dateStr]?.['Other Inflows'] || 0
        };
        const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

        return {
            date: dateStr,
            ...breakdown,
            total,
        };
    });

  }, [leads, otherInflows, selectedMonth, selectedYear]);

  const {
    totalDownpayment,
    totalFullPayment,
    totalBalancePayment,
    totalAdditionalPayment,
    totalSecurityDeposit,
    totalOtherInflows,
  } = useMemo(() => {
    return (dailyInflowBreakdown || []).reduce((acc, day) => {
        acc.totalDownpayment += day['Downpayment'] || 0;
        acc.totalFullPayment += day['Full Payment'] || 0;
        acc.totalBalancePayment += day['Balance Payment'] || 0;
        acc.totalAdditionalPayment += day['Additional Payment'] || 0;
        acc.totalSecurityDeposit += day['Security Deposit'] || 0;
        acc.totalOtherInflows += day['Other Inflows'] || 0;
        return acc;
    }, {
        totalDownpayment: 0,
        totalFullPayment: 0,
        totalBalancePayment: 0,
        totalAdditionalPayment: 0,
        totalSecurityDeposit: 0,
        totalOtherInflows: 0,
    });
  }, [dailyInflowBreakdown]);

  const inflowCategories = useMemo(() => [
    { title: 'Downpayment', amount: totalDownpayment, color: 'hsl(var(--chart-2))' },
    { title: 'Full Payment', amount: totalFullPayment, color: COLORS[0] },
    { title: 'Balance Payment', amount: totalBalancePayment, color: COLORS[2] },
    { title: 'Additional Payment', amount: totalAdditionalPayment, color: COLORS[3] },
    { title: 'Security Deposit', amount: totalSecurityDeposit, color: COLORS[4] },
    { title: 'Other Inflows', amount: totalOtherInflows, color: COLORS[5] },
  ].filter(cat => cat.amount > 0), [totalDownpayment, totalFullPayment, totalBalancePayment, totalAdditionalPayment, totalSecurityDeposit, totalOtherInflows]);

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
        try {
            const day = format(new Date(exp.date), 'MMM-dd');
            if (!dailyTotals[day]) {
                dailyTotals[day] = { Operational: 0, COGS: 0, Capital: 0 };
            }
            dailyTotals[day][exp.type as 'Operational' | 'COGS' | 'Capital'] += exp.amount;
        } catch(e) {}
    });

    return Object.entries(dailyTotals).map(([date, values]) => ({ date, ...values })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [monthlyOpEx, monthlyCogs, monthlyCapEx]);

  const totalExpenseForPeriod = useMemo(() => {
    return expensesOverTime.reduce((sum, day) => sum + day.Operational + day.COGS + day.Capital, 0);
  }, [expensesOverTime]);
  
  const CustomExpenseTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="p-3 bg-card border rounded-lg shadow-lg text-base">
            <p className="font-bold mb-2 text-card-foreground">{label}</p>
            <div className="space-y-1">
              {payload.map((entry: any) => (
                <div key={entry.name} className="flex justify-between items-center gap-4">
                  <span className="flex items-center gap-2" style={{ color: entry.stroke || entry.fill }}>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.stroke || entry.fill }}/>
                      {entry.name}:
                  </span>
                  <span className="font-semibold" style={{ color: entry.stroke || entry.fill }}>
                    {formatCurrency(entry.value as number)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return null;
  };
  
  if (isLoading) {
    return (
        <Header>
            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full lg:col-span-2" />
                 <Skeleton className="h-96 w-full lg:col-span-2" />
            </div>
        </Header>
    );
  }

  return (
    <Header>
      <main className="p-4 sm:p-6 lg:p-8 space-y-8">
        <Card className="p-4">
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

        <Card>
          <CardHeader>
              <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Daily Cash Inflows</CardTitle>
                    <CardDescription>Cash inflows from lead payments and other sources for the selected month.</CardDescription>
                  </div>
                   <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Inflows</p>
                        <p className="text-2xl font-bold">{formatCurrency(totalInflowForPeriod)}</p>
                    </div>
              </div>
          </CardHeader>
          <CardContent>
              <ChartContainer config={{}} className="w-full h-80">
                <ResponsiveContainer>
                    <AreaChart data={dailyCashInflows} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS[3]} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={COLORS[3]} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fill: 'black', fontWeight: 'bold', fontSize: 12, opacity: 1 }} />
                        <YAxis tickFormatter={(value) => formatCurrency(value as number, { notation: 'compact' })}/>
                        <Tooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                        <Legend />
                        <Area type="monotone" dataKey="amount" name="Cash Inflow" stroke={COLORS[3]} strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" dot={{ r: 2 }} activeDot={{ r: 4 }}>
                            <LabelList dataKey="amount" content={renderAmountLabel} />
                        </Area>
                    </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
          </CardContent>
        </Card>
        
        <Card>
           <CardHeader>
              <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Daily Inflows Breakdown</CardTitle>
                    <CardDescription>Breakdown of daily inflows by payment type.</CardDescription>
                  </div>
                   <div className="flex justify-center items-center gap-4 pt-4">
                        {inflowCategories.map(cat => (
                        <DoughnutChartCard 
                            key={cat.title}
                            title={cat.title}
                            amount={cat.amount}
                            percentage={totalInflowForPeriod > 0 ? (cat.amount / totalInflowForPeriod) * 100 : 0}
                            color={cat.color}
                        />
                        ))}
                    </div>
              </div>
          </CardHeader>
          <CardContent>
              <ChartContainer config={{}} className="w-full h-80">
                <ResponsiveContainer>
                    <BarChart data={dailyInflowBreakdown} stackOffset="sign" margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                        <CartesianGrid stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fill: 'black', fontWeight: 'bold', fontSize: 12, opacity: 1 }} />
                        <YAxis tickFormatter={(value) => formatCurrency(value as number, { notation: 'compact' })}/>
                        <Tooltip content={<CustomExpenseTooltip />} />
                        <Legend />
                        <Bar dataKey="Downpayment" stackId="a" name="Downpayment" fill="hsl(var(--chart-2))" />
                        <Bar dataKey="Full Payment" stackId="a" name="Full Payment" fill={COLORS[0]} />
                        <Bar dataKey="Balance Payment" stackId="a" name="Balance Payment" fill={COLORS[2]} />
                        <Bar dataKey="Additional Payment" stackId="a" name="Additional" fill={COLORS[3]} />
                        <Bar dataKey="Security Deposit" stackId="a" name="Security Deposit" fill={COLORS[4]} />
                        <Bar dataKey="Other Inflows" stackId="a" name="Others" fill={COLORS[5]}>
                           <LabelList 
                                dataKey="total" 
                                position="top" 
                                formatter={(value: number) => value > 0 ? formatCurrency(value) : null}
                                className="fill-black font-bold"
                                fontSize={12}
                           />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Expenses Breakdown</CardTitle>
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
                   <BarChart data={opExByCategory} layout="vertical" margin={{ left: 20, top: 20, right: 50, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickFormatter={(value) => formatCurrency(value as number, { notation: 'compact' })} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} interval={0}/>
                        <Tooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                             {opExByCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                            <LabelList dataKey="value" position="right" formatter={(value: number) => formatCurrency(value)} fontSize={12} />
                        </Bar>
                   </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
           <Card className="lg:col-span-2">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Daily Expense Trend</CardTitle>
                        <CardDescription>Total expenses logged per day for the selected month.</CardDescription>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Expenses</p>
                        <p className="text-2xl font-bold">{formatCurrency(totalExpenseForPeriod)}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="w-full h-80">
                  <ResponsiveContainer>
                    <AreaChart data={expensesOverTime} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorOpEx" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={'#8884d8'} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={'#8884d8'} stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorCogs" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={'#82ca9d'} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={'#82ca9d'} stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorCapEx" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={'#ffc658'} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={'#ffc658'} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fill: 'black', fontWeight: 'bold', fontSize: 12, opacity: 1 }} />
                        <YAxis tickFormatter={(value) => formatCurrency(value as number, { notation: 'compact' })}/>
                        <Tooltip content={<CustomExpenseTooltip />} />
                        <Legend />
                        <Area type="monotone" dataKey="Operational" name="OPEX" stroke={'#8884d8'} strokeWidth={2} fillOpacity={1} fill="url(#colorOpEx)" dot={{ r: 2 }} activeDot={{ r: 4 }}>
                           <LabelList dataKey="Operational" content={renderAmountLabel} />
                        </Area>
                        <Area type="monotone" dataKey="COGS" name="COGS" stroke={'#82ca9d'} strokeWidth={2} fillOpacity={1} fill="url(#colorCogs)" dot={{ r: 2 }} activeDot={{ r: 4 }}>
                           <LabelList dataKey="COGS" content={renderAmountLabel} />
                        </Area>
                        <Area type="monotone" dataKey="Capital" name="CAPEX" stroke={'#ffc658'} strokeWidth={2} fillOpacity={1} fill="url(#colorCapEx)" dot={{ r: 2 }} activeDot={{ r: 4 }}>
                           <LabelList dataKey="Capital" content={renderAmountLabel} />
                        </Area>
                    </AreaChart>
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
