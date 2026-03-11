

'use client';

import React, { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  LineChart,
  BarChart,
  Cell,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { format, getYear, getMonth, startOfMonth, endOfMonth, eachDayOfInterval, parse, isBefore, endOfToday } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Header } from '@/components/header';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Separator } from '@/components/ui/separator';
import { anniversaryData } from '@/lib/anniversaries-data';

type AdSpendInquiry = {
  id: string;
  date: string; // ISO string
  adsSpent: number;
  metaInquiries: number;
  adAccount: string;
};

const chartConfig = {
  adsSpent: {
    label: 'Ads Spent',
    color: 'hsl(var(--chart-1))',
  },
  cpm: {
    label: 'CPM',
    color: 'hsl(180, 80%, 40%)',
  },
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1967', '#3498DB', '#2ECC71', '#F1C40F', '#E67E22', '#9B59B6', '#E74C3C'];

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

const sanitizeKey = (key: string) => {
  return key.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
}

const CustomTooltip = ({ active, payload, label }: any) => {
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
                  {formatCurrency(entry.value as number, {
                      minimumFractionDigits: entry.dataKey === 'cpm' ? 2 : 0,
                      maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

export default function AnalyticsPage() {
  const firestore = useFirestore();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());

  const adSpendQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'ad_spend_inquiries')) : null),
    [firestore]
  );
  const { data: adSpendData, isLoading, error } = useCollection<AdSpendInquiry>(adSpendQuery);

  const { availableYears, months } = useMemo(() => {
    if (!adSpendData) {
        const currentYear = new Date().getFullYear();
        return {
            availableYears: [currentYear.toString()],
            months: Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: format(new Date(2000, i), 'MMMM') }))
        };
    }
    const yearsSet = new Set(adSpendData.map(d => getYear(new Date(d.date))));
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a).map(String);

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
      value: (i + 1).toString(),
      label: format(new Date(2000, i), 'MMMM')
    }));

    return { availableYears: sortedYears, months: monthOptions };
  }, [adSpendData]);
  
  const filteredData = useMemo(() => {
    if (!adSpendData) return [];
    
    const year = parseInt(selectedYear, 10);
    const month = parseInt(selectedMonth, 10) -1;

    const dailyData: Record<string, { adsSpent: number; metaInquiries: number }> = {};
    
    adSpendData.forEach(item => {
        const itemDate = new Date(item.date);
        if (getYear(itemDate) === year && getMonth(itemDate) === month) {
            const day = format(itemDate, 'MMM-dd');
            if(!dailyData[day]) {
                dailyData[day] = { adsSpent: 0, metaInquiries: 0 };
            }
            dailyData[day].adsSpent += item.adsSpent;
            dailyData[day].metaInquiries += item.metaInquiries;
        }
    });
    
    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      adsSpent: data.adsSpent,
      cpm: data.metaInquiries > 0 ? data.adsSpent / data.metaInquiries : 0,
    })).sort((a,b) => parse(a.date, 'MMM-dd', new Date()).getTime() - parse(b.date, 'MMM-dd', new Date()).getTime());

  }, [adSpendData, selectedYear, selectedMonth]);

  const adAccountNameMap = useMemo(() => {
    if (!adSpendData) return new Map();
    const map = new Map<string, string>();
    adSpendData.forEach(d => {
      if (!map.has(d.adAccount)) {
        map.set(d.adAccount, sanitizeKey(d.adAccount));
      }
    });
    return map;
  }, [adSpendData]);

  const adSpendByAccountData = useMemo(() => {
    if (!adSpendData) return [];

    const year = parseInt(selectedYear, 10);
    const month = parseInt(selectedMonth, 10) - 1;
    if (isNaN(year) || isNaN(month)) return [];

    const start = startOfMonth(new Date(year, month));
    const today = endOfToday();
    const monthEnd = endOfMonth(start);

    const end = isBefore(monthEnd, today) ? monthEnd : today;
    
    const daysInRange = eachDayOfInterval({ start, end });

    const sanitizedAccountNames = Array.from(new Set(
        adSpendData
            .filter(item => {
                const itemDate = new Date(item.date);
                return getYear(itemDate) === year && getMonth(itemDate) === month;
            })
            .map(item => sanitizeKey(item.adAccount))
    ));

    const dataByDate: Record<string, Record<string, number>> = {};
    
    daysInRange.forEach(day => {
        const dayKey = format(day, 'MMM-dd');
        dataByDate[dayKey] = {};
        sanitizedAccountNames.forEach(accountName => {
            dataByDate[dayKey][accountName] = 0;
        });
    });

    adSpendData.forEach(item => {
        const itemDate = new Date(item.date);
        if (getYear(itemDate) === year && getMonth(itemDate) === month) {
            const day = format(itemDate, 'MMM-dd');
            if (dataByDate[day]) {
                const sanitizedAccount = sanitizeKey(item.adAccount);
                if (dataByDate[day].hasOwnProperty(sanitizedAccount)) {
                    dataByDate[day][sanitizedAccount] += item.adsSpent;
                }
            }
        }
    });

    return Object.entries(dataByDate)
        .map(([date, accounts]) => ({ date, ...accounts }))
        .sort((a,b) => parse(a.date, 'MMM-dd', new Date()).getTime() - parse(b.date, 'MMM-dd', new Date()).getTime());
        
  }, [adSpendData, selectedYear, selectedMonth]);
  
  const adAccountChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    let index = 0;
    adAccountNameMap.forEach((sanitizedName, originalName) => {
        config[sanitizedName] = {
            label: originalName,
            color: COLORS[index % COLORS.length]
        };
        index++;
    });
    return config;
  }, [adAccountNameMap]);
  
  const { monthlyAnniversaryData } = useMemo(() => {
    const dataByMonth: Record<string, { total: number }> = {
        'Jan': { total: 0 }, 'Feb': { total: 0 }, 'Mar': { total: 0 }, 'Apr': { total: 0 }, 'May': { total: 0 }, 'Jun': { total: 0 },
        'Jul': { total: 0 }, 'Aug': { total: 0 }, 'Sep': { total: 0 }, 'Oct': { total: 0 }, 'Nov': { total: 0 }, 'Dec': { total: 0 }
    };
    
    anniversaryData.forEach(org => {
        try {
            const date = new Date(org.dateFounded);
            const month = format(date, 'MMM');
            if (dataByMonth[month]) {
                dataByMonth[month].total++;
            }
        } catch (e) {
            // ignore invalid dates
        }
    });

    const chartData = Object.entries(dataByMonth).map(([month, data]) => ({
        month,
        total: data.total
    }));

    return { monthlyAnniversaryData: chartData };
  }, []);
  
  const totalAdSpend = useMemo(() => {
    if (!filteredData) return 0;
    return filteredData.reduce((sum, item) => sum + item.adsSpent, 0);
  }, [filteredData]);

  if (isLoading) {
    return (
      <Header>
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          <Skeleton className="h-[300px] w-full" />
        </main>
      </Header>
    );
  }

  if (error) {
    return <div className="text-destructive text-center p-4">Error loading analytics data: {error.message}</div>;
  }

  return (
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-8">
        <Card>
          <CardHeader>
             <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Daily Ad Performance</CardTitle>
                    <CardDescription>Ads Spent vs. Cost Per Message (CPM) for the selected period.</CardDescription>
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
                            {months.map(month => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
             </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="h-[250px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer>
                    <ComposedChart data={filteredData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis yAxisId="left" stroke={chartConfig.adsSpent.color} tickFormatter={(value) => formatCurrency(value, { notation: 'compact' })} domain={[0, (dataMax: number) => Math.round(dataMax * 1.2)]} />
                    <YAxis yAxisId="right" orientation="right" stroke={chartConfig.cpm.color} tickFormatter={(value) => formatCurrency(value)} domain={[0, (dataMax: number) => Math.round(dataMax * 1.2)]} />
                    <Tooltip
                        cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                        content={<CustomTooltip />}
                      />
                    <Legend />
                    <Bar dataKey="cpm" yAxisId="right" fill="var(--color-cpm)" name="CPM" radius={[4, 4, 0, 0]}>
                        <LabelList
                        dataKey="cpm"
                        position="center"
                        fill="#004d4d"
                        formatter={(value: number) => value > 0 ? formatCurrency(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                        fontSize={12}
                        fontWeight="bold"
                        />
                    </Bar>
                    <Line dataKey="adsSpent" type="monotone" yAxisId="left" stroke={chartConfig.adsSpent.color} name="Ads Spent" strokeWidth={2}>
                        <LabelList dataKey="adsSpent" content={renderAmountLabel} />
                    </Line>
                    </ComposedChart>
                </ResponsiveContainer>
                </ChartContainer>
            </div>
            <div className="h-[300px]">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <CardTitle className="text-lg">Ads Spent per Ad Account</CardTitle>
                  <CardDescription>Daily ad spend broken down by account.</CardDescription>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">Total Ad Spend</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalAdSpend)}</p>
                </div>
              </div>
               <ChartContainer config={adAccountChartConfig} className="w-full h-[calc(100%-40px)]">
                <ResponsiveContainer>
                    <LineChart data={adSpendByAccountData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval={0} />
                        <YAxis tickFormatter={(value) => formatCurrency(value, { notation: 'compact' })} domain={[0, dataMax => Math.round(dataMax * 1.25)]} />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                            content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                        />
                        <Legend />
                        {Object.entries(adAccountChartConfig).map(([sanitizedName, config]) => (
                            <Line
                                key={sanitizedName}
                                type="monotone"
                                dataKey={sanitizedName}
                                name={config.label as string}
                                stroke={`var(--color-${sanitizedName})`}
                                strokeWidth={2}
                            >
                              <LabelList content={renderAmountLabel} />
                            </Line>
                        ))}
                    </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Founding Anniversaries per Month</CardTitle>
                <CardDescription>
                    Total count of organization anniversaries per month.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                  <ChartContainer config={{}} className="w-full h-full">
                    <ResponsiveContainer>
                        <BarChart data={monthlyAnniversaryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                            <XAxis dataKey="month" />
                            <YAxis allowDecimals={false} />
                            <Tooltip content={<ChartTooltipContent formatter={(value) => `${value} organizations`} />} />
                            <Bar dataKey="total" name="Organizations">
                                {monthlyAnniversaryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                                <LabelList dataKey="total" position="top" className="fill-black font-bold" fontSize={12} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
            </CardContent>
        </Card>
      </main>
    </Header>
  );
}

