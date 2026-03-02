
'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { formatCurrency, cn } from '@/lib/utils';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Bar, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Input } from '@/components/ui/input';
import { DateRange } from 'react-day-picker';
import { eachDayOfInterval, endOfMonth, getMonth, getYear, parseISO } from 'date-fns';
import { z, ZodError } from 'zod';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type Order = {
  quantity: number;
};

const leadSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  salesRepresentative: z.string(),
  submissionDateTime: z.string(),
  grandTotal: z.number().optional(),
  orders: z.array(z.object({
    quantity: z.number(),
    productType: z.string(),
  })),
  layouts: z.array(z.object({
    layoutImage: z.string().nullable().optional(),
  })).optional(),
  paidAmount: z.number().optional(),
  balance: z.number().optional(),
  orderType: z.string().optional(),
  payments: z.array(z.any()).optional(),
  priorityType: z.string(),
});

type Lead = z.infer<typeof leadSchema>;

const chartConfig = {
  amount: {
    label: "Sales Amount",
  },
  quantity: {
    label: "Items Sold",
  },
  layoutCount: {
    label: "Layouts"
  }
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
    const { x, y, width, value, stroke } = props;
    if (value === 0 || typeof x !== 'number' || typeof y !== 'number') return null;
  
    const rectWidth = 80;
    const rectHeight = 18;
    const xPos = width ? x + width / 2 : x;
    
    const rectFill = stroke ? stroke.replace('hsl(', 'hsla(').replace(')', ', 0.2)') : 'hsla(160, 60%, 45%, 0.2)';

    return (
      <g>
        <rect x={xPos - rectWidth / 2} y={y - rectHeight - 5} width={rectWidth} height={rectHeight} fill={rectFill} rx={4} ry={4} />
        <text 
          x={xPos} 
          y={y - rectHeight/2 - 5}
          textAnchor="middle" 
          dominantBaseline="middle" 
          fill="black"
          fontSize={12} 
          fontWeight="bold"
        >
          {formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </text>
      </g>
    );
};


const DoughnutChartCard = ({ title, amount, percentage, color }: { title: string; amount: number; percentage: number; color: string }) => {
    const data = [
        { name: 'value', value: Math.max(0, Math.min(100, percentage)) },
        { name: 'remaining', value: Math.max(0, 100 - Math.max(0, Math.min(100, percentage))) },
    ];
    
    const chartColors = [color, '#e5e7eb'];

    return (
        <Card className="flex flex-col items-center justify-center p-2">
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
                              <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                      </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery, leadSchema, { listen: false });

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

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
        console.warn(`Invalid date format for lead '${lead.id}'`, `'${lead.submissionDateTime}'`);
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

  const ticketData = useMemo(() => {
    if (!filteredLeads) return [];

    const ticketCounts: {
      'Small (1-9)': Set<string>,
      'Medium (10-99)': Set<string>,
      'Large (100-199)': Set<string>,
      'High (200-999)': Set<string>,
      'VIP (1k+)': Set<string>,
    } = {
      'Small (1-9)': new Set(),
      'Medium (10-99)': new Set(),
      'Large (100-199)': new Set(),
      'High (200-999)': new Set(),
      'VIP (1k+)': new Set(),
    };

    filteredLeads.forEach(lead => {
      const totalQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
      
      if (totalQuantity >= 1 && totalQuantity <= 9) {
        ticketCounts['Small (1-9)'].add(lead.customerName.toLowerCase());
      } else if (totalQuantity >= 10 && totalQuantity <= 99) {
        ticketCounts['Medium (10-99)'].add(lead.customerName.toLowerCase());
      } else if (totalQuantity >= 100 && totalQuantity <= 199) {
        ticketCounts['Large (100-199)'].add(lead.customerName.toLowerCase());
      } else if (totalQuantity >= 200 && totalQuantity <= 999) {
        ticketCounts['High (200-999)'].add(lead.customerName.toLowerCase());
      } else if (totalQuantity >= 1000) {
        ticketCounts['VIP (1k+)'].add(lead.customerName.toLowerCase());
      }
    });

    return [
      { category: 'Small (1-9)', customers: ticketCounts['Small (1-9)'].size },
      { category: 'Medium (10-99)', customers: ticketCounts['Medium (10-99)'].size },
      { category: 'Large (100-199)', customers: ticketCounts['Large (100-199)'].size },
      { category: 'High (200-999)', customers: ticketCounts['High (200-999)'].size },
      { category: 'VIP (1k+)', customers: ticketCounts['VIP (1k+)'].size },
    ].filter(item => item.customers > 0);
  }, [filteredLeads]);


  if (isLoading || !isClient) {
      return (
           <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                </div>
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
  const totalSalesPercentage = monthlySalesTarget > 0 && selectedMonth !== 'all' ? (totalSales / monthlySalesTarget) * 100 : 0;

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
            <DoughnutChartCard title="Total Sales" amount={totalSales} percentage={totalSalesPercentage} color="hsl(var(--chart-1))" />
            <DoughnutChartCard title="Total Paid" amount={totalPaid} percentage={totalPaidPercentage} color="hsl(var(--chart-2))" />
            <DoughnutChartCard title="Total Balance" amount={totalBalance} percentage={totalBalancePercentage} color="hsl(var(--chart-3))" />
            <Card className="flex flex-col items-center justify-center p-2">
              <CardHeader className="p-0 mb-2 text-center">
                <CardTitle className="text-base font-medium">Ticket Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0 relative w-full flex-1">
                <ChartContainer config={{}} className="w-full h-full">
                  <ResponsiveContainer>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={ticketData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
                      <Radar name="Customers" dataKey="customers" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                       <Tooltip
                          content={({ payload }) => {
                              if (!payload || payload.length === 0) return null;
                              const { category, customers } = payload[0].payload;
                              const totalCustomers = ticketData.reduce((sum, item) => sum + item.customers, 0);
                              const percentage = totalCustomers > 0 ? (customers / totalCustomers * 100).toFixed(2) : 0;
                              return (
                                  <div className="bg-white p-2 border rounded shadow-lg text-xs">
                                      <p className="font-bold">{category}</p>
                                      <p>Customers: {customers}</p>
                                      <p>Percentage: {percentage}%</p>
                                  </div>
                              );
                          }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="p-2">
                <CardHeader className="p-0 pb-2 text-center">
                    <CardTitle className="text-base font-medium">Priority Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex flex-col gap-4">
                    <PriorityBar percentage={priorityData.Rush.percentage} count={priorityData.Rush.count} label="Rush" color="#ef4444" />
                    <PriorityBar percentage={priorityData.Regular.percentage} count={priorityData.Regular.count} label="Regular" color="#22c55e" />
                </CardContent>
            </Card>
        </div>
      </CardContent>
    </Card>
  );
}
