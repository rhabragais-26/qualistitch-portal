
'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { formatCurrency, cn } from '@/lib/utils';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell, PieChart, Pie, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Input } from '@/components/ui/input';

type Order = {
  quantity: number;
};

type Layout = {
  layoutImage?: string | null;
};

type Lead = {
  id: string;
  salesRepresentative: string;
  submissionDateTime: string;
  grandTotal?: number;
  orders: Order[];
  layouts?: Layout[];
};

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
  
const renderQuantityLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    
    if (value === 0 || !height || typeof x !== 'number' || typeof y !== 'number') return null;
  
    return (
      <text x={x + width / 2} y={y + height / 2} fill="white" fontSize={12} textAnchor="middle" dominantBaseline="middle" fontWeight="bold">
        {value}
      </text>
    );
};

export function TodaysPerformanceCard() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery, undefined, { listen: false });

  const [activeFilter, setActiveFilter] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const salesData = useMemo(() => {
    if (!leads) return [];

    let rangeStart: Date;
    let rangeEnd: Date;
    
    if (activeFilter === 'today') {
        const today = new Date();
        rangeStart = startOfDay(today);
        rangeEnd = endOfDay(today);
    } else if (activeFilter === 'yesterday') {
        const yesterday = subDays(new Date(), 1);
        rangeStart = startOfDay(yesterday);
        rangeEnd = endOfDay(yesterday);
    } else if (activeFilter === 'custom' && selectedDate) {
        rangeStart = startOfDay(selectedDate);
        rangeEnd = endOfDay(selectedDate);
    } else {
        const today = new Date();
        rangeStart = startOfDay(today);
        rangeEnd = endOfDay(today);
    }
    
    const filteredLeads = leads.filter(lead => {
        try {
            const submissionDate = new Date(lead.submissionDateTime);
            return submissionDate >= rangeStart && submissionDate <= rangeEnd;
        } catch (e) {
            console.warn(`Invalid date format for lead '${lead.id}': '${lead.submissionDateTime}`);
            return false;
        }
    });

    const salesByRep = filteredLeads.reduce((acc, lead) => {
      const rep = lead.salesRepresentative;
      if (!acc[rep]) {
        acc[rep] = { amount: 0, quantity: 0, layoutCount: 0 };
      }
      acc[rep].amount += lead.grandTotal || 0;
      const orderQuantity = lead.orders?.reduce((sum, order) => sum + (order.quantity || 0), 0) || 0;
      acc[rep].quantity += orderQuantity;
      const layoutCount = lead.layouts?.filter(l => l.layoutImage).length || 0;
      acc[rep].layoutCount += layoutCount;
      return acc;
    }, {} as { [key: string]: { amount: number; quantity: number; layoutCount: number } });

    return Object.entries(salesByRep)
      .map(([name, data]) => ({ name, ...data }))
      .filter(rep => rep.amount > 0 || rep.quantity > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [leads, activeFilter, selectedDate]);

  const totalSales = useMemo(() => {
    if (!salesData) return 0;
    return salesData.reduce((acc, curr) => acc + curr.amount, 0);
  }, [salesData]);

  const { title, description } = useMemo(() => {
    if (activeFilter === 'today') {
        return {
            title: "Today's Performance",
            description: `Total sales amount and items sold by SCES for ${format(new Date(), 'MMMM dd, yyyy')}.`
        };
    }
    if (activeFilter === 'yesterday') {
        return {
            title: "Yesterday's Performance",
            description: `Total sales amount and items sold by SCES for ${format(subDays(new Date(), 1), 'MMMM dd, yyyy')}.`
        };
    }
    if (selectedDate) {
        return {
            title: `Performance for ${format(selectedDate, 'MMMM dd, yyyy')}`,
            description: `Total sales amount and items sold by SCES for ${format(selectedDate, 'MMMM dd, yyyy')}.`
        };
    }
    // Fallback
    return {
        title: "Today's Performance",
        description: `Total sales amount and items sold by SCES for ${format(new Date(), 'MMMM dd, yyyy')}.`
    };
  }, [activeFilter, selectedDate]);
  
  if (isLoading) {
      return (
           <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start h-[400px]">
                <Skeleton className="lg:col-span-2 h-full w-full" />
                <Skeleton className="h-full w-full" />
            </CardContent>
          </Card>
      )
  }

  if (error) {
      return (
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
             <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center h-[300px]">
                    <p className="text-destructive">Error loading performance data: {error.message}</p>
                </div>
            </CardContent>
        </Card>
      )
  }
  
  const layoutChartData = salesData.filter(d => d.layoutCount > 0);


  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div className="flex-1">
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex-1 flex justify-end items-center gap-4">
                 <Input
                    type="date"
                    value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (value) {
                            setSelectedDate(new Date(value + 'T00:00:00'));
                            setActiveFilter('custom');
                        } else {
                            setSelectedDate(undefined);
                            setActiveFilter('today');
                        }
                    }}
                    className={cn(
                        "w-[180px] justify-start text-left font-normal",
                         activeFilter === 'custom' && 'font-bold border-primary'
                    )}
                />
                <Button variant={activeFilter === 'yesterday' ? 'default' : 'outline'} onClick={() => { setActiveFilter('yesterday'); setSelectedDate(undefined); }}>Yesterday</Button>
                <Button variant={activeFilter === 'today' ? 'default' : 'outline'} onClick={() => { setActiveFilter('today'); setSelectedDate(undefined); }}>Today</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {salesData.length > 0 ? (
            <>
                <div className="lg:col-span-2">
                    <CardHeader className="p-0 mb-4 text-center">
                        <CardTitle>Sales & Items Sold</CardTitle>
                    </CardHeader>
                    <div style={{ height: '300px' }}>
                        <ChartContainer config={chartConfig} className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={salesData} margin={{ top: 30 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} tick={{ fill: 'black', fontWeight: 'bold', fontSize: 12, opacity: 1 }} />
                                    <YAxis
                                        yAxisId="left"
                                        orientation="left"
                                        stroke="hsl(var(--chart-2))"
                                        tickFormatter={(value) => `₱${Number(value) / 1000}k`}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        stroke="hsl(var(--chart-1))"
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted))' }}
                                        content={<ChartTooltipContent
                                            formatter={(value, name) => {
                                                if (name === 'amount') return formatCurrency(value as number);
                                                return value.toLocaleString();
                                            }}
                                        />}
                                    />
                                    <Bar yAxisId="right" dataKey="quantity" name="Items Sold" radius={[4, 4, 0, 0]}>
                                        {salesData.map((entry, index) => (
                                            <Cell key={`cell-amount-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                        <LabelList dataKey="quantity" content={renderQuantityLabel} />
                                    </Bar>
                                    <Line yAxisId="left" type="monotone" dataKey="amount" name="Sales Amount" stroke={'hsl(160, 60%, 45%)'} strokeWidth={2}>
                                        <LabelList content={renderAmountLabel} dataKey="amount" />
                                    </Line>
                                </ComposedChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                    <div className="text-center mt-4">
                        <p className="text-sm font-medium text-gray-600">Total Sales</p>
                        <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
                    </div>
                </div>
                <div className="w-full lg:col-span-1">
                     <CardHeader className="p-0 mb-4 text-center">
                        <CardTitle>Layouts converted to Sales</CardTitle>
                    </CardHeader>
                    <div style={{ height: '350px' }}>
                       <ChartContainer config={{ layoutCount: { label: 'Layouts' } }} className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted))' }}
                                        content={<ChartTooltipContent nameKey="layoutCount" />}
                                    />
                                    <Pie
                                        data={layoutChartData}
                                        dataKey="layoutCount"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={90}
                                        labelLine={false}
                                        label={({
                                            cx,
                                            cy,
                                            midAngle,
                                            innerRadius,
                                            outerRadius,
                                            value,
                                        }) => {
                                            const RADIAN = Math.PI / 180;
                                            const radius = innerRadius + (outerRadius - innerRadius) * 0.7; // Position label farther out
                                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                            const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                            return (
                                            <text
                                                x={x}
                                                y={y}
                                                fill="white"
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                                fontSize={12}
                                                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                                            >
                                                {value}
                                            </text>
                                            );
                                        }}
                                    >
                                        {layoutChartData.map((entry, index) => (
                                            <Cell key={`cell-layout-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                </div>
            </>
        ) : (
            <div className="lg:col-span-3 flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">No sales recorded for the selected date.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

