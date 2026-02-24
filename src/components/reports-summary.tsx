'use client';

import React, {useMemo, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell, PieChart, Pie, Legend, BarChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from './ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { generateReportAction } from '@/app/reports/actions';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { format, parse, getYear, getMonth, parseISO, subDays, startOfDay, endOfDay, endOfMonth, eachDayOfInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { isEqual } from 'lodash';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

const SalesMap = dynamic(
  () => import('./sales-map'),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  }
);

type Order = {
  quantity: number;
  productType: string;
  color: string;
  [key: string]: any;
};

type Lead = {
  id: string;
  customerName: string;
  salesRepresentative: string;
  priorityType: string;
  orders: Order[];
  submissionDateTime: string;
  [key: string]: any;
  grandTotal?: number;
};

type GenerateReportOutput = {
  salesRepData: any[];
  priorityData: { name: string; value: number }[];
  dailySalesData: any[];
  weeklySalesData: any[];
  soldQtyByProductType: any[];
  salesByCityData: { city: string, amount: number, orderCount: number }[];
  totalSales: number;
  availableYears: number[];
  availableWeeks: string[];
};

const chartConfig = {
  quantity: {
    label: 'Quantity',
    color: "hsl(var(--chart-1))",
  },
  customerCount: {
    label: 'Customers',
    color: '#8A2BE2'
  },
  amount: {
    label: "Amount",
    color: "hsl(var(--chart-2))"
  }
};

const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1967',
    '#3498DB', '#2ECC71', '#F1C40F', '#E67E22', '#9B59B6', '#E74C3C',
    '#1ABC9C', '#34495E',
];

const colorMap: { [key: string]: string } = {
    'army green': '#4B5320',
    'black': '#000000',
    'black/gray': '#5A5A5A',
    'black/khaki': '#7C6F62',
    'black/navy blue': '#000040',
    'brown': '#8B4513',
    'dark gray': '#A9A9A9',
    'dark khaki': '#BDB76B',
    'khaki': '#F0E68C',
    'light gray': '#D3D3D3',
    'light khaki': '#F0E68C',
    'maroon/gray': '#800000',
    'navy blue': '#000080',
    'navy blue/gray': '#404080',
    'olive green': '#808000',
    'aqua blue': '#00FFFF',
    'choco brown': '#D2691E',
    'cream': '#FFFDD0',
    'dark green': '#006400',
    'dawn blue': '#A9D1F7',
    'emerald green': '#50C878',
    'estate blue': '#00005D',
    'fair orchid': '#F1DCE7',
    'fuchsia': '#FF00FF',
    'gold': '#FFD700',
    'golden yellow': '#FFDF00',
    'green': '#008000',
    'green briar': '#58A55C',
    'honey mustard': '#E1C62F',
    'irish green': '#009E60',
    'jade green': '#00A86B',
    'light green': '#90EE90',
    'maroon': '#800000',
    'melange gray': '#BEBEBE',
    'military green': '#4B5320',
    'mint green': '#98FF98',
    'mocha': '#967969',
    'nine ion gray': '#A9A9A9',
    'oatmeal': '#EAE0C8',
    'orange': '#FFA500',
    'pink': '#FFC0CB',
    'purple': '#800080',
    'rapture rose': '#DB5573',
    'red': '#FF00FF',
    'royal blue': '#4169E1',
    'sky blue': '#87CEEB',
    'slate blue': '#6A5ACD',
    'teal': '#008080',
    'white': '#F5F5F5',
    'yellow': '#FFFF00',
    'unknown': '#CCCCCC'
};

const getContrastColor = (hex: string) => {
    if (!hex) return 'black';
    if (hex.startsWith('#')) {
      hex = hex.slice(1);
    }
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length !== 6) {
      return 'black';
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 150) ? 'black' : 'white';
};

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
  
const renderQuantityLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    
    if (value === 0 || !height || typeof x !== 'number' || typeof y !== 'number') return null;
  
    return (
      <text x={x + width / 2} y={y + height / 2} fill="white" fontSize={12} textAnchor="middle" dominantBaseline="middle" fontWeight="bold">
        {value}
      </text>
    );
};

export function ReportsSummary() {
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [activeQuickFilter, setActiveQuickFilter] = useState<'today' | 'yesterday' | null>(null);

  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading: isLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery, undefined, {listen: false});
  
  const [reportData, setReportData] = useState<GenerateReportOutput | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);
  
  const [colorProductTypeFilter, setColorProductTypeFilter] = useState<string>('');

  const productTypesForFilter = useMemo(() => {
    if (!leads) return [];
    return Array.from(new Set(leads.flatMap(l => l.orders.map(o => o.productType))))
        .filter(type => type !== 'Client Owned' && type !== 'Patches')
        .sort();
  }, [leads]);
  
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    
    return leads.filter(lead => {
        try {
            const submissionDate = new Date(lead.submissionDateTime);
            let isInDateRange = true;

            if (dateRange?.from) {
                const from = startOfDay(dateRange.from);
                const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
                isInDateRange = submissionDate >= from && submissionDate <= to;
            } else if (selectedWeek) {
                 const [startStr, endStr] = selectedWeek.split('-');
                 const year = parseInt(selectedYear, 10);
                 const weekStart = parse(`${startStr}.${year}`, 'MM.dd.yyyy', new Date());
                 const weekEnd = parse(`${endStr}.${year}`, 'MM.dd.yyyy', new Date());
                 isInDateRange = submissionDate >= startOfDay(weekStart) && submissionDate <= endOfDay(weekEnd);
            }
            else {
                const year = parseInt(selectedYear, 10);
                const month = parseInt(selectedMonth, 10);
                if (selectedYear !== 'all' && getYear(submissionDate) !== year) {
                    return false;
                }
                if (selectedMonth !== 'all' && (getMonth(submissionDate) + 1) !== month) {
                    return false;
                }
            }
            
            return isInDateRange;

        } catch (e) {
            return false;
        }
    });
  }, [leads, selectedYear, selectedMonth, selectedWeek, dateRange]);

  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, fill } = props;
    if (percent === 0) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const contrastColor = getContrastColor(fill);

    return (
        <text
            x={x}
            y={y}
            fill={contrastColor}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12}
            fontWeight="bold"
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
  };

  const itemsSoldPerColor = useMemo(() => {
    if (!filteredLeads || !colorProductTypeFilter) return [];

    const colorCounts = filteredLeads.reduce((acc, lead) => {
        lead.orders.forEach(order => {
            if (order.productType === colorProductTypeFilter) {
                const color = order.color || 'Unknown';
                acc[color] = (acc[color] || 0) + order.quantity;
            }
        });
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(colorCounts).map(([color, quantity], index) => ({
        name: color,
        value: quantity,
        fill: colorMap[color.toLowerCase()] || COLORS[index % COLORS.length]
    })).sort((a,b) => b.value - a.value);
  }, [filteredLeads, colorProductTypeFilter]);


  useEffect(() => {
    if (productTypesForFilter.length > 0 && !colorProductTypeFilter) {
        setColorProductTypeFilter(productTypesForFilter[0]);
    }
  }, [productTypesForFilter, colorProductTypeFilter]);

  const months = useMemo(() => [
      { value: 'all', label: 'All Months' },
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
      const result = await generateReportAction({
        leads,
        selectedYear,
        selectedMonth,
        selectedWeek,
        dateRange: {
            from: dateRange?.from?.toISOString(),
            to: dateRange?.to?.toISOString()
        }
      });
      setReportData(result);
    } catch (e: any) {
      console.error('Failed to generate report:', e);
      setReportError(e.message || 'An unknown error occurred.');
    } finally {
      setIsReportLoading(false);
    }
  }, [leads, selectedYear, selectedMonth, selectedWeek, dateRange]);

  useEffect(() => {
    if (leads && leads.length > 0) {
      processReport();
    } else if (!isLeadsLoading) {
        setIsReportLoading(false);
    }
  }, [leads, processReport, isLeadsLoading]);

    const dailySalesTarget = useMemo(() => {
        if (!leads || !selectedYear || selectedYear === 'all' || !selectedMonth || selectedMonth === 'all') {
            return 0;
        }

        const monthlyQuota = 12000000;
        const year = parseInt(selectedYear, 10);
        const month = parseInt(selectedMonth, 10) - 1; // 0-indexed for Date

        const startOfMonthDate = new Date(year, month, 1);
        const endOfMonthDate = endOfMonth(startOfMonthDate);

        const totalSalesForMonth = leads
            .filter(lead => {
                const submissionDate = new Date(lead.submissionDateTime);
                return getYear(submissionDate) === year && getMonth(submissionDate) === month;
            })
            .reduce((sum, lead) => sum + (lead.grandTotal || 0), 0);

        const remainingSalesNeeded = Math.max(0, monthlyQuota - totalSalesForMonth);

        const today = new Date();
        const isPastMonth = getYear(today) > year || (getYear(today) === year && getMonth(today) > month);
        const isFutureMonth = getYear(today) < year || (getYear(today) === year && getMonth(today) < month);

        if (isPastMonth) {
            return 0;
        }

        const startDateForCounting = isFutureMonth ? startOfMonthDate : (today < startOfMonthDate ? startOfMonthDate : today);

        const remainingDaysInMonth = eachDayOfInterval({
            start: startDateForCounting,
            end: endOfMonthDate,
        });

        const remainingWorkingDays = remainingDaysInMonth.filter(day => day.getDay() !== 0).length; // 0 is Sunday

        if (remainingWorkingDays <= 0) {
            return remainingSalesNeeded > 0 ? remainingSalesNeeded : 0;
        }

        return remainingSalesNeeded / remainingWorkingDays;
    }, [leads, selectedYear, selectedMonth]);


  const {
    salesRepData,
    priorityData,
    dailySalesData,
    weeklySalesData,
    soldQtyByProductType,
    availableYears,
    availableWeeks,
    salesByCityData,
    totalSales,
  } = useMemo(() => {
    if (!reportData) {
      return {
        salesRepData: [],
        priorityData: [],
        dailySalesData: [],
        weeklySalesData: [],
        soldQtyByProductType: [],
        availableYears: [],
        availableWeeks: [],
        salesByCityData: [],
        totalSales: 0,
      };
    }
    return reportData;
  }, [reportData]);

  const salesByRepTitle = useMemo(() => {
    let period;
    if (dateRange?.from) {
      const from = format(dateRange.from, 'MMM dd, yyyy');
      const to = dateRange.to ? format(dateRange.to, 'MMM dd, yyyy') : from;
      period = from === to ? from : `${from} to ${to}`;
    } else if (selectedWeek) {
      const [start, end] = selectedWeek.split('-');
      period = `the week of ${format(parse(start, 'MM.dd', new Date()), 'MMM dd')} - ${format(parse(end, 'MM.dd', new Date()), 'MMM dd')}, ${selectedYear}`;
    } else if (selectedYear === 'all') {
        period = 'All Time';
    } else if (selectedMonth === 'all') {
        period = `the Year ${selectedYear}`;
    } else {
        const monthLabel = months.find(m => m.value === selectedMonth)?.label || '';
        period = `${monthLabel} ${selectedYear}`;
    }
    return `Sales, Customers & Items Sold per Sales Specialist for ${period}`;
  }, [selectedYear, selectedMonth, selectedWeek, dateRange, months]);
  
  const top15Cities = useMemo(() => salesByCityData.slice(0, 15), [salesByCityData]);

  const totalColorQuantity = useMemo(() => 
    itemsSoldPerColor.reduce((sum, item) => sum + item.value, 0) || 0
  , [itemsSoldPerColor]);

    const totalAllItemsSold = useMemo(() =>
    soldQtyByProductType.reduce((sum, item) => sum + item.quantity, 0)
    , [soldQtyByProductType]);

    const percentageOfTotal = useMemo(() =>
        totalAllItemsSold > 0 ? (totalColorQuantity / totalAllItemsSold) * 100 : 0
    , [totalColorQuantity, totalAllItemsSold]);

  const totalWeeklySales = useMemo(() => weeklySalesData.reduce((sum, item) => sum + item.amount, 0), [weeklySalesData]);

  const priorityColors = {
    'Rush': '#800000', // Maroon
    'Regular': '#006400', // Dark Green
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from) {
      setSelectedYear('all');
      setSelectedMonth('all');
      setSelectedWeek('');
      setActiveQuickFilter(null);
    }
  };

  const handleQuickFilter = (filter: 'today' | 'yesterday') => {
    const targetDate = filter === 'today' ? new Date() : subDays(new Date(), 1);
    const newRange = { from: startOfDay(targetDate), to: endOfDay(targetDate) };

    if (activeQuickFilter === filter) {
        setActiveQuickFilter(null);
        setDateRange(undefined);
    } else {
        setActiveQuickFilter(filter);
        setDateRange(newRange);
        setSelectedYear('all');
        setSelectedMonth('all');
        setSelectedWeek('');
    }
  };

  const handleResetFilters = () => {
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedMonth((new Date().getMonth() + 1).toString());
    setSelectedWeek('');
    setDateRange(undefined);
    setActiveQuickFilter(null);
  };
  
  const isLoading = isLeadsLoading || isReportLoading;
  const error = leadsError || reportError;

  const renderLegendText = (value: string) => {
    return <span style={{ color: 'black' }}>{value}</span>;
  };
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[...Array(4)].map((_, i) => (
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
            <div className="flex gap-2 items-center flex-wrap">
                <div className='flex items-center gap-2'>
                    <span className="text-sm font-medium text-card-foreground">Year:</span>
                    <Select value={selectedYear} onValueChange={(value) => { setSelectedYear(value); setDateRange(undefined); setActiveQuickFilter(null); }}>
                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                             <SelectItem value="all">All Years</SelectItem>
                            {availableYears.map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className='flex items-center gap-2'>
                    <span className="text-sm font-medium text-card-foreground">Month:</span>
                    <Select value={selectedMonth} onValueChange={(value) => { setSelectedMonth(value); setDateRange(undefined); setActiveQuickFilter(null); }}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {months.map(month => (
                                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className='flex items-center gap-2'>
                    <span className="text-sm font-medium text-card-foreground">Week:</span>
                    <Select value={selectedWeek} onValueChange={(value) => { setSelectedWeek(value === 'all-weeks' ? '' : value); setDateRange(undefined); setActiveQuickFilter(null); }}>
                        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Select Week" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-weeks">All Weeks</SelectItem>
                            {availableWeeks.map(week => (
                                <SelectItem key={week} value={week}>{week}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className='flex items-center gap-2'>
                    <span className="text-sm font-medium text-card-foreground">From:</span>
                    <Input
                        type="date"
                        value={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
                        onChange={(e) => {
                            const newFromDate = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined;
                            handleDateRangeSelect({ from: newFromDate, to: dateRange?.to });
                        }}
                        className="w-[160px]"
                    />
                     <span className="text-sm font-medium text-card-foreground">To:</span>
                    <Input
                        type="date"
                        value={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
                        onChange={(e) => {
                            const newToDate = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined;
                            handleDateRangeSelect({ from: dateRange?.from, to: newToDate });
                        }}
                        className="w-[160px]"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant={activeQuickFilter === 'yesterday' ? 'default' : 'outline'} onClick={() => handleQuickFilter('yesterday')}>Yesterday</Button>
                    <Button variant={activeQuickFilter === 'today' ? 'default' : 'outline'} onClick={() => handleQuickFilter('today')}>Today</Button>
                </div>
                 <Button onClick={handleResetFilters} variant="ghost" className="bg-teal-600 text-white hover:bg-teal-700">Reset Filters</Button>
            </div>
        </div>
      </div>
       <div className="printable-area space-y-8">
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
          <CardHeader>
              <div className="flex justify-between items-start">
                  <div>
                      <CardTitle>Daily Sales Performance</CardTitle>
                      <CardDescription>Total quantity and amount sold each day for the selected period.</CardDescription>
                  </div>
                   <div className="text-right">
                      <p className="text-sm font-medium text-gray-600">Adjusted Daily Sales Target to hit Monthly Goal</p>
                      <p className="text-2xl font-bold text-destructive">{formatCurrency(dailySalesTarget)}</p>
                  </div>
              </div>
          </CardHeader>
          <CardContent>
              <div style={{ height: '300px' }}>
              <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                      data={dailySalesData}
                      margin={{
                      top: 30, right: 30, left: 20, bottom: 5,
                      }}
                  >
                      <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                      <XAxis dataKey="date" tickFormatter={(value) => format(parse(value, 'MMM-dd-yyyy', new Date()), 'MMM dd')} tick={{ fill: 'black', fontWeight: 'bold', fontSize: 12, opacity: 1 }} />
                      <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" tick={{ fill: 'hsl(var(--foreground))' }} />
                      <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" tickFormatter={(value) => `₱${Number(value) / 1000}k`} tick={{ fill: 'hsl(var(--foreground))' }} />
                      <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      content={<ChartTooltipContent formatter={(value, name) => {
                          if (name === "Amount") return formatCurrency(value as number);
                          return value.toLocaleString();
                      }} />}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="quantity" name="Quantity" radius={[4, 4, 0, 0]} fill="hsl(var(--chart-1))">
                        <LabelList dataKey="quantity" content={renderQuantityLabel} />
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="amount" name="Amount" stroke="hsl(var(--chart-2))" strokeWidth={2}>
                        <LabelList content={(props) => renderAmountLabel(props)} dataKey="amount" />
                      </Line>
                  </ComposedChart>
                  </ResponsiveContainer>
              </ChartContainer>
              </div>
          </CardContent>
        </Card>
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
          <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Weekly Sales Performance</CardTitle>
                    <CardDescription>Total quantity and amount sold each week for the selected period.</CardDescription>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalWeeklySales)}</p>
                </div>
            </div>
          </CardHeader>
          <CardContent>
              <div style={{ height: '300px' }}>
              <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                      data={weeklySalesData}
                      margin={{
                      top: 30, right: 30, left: 20, bottom: 5,
                      }}
                  >
                      <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                      <XAxis dataKey="week" tick={{ fill: 'black', fontWeight: 'bold', fontSize: 12, opacity: 1 }} />
                      <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-4))" tick={{ fill: 'hsl(var(--foreground))' }} />
                      <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-5))" tickFormatter={(value) => `₱${Number(value) / 1000}k`} tick={{ fill: 'hsl(var(--foreground))' }} />
                      <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      content={<ChartTooltipContent formatter={(value, name) => {
                          if (name === "Amount") return formatCurrency(value as number);
                          return value.toLocaleString();
                      }} />}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="quantity" name="Quantity" radius={[4, 4, 0, 0]} fill={'hsl(27, 85%, 50%)'}>
                      <LabelList dataKey="quantity" content={renderQuantityLabel} />
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="amount" name="Amount" stroke="hsl(var(--chart-5))" strokeWidth={2}>
                      <LabelList content={(props) => renderAmountLabel(props)} dataKey="amount" />
                      </Line>
                  </ComposedChart>
                  </ResponsiveContainer>
              </ChartContainer>
              </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground flex flex-col">
              <CardHeader>
                  <CardTitle>Quantity Sold vs Customer Count</CardTitle>
                  <CardDescription>{salesByRepTitle}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="flex-1 h-[250px] -mt-4">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesRepData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fill: 'hsl(var(--foreground))' }} />
                          <YAxis yAxisId="left" orientation="left" stroke={chartConfig.quantity.color} tick={{ fill: 'hsl(var(--foreground))' }} />
                          <YAxis yAxisId="right" orientation="right" stroke={chartConfig.customerCount.color} tick={{ fill: 'hsl(var(--foreground))' }} />
                          <Tooltip
                          cursor={{ fill: 'hsl(var(--muted))' }}
                          content={<ChartTooltipContent />}
                          />
                          
                          <Bar yAxisId="left" dataKey="quantity" name="Quantity" radius={[4, 4, 0, 0]}>
                          {salesRepData.map((entry, index) => (
                              <Cell key={`cell-qty-${index}`} fill={chartConfig.quantity.color} />
                          ))}
                          <LabelList dataKey="quantity" position="top" fill={chartConfig.quantity.color} fontSize={12} />
                          </Bar>
                          <Bar yAxisId="right" dataKey="customerCount" name="Customers" radius={[4, 4, 0, 0]}>
                          {salesRepData.map((entry, index) => (
                              <Cell key={`cell-cust-${index}`} fill={chartConfig.customerCount.color} />
                          ))}
                          <LabelList dataKey="customerCount" position="top" fill={chartConfig.customerCount.color} fontSize={12} />
                          </Bar>
                      </BarChart>
                      </ResponsiveContainer>
                  </ChartContainer>
                  </div>
                  <div className="mt-auto mx-4">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead className="text-xs p-1 text-center align-middle">SCES</TableHead>
                          <TableHead className="text-xs p-1 text-center align-middle">Quantity</TableHead>
                          <TableHead className="text-xs p-1 text-center align-middle">Customers</TableHead>
                          <TableHead className="text-xs p-1 text-center align-middle">Sales Amount</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {salesRepData.filter(item => item.amount > 0).map((item, index) => (
                          <TableRow key={index}>
                          <TableCell className="font-medium text-xs p-1 text-center align-middle">
                              {item.name}
                          </TableCell>
                          <TableCell className="text-xs p-1 text-center align-middle">{item.quantity}</TableCell>
                          <TableCell className="text-xs p-1 text-center align-middle">{item.customerCount}</TableCell>
                          <TableCell className="text-xs p-1 text-center align-middle">{formatCurrency(item.amount)}</TableCell>
                          </TableRow>
                      ))}
                      </TableBody>
                  </Table>
                  </div>
              </CardContent>
            </Card>
            <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground flex flex-col">
              <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Item Sold per Color</CardTitle>
                        <CardDescription>Total quantity of items sold for each color of a selected product.</CardDescription>
                    </div>
                    <Select value={colorProductTypeFilter} onValueChange={setColorProductTypeFilter}>
                        <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Select Product Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {productTypesForFilter.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="flex-1 h-[250px] relative">
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -mt-4">
                        <p className="text-xs font-medium text-muted-foreground">Sold QTY</p>
                        <p className="text-2xl font-bold">{totalColorQuantity.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                            ({percentageOfTotal.toFixed(2)}% of total)
                        </p>
                    </div>
                  <ChartContainer config={chartConfig} className="w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Tooltip content={<ChartTooltipContent nameKey="value" />} />
                          <Pie
                          data={itemsSoldPerColor}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius="50%"
                          outerRadius="70%"
                          labelLine={false}
                          label={renderCustomizedLabel}
                          >
                          {itemsSoldPerColor.map((entry) => {
                              return <Cell key={`cell-${entry.name}`} fill={entry.fill} />;
                          })}
                          </Pie>
                          <Legend verticalAlign="bottom" height={36} formatter={renderLegendText}/>
                      </PieChart>
                      </ResponsiveContainer>
                  </ChartContainer>
                  </div>
                  <div className="mt-auto mx-4">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead className="text-xs p-1">Color</TableHead>
                          <TableHead className="text-right text-xs p-1">Quantity</TableHead>
                          <TableHead className="text-right text-xs p-1">Percentage</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {itemsSoldPerColor.map((item, index) => {
                          const color = colorMap[item.name.toLowerCase()] || COLORS[index % COLORS.length];
                          return (
                          <TableRow key={index}>
                              <TableCell className="font-medium flex items-center text-xs p-1">
                              <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: color }}></span>
                              {item.name}
                              </TableCell>
                              <TableCell className="text-right text-xs p-1">{item.value}</TableCell>
                              <TableCell className="text-right text-xs p-1">
                              {totalColorQuantity > 0 ? `${((item.value / totalColorQuantity) * 100).toFixed(2)}%` : '0.00%'}
                              </TableCell>
                          </TableRow>
                          );
                      })}
                      </TableBody>
                  </Table>
                  </div>
              </CardContent>
            </Card>
        </div>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sold Quantity based on Product Type</CardTitle>
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
                    <Bar dataKey="quantity" radius={[0, 4, 0, 0]}>
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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Total Sales Amount by City/Municipality</CardTitle>
            <CardDescription>Top performing locations for the selected period.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            <div className="md:col-span-2 rounded-lg overflow-hidden border">
              <SalesMap salesByCityData={salesByCityData} totalSales={totalSales} />
            </div>
            <div className="md:col-span-1 border rounded-md">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="text-center align-middle">City</TableHead>
                    <TableHead className="text-center align-middle">Sales</TableHead>
                    <TableHead className="text-center align-middle">Contribution</TableHead>
                    <TableHead className="text-center align-middle">Orders</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {top15Cities.length > 0 ? (
                    top15Cities.map((cityData) => (
                        <TableRow key={cityData.city}>
                        <TableCell className="font-medium text-center align-middle">{cityData.city}</TableCell>
                        <TableCell className="text-center align-middle">
                            {formatCurrency(cityData.amount)}
                        </TableCell>
                        <TableCell className="text-center align-middle font-bold">
                            {totalSales > 0 ? `${((cityData.amount / totalSales) * 100).toFixed(2)}%` : '0.00%'}
                        </TableCell>
                        <TableCell className="text-center align-middle">{cityData.orderCount}</TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No sales data for cities.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
