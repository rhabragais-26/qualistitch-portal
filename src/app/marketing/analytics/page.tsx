
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

type Lead = {
  id: string;
  submissionDateTime: string;
  grandTotal?: number;
};

const chartConfig = {
  adsSpent: {
    label: 'Ad Spent',
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
                    {entry.name === 'adsSpent' ? 'Ad Spent' : entry.name}:
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
  const { data: adSpendData, isLoading: adSpendLoading, error: adSpendError } = useCollection<AdSpendInquiry>(adSpendQuery);
  
  const leadsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'leads')) : null),
    [firestore]
  );
  const { data: leadsData, isLoading: leadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery);
  
  const isLoading = adSpendLoading || leadsLoading;
  const error = adSpendError || leadsError;


  const renderLineLabel = (props: any) => {
    const { x, y, value, stroke } = props;
    if (value === 0 || typeof x !== 'number' || typeof y !== 'number') return null;

    return (
        <text x={x} y={y} dy={-8} fill={stroke} fontSize={12} fontWeight="bold" textAnchor="middle">
            {formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </text>
    );
  };

  const CustomAdSpendTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="p-3 bg-card border rounded-lg shadow-lg text-base">
            <p className="font-bold mb-2 text-card-foreground">{label}</p>
            <div className="space-y-1">
              {payload.map((entry: any) => {
                  if (entry.value === 0 && entry.dataKey !== 'totalSales') return null;
                  return (
                      <div key={entry.name} className="flex justify-between items-center gap-4">
                          <span className="flex items-center gap-2" style={{ color: entry.stroke || entry.fill }}>
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.stroke || entry.fill }}/>
                              {entry.name}:
                          </span>
                          <span className="font-semibold" style={{ color: entry.stroke || entry.fill }}>
                          {formatCurrency(entry.value as number, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                          })}
                          </span>
                      </div>
                  )
              })}
            </div>
          </div>
        );
      }
      return null;
  };


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

  const { adSpendByAccountData, totalAdSpent, totalSales } = useMemo(() => {
    if (!adSpendData || !leadsData) return { adSpendByAccountData: [], totalAdSpent: 0, totalSales: 0 };

    const year = parseInt(selectedYear, 10);
    const month = parseInt(selectedMonth, 10) - 1;
    if (isNaN(year) || isNaN(month)) return { adSpendByAccountData: [], totalAdSpent: 0, totalSales: 0 };

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

    const dataByDate: Record<string, Record<string, number> & { totalSales: number }> = {};
    
    daysInRange.forEach(day => {
        const dayKey = format(day, 'MMM-dd');
        dataByDate[dayKey] = { totalSales: 0 };
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
    
    leadsData.forEach(lead => {
        const itemDate = new Date(lead.submissionDateTime);
        if (getYear(itemDate) === year && getMonth(itemDate) === month) {
            const day = format(itemDate, 'MMM-dd');
            if (dataByDate[day]) {
                dataByDate[day].totalSales += lead.grandTotal || 0;
            }
        }
    });

    const finalData = Object.entries(dataByDate)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a,b) => parse(a.date, 'MMM-dd', new Date()).getTime() - parse(b.date, 'MMM-dd', new Date()).getTime());

    const periodTotalAdSpent = finalData.reduce((sum, day) => {
        return sum + sanitizedAccountNames.reduce((daySum, accName) => daySum + (day[accName] || 0), 0);
    }, 0);

    const periodTotalSales = finalData.reduce((sum, day) => sum + day.totalSales, 0);
    
    return { adSpendByAccountData: finalData, totalAdSpent: periodTotalAdSpent, totalSales: periodTotalSales };
        
  }, [adSpendData, leadsData, selectedYear, selectedMonth]);
  
  const roasPercentage = totalAdSpent > 0 ? (totalSales / totalAdSpent) * 100 : 0;
  
  const adAccountChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    const colorAssignments: Record<string, string> = {
        'AD Account 101': '#0088FE',
        'Personal Account': '#00C49F',
    };
    let otherColorIndex = 2;

    const accountNames = Array.from(adAccountNameMap.keys());

    accountNames.forEach(originalName => {
      const sanitizedName = adAccountNameMap.get(originalName)!;
      config[sanitizedName] = {
        label: originalName,
        color: colorAssignments[originalName] || COLORS[otherColorIndex++ % COLORS.length]
      };
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
                    <CardDescription>Ad Spent vs. Cost Per Message (CPM) for the selected period.</CardDescription>
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
                    <Line dataKey="adsSpent" type="monotone" yAxisId="left" stroke={chartConfig.adsSpent.color} name="Ad Spent" strokeWidth={2}>
                        <LabelList dataKey="adsSpent" content={renderAmountLabel} />
                    </Line>
                    </ComposedChart>
                </ResponsiveContainer>
                </ChartContainer>
            </div>
            <div>
              <div className="flex justify-between items-start mb-2">
                <div>
                    <CardTitle className="text-lg">Ads Spent per Ad Account</CardTitle>
                    <CardDescription>Daily ad spend broken down by account.</CardDescription>
                </div>
                <div className="flex items-center justify-end gap-8">
                    <div className="flex flex-col items-center">
                        <p className="text-sm font-medium text-muted-foreground">ROAs percentage</p>
                        <p className="text-2xl font-bold">{roasPercentage.toFixed(2)}%</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-sm font-medium text-muted-foreground">Total Ad Spent</p>
                        <p className="text-2xl font-bold">{formatCurrency(totalAdSpent)}</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSales)}</p>
                    </div>
                </div>
              </div>
               <div className="h-[260px] mt-4">
                 <ChartContainer config={adAccountChartConfig} className="w-full h-full">
                  <ResponsiveContainer>
                      <ComposedChart data={adSpendByAccountData}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval={0} />
                          <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-2))" tickFormatter={(value) => formatCurrency(value, { notation: 'compact' })} domain={[0, dataMax => Math.round(dataMax * 1.1)]} />
                          <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-3))" tickFormatter={(value) => formatCurrency(value, { notation: 'compact' })} domain={[0, dataMax => Math.round(dataMax * 1.1)]} />
                          <Tooltip
                              cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                              content={<CustomAdSpendTooltip />}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                          <Bar yAxisId="right" dataKey="totalSales" name="Total Sales" fill="hsl(var(--chart-3))" fillOpacity={0.7} barSize={20}>
                              <LabelList dataKey="totalSales" content={renderAmountLabel} />
                          </Bar>
                          {Object.entries(adAccountChartConfig).map(([sanitizedName, config]) => (
                              <Line
                                  key={sanitizedName}
                                  yAxisId="left"
                                  type="monotone"
                                  dataKey={sanitizedName}
                                  name={config.label as string}
                                  stroke={`var(--color-${sanitizedName})`}
                                  strokeWidth={2}
                              >
                                <LabelList content={(props) => renderLineLabel({...props, stroke: config.color })} />
                              </Line>
                          ))}
                      </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
               </div>
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

