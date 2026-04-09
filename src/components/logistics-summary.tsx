
'use client';

import React, { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, LabelList, ComposedChart, Line, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { formatCurrency } from '@/lib/utils';
import { format, startOfDay, endOfDay, subDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, getYear, getMonth, differenceInDays } from 'date-fns';

type Lead = {
  isEndorsedToLogistics?: boolean;
  isQualityApproved?: boolean;
  isSalesAuditRequested?: boolean;
  isSalesAuditComplete?: boolean;
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  orders: { quantity: number }[];
  deliveryDate?: string;
  adjustedDeliveryDate?: string;
  submissionDateTime: string;
  priorityType: 'Rush' | 'Regular';
  shippedTimestamp?: string;
  deliveredTimestamp?: string;
};

const chartConfig = {
  count: {
    label: 'Count',
  },
};

const COLORS = {
  awaitingQualityCheck: 'hsl(var(--chart-1))',
  awaitingSalesAudit: 'hsl(var(--chart-2))',
  shipped: 'hsl(var(--chart-4))',
  delivered: 'hsl(var(--chart-5))',
};

const DoughnutChartCard = React.memo(function DoughnutChartCard({ data, title, total }: { data: { name: string; value: number; fill: string }[], title: string, total: number }) {
    const value = data.length > 0 ? data[0].value : 0;
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const chartData = [
        { name: title, value: value },
        { name: 'other', value: Math.max(0, total - value) },
    ];
    const chartColors = [data.length > 0 ? data[0].fill : '#ccc', '#e5e7eb'];

    return (
        <Card className="flex flex-col items-center justify-start p-4 text-center border">
            <CardHeader className="p-0 mb-2">
                <CardTitle className="text-lg font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 relative w-36 h-36">
                {value > 0 ? (
                    <ChartContainer config={{}} className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Tooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value, name) => (<div className="flex flex-col"> <span className="font-bold">{name === 'other' ? 'Other' : title}</span> <span>{value} orders</span> </div>)} />} />
                                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" stroke="none" startAngle={90} endAngle={450}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={chartColors[index]} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">No data</div>
                )}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold">{value}</span>
                </div>
            </CardContent>
            <div className="mt-2 text-center">
                 <span className="text-sm font-bold">{percentage.toFixed(1)}%</span>
                 <p className="text-xs text-muted-foreground">of {total} total</p>
            </div>
        </Card>
    )
});
DoughnutChartCard.displayName = 'DoughnutChartCard';


const LogisticsSummaryMemo = React.memo(function LogisticsSummary() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'leads')) : null), [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

  const [deliveryFilterType, setDeliveryFilterType] = useState<'range' | 'month'>('range');
  const [deliveryTimeRange, setDeliveryTimeRange] = useState('30d');
  const [deliveryMonth, setDeliveryMonth] = useState((new Date().getMonth() + 1).toString());
  const [deliveryYear, setDeliveryYear] = useState(new Date().getFullYear().toString());

  const summaryData = useMemo(() => {
    if (!leads) return { awaitingQualityCheck: 0, totalForQualityCheck: 0, awaitingSalesAudit: 0, totalForSalesAudit: 0, shippedItems: 0, deliveredItems: 0, totalShippedAndDelivered: 0 };
    
    const totalForQualityCheck = leads.filter(
        lead => lead.isEndorsedToLogistics
    ).length;

    const awaitingQualityCheck = leads.filter(
        lead => lead.isEndorsedToLogistics && !lead.isQualityApproved
    ).length;

    const totalForSalesAudit = leads.filter(
        lead => lead.isSalesAuditRequested || lead.isSalesAuditComplete
    ).length;

    const awaitingSalesAudit = leads.filter(
        lead => lead.isSalesAuditRequested && !lead.isSalesAuditComplete
    ).length;

    const calculateTotalQuantity = (filteredLeads: Lead[]): number => {
        return filteredLeads.reduce((sum, lead) => {
            const orderQuantity = lead.orders?.reduce((orderSum, order) => orderSum + order.quantity, 0) || 0;
            return sum + orderQuantity;
        }, 0);
    };

    const shippedLeads = leads.filter(lead => lead.shipmentStatus === 'Shipped');
    const deliveredLeads = leads.filter(lead => lead.shipmentStatus === 'Delivered');

    const shippedItems = calculateTotalQuantity(shippedLeads);
    const deliveredItems = calculateTotalQuantity(deliveredLeads);
    
    const totalShippedAndDelivered = shippedItems + deliveredItems;

    return { awaitingQualityCheck, totalForQualityCheck, awaitingSalesAudit, totalForSalesAudit, shippedItems, deliveredItems, totalShippedAndDelivered };
  }, [leads]);
  
  const { awaitingQualityCheck, totalForQualityCheck, awaitingSalesAudit, totalForSalesAudit, shippedItems, deliveredItems, totalShippedAndDelivered } = summaryData;
  const qualityCheckData = [{ name: 'Awaiting Quality Check', value: awaitingQualityCheck, fill: COLORS.awaitingQualityCheck }];
  const salesAuditData = [{ name: 'Awaiting Sales Audit', value: awaitingSalesAudit, fill: COLORS.awaitingSalesAudit }];
  const shippedData = [{ name: 'Shipped Items', value: shippedItems, fill: COLORS.shipped }];
  const deliveredData = [{ name: 'Delivered Items', value: deliveredItems, fill: COLORS.delivered }];
  
  const { availableYears, monthOptions } = useMemo(() => {
    if (!leads) {
        const currentYear = new Date().getFullYear();
        return {
            availableYears: [currentYear.toString()],
            monthOptions: Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: format(new Date(2000, i), 'MMMM') }))
        };
    }
    const yearsSet = new Set(leads.map(l => getYear(new Date(l.submissionDateTime))));
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a).map(String);

    const months = Array.from({ length: 12 }, (_, i) => ({
      value: (i + 1).toString(),
      label: format(new Date(2000, i), 'MMMM')
    }));

    return { availableYears: sortedYears, monthOptions: months };
  }, [leads]);

  const deliveryScheduleData = useMemo(() => {
    if (!leads) return [];

    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    if (deliveryFilterType === 'range') {
        if (deliveryTimeRange === '7d') {
          startDate = startOfDay(subDays(now, 6));
          endDate = endOfDay(now);
        } else if (deliveryTimeRange === '14d') {
          startDate = startOfDay(subDays(now, 13));
          endDate = endOfDay(now);
        } else { // 30d
          startDate = startOfDay(subDays(now, 29));
          endDate = endOfDay(now);
        }
    } else { // month filter
        const year = parseInt(deliveryYear, 10);
        const month = parseInt(deliveryMonth, 10) - 1;
        startDate = startOfMonth(new Date(year, month));
        endDate = endOfMonth(startDate);
    }
    
    const dailyQuantities: { [date: string]: number } = {};

    leads.forEach(lead => {
        let deliveryDate: Date | null = null;
        if (lead.adjustedDeliveryDate) {
            deliveryDate = new Date(lead.adjustedDeliveryDate);
        } else if (lead.deliveryDate) {
            deliveryDate = new Date(lead.deliveryDate);
        } else {
            const deadlineDays = lead.priorityType === 'Rush' ? 7 : 22;
            deliveryDate = addDays(new Date(lead.submissionDateTime), deadlineDays);
        }

        if (deliveryDate >= startDate && deliveryDate <= endDate) {
            const dateStr = format(deliveryDate, 'yyyy-MM-dd');
            const totalQuantity = lead.orders?.reduce((sum, order) => sum + order.quantity, 0) || 0;
            dailyQuantities[dateStr] = (dailyQuantities[dateStr] || 0) + totalQuantity;
        }
    });

    const allDaysInRange = eachDayOfInterval({ start: startDate, end: endDate });
    return allDaysInRange.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return {
        date: format(day, 'MMM dd'),
        quantity: dailyQuantities[dateStr] || 0,
      };
    });
  }, [leads, deliveryFilterType, deliveryTimeRange, deliveryMonth, deliveryYear]);

  const dailyShippedData = useMemo(() => {
    if (!leads) return [];

    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    if (deliveryFilterType === 'range') {
        if (deliveryTimeRange === '7d') {
          startDate = startOfDay(subDays(now, 6));
          endDate = endOfDay(now);
        } else if (deliveryTimeRange === '14d') {
          startDate = startOfDay(subDays(now, 13));
          endDate = endOfDay(now);
        } else { // 30d
          startDate = startOfDay(subDays(now, 29));
          endDate = endOfDay(now);
        }
    } else { // month filter
        const year = parseInt(deliveryYear, 10);
        const month = parseInt(deliveryMonth, 10) - 1;
        startDate = startOfMonth(new Date(year, month));
        endDate = endOfMonth(startDate);
    }
    
    const dailyQuantities: { [date: string]: number } = {};

    leads.forEach(lead => {
        if (lead.shipmentStatus === 'Shipped' && lead.shippedTimestamp) {
            try {
                const shippedDate = new Date(lead.shippedTimestamp);
                if (shippedDate >= startDate && shippedDate <= endDate) {
                    const dateStr = format(shippedDate, 'yyyy-MM-dd');
                    const totalQuantity = lead.orders?.reduce((sum, order) => sum + order.quantity, 0) || 0;
                    dailyQuantities[dateStr] = (dailyQuantities[dateStr] || 0) + totalQuantity;
                }
            } catch (e) { /* ignore invalid dates */ }
        }
    });

    const allDaysInRange = eachDayOfInterval({ start: startDate, end: endDate });
    return allDaysInRange.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return {
        date: format(day, 'MMM dd'),
        quantity: dailyQuantities[dateStr] || 0,
      };
    });
  }, [leads, deliveryFilterType, deliveryTimeRange, deliveryMonth, deliveryYear]);


  if (isLoading) {
    return (
        <Card className="w-full shadow-xl">
            <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Skeleton className="h-[250px] w-full" />
                <Skeleton className="h-[250px] w-full" />
                <Skeleton className="h-[250px] w-full" />
                <Skeleton className="h-[250px] w-full" />
            </CardContent>
        </Card>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading summary data: {error.message}</p>;
  }

  return (
    <div className="space-y-8">
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black border-none">
          <CardHeader>
            <CardTitle className="text-black">Logistics Reports</CardTitle>
            <CardDescription className="text-gray-600">
              An overview of key metrics for the logistics department.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DoughnutChartCard data={qualityCheckData} title="Awaiting Quality Check" total={totalForQualityCheck} />
            <DoughnutChartCard data={salesAuditData} title="Awaiting Sales Audit" total={totalForSalesAudit} />
            <DoughnutChartCard data={shippedData} title="Shipped Items" total={totalShippedAndDelivered} />
            <DoughnutChartCard data={deliveredData} title="Delivered Items" total={totalShippedAndDelivered} />
          </CardContent>
        </Card>

        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black border-none">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-black">Delivery Schedule</CardTitle>
                        <CardDescription className="text-gray-600">
                        Total quantity of items scheduled for delivery each day.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={deliveryFilterType} onValueChange={(value: 'range' | 'month') => setDeliveryFilterType(value)}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="range">Date Range</SelectItem>
                                <SelectItem value="month">By Month</SelectItem>
                            </SelectContent>
                        </Select>
                        {deliveryFilterType === 'range' ? (
                            <Select value={deliveryTimeRange} onValueChange={setDeliveryTimeRange}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7d">Last 7 Days</SelectItem>
                                    <SelectItem value="14d">Last 14 Days</SelectItem>
                                    <SelectItem value="30d">Last 30 Days</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <>
                                <Select value={deliveryYear} onValueChange={setDeliveryYear}>
                                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={deliveryMonth} onValueChange={setDeliveryMonth}>
                                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {monthOptions.map(month => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ChartContainer config={{ quantity: { label: 'Quantity' } }} className="w-full h-full">
                    <ResponsiveContainer>
                    <AreaChart data={deliveryScheduleData}>
                        <defs>
                            <linearGradient id="colorDelivery" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip content={<ChartTooltipContent formatter={(value) => `${value} items`} />} />
                        <Area type="monotone" dataKey="quantity" name="Items for Delivery" stroke="hsl(var(--chart-4))" strokeWidth={2} fill="url(#colorDelivery)" dot>
                        <LabelList dataKey="quantity" position="top" formatter={(value: number) => value > 0 ? value : ''} />
                        </Area>
                    </AreaChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>

        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black border-none mt-8">
            <CardHeader>
                <CardTitle className="text-black">Daily Shipped Quantity</CardTitle>
                <CardDescription className="text-gray-600">
                    Total quantity of items shipped each day.
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ChartContainer config={{ quantity: { label: 'Quantity' } }} className="w-full h-full">
                    <ResponsiveContainer>
                    <AreaChart data={dailyShippedData}>
                        <defs>
                            <linearGradient id="colorShipped" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip content={<ChartTooltipContent formatter={(value) => `${value} items`} />} />
                        <Area type="monotone" dataKey="quantity" name="Items Shipped" stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#colorShipped)" dot>
                        <LabelList dataKey="quantity" position="top" formatter={(value: number) => value > 0 ? value : ''} />
                        </Area>
                    </AreaChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    </div>
  );
});

export { LogisticsSummaryMemo as LogisticsSummary };
