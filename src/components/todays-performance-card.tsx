
'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { formatCurrency, cn } from '@/lib/utils';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell, PieChart, Pie, Legend, Bar } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Input } from '@/components/ui/input';
import { DateRange } from 'react-day-picker';
import { eachDayOfInterval, endOfMonth, getMonth, getYear, parseISO } from 'date-fns';
import { z, ZodError } from 'zod';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';

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


const renderPieCountInside = (props: any) => {
  const { x, y, value } = props;

  const vx = typeof x === "number" ? x : Number(x);
  const vy = typeof y === "number" ? y : Number(y);
  const v = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(vx) || !Number.isFinite(vy)) return null;
  if (!Number.isFinite(v) || v <= 0) return null;

  return (
    <text
      x={vx}
      y={vy}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
    >
      {v}
    </text>
  );
};

const renderPieNameOutside = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, name, fill } = props;

  // ✅ guard
  if (
    typeof cx !== "number" ||
    typeof cy !== "number" ||
    typeof midAngle !== "number" ||
    typeof innerRadius !== "number" ||
    typeof outerRadius !== "number"
  ) {
    return null;
  }

  if (!name) return null;

  const RADIAN = Math.PI / 180;

  const sx = cx + (outerRadius + 4) * Math.cos(-midAngle * RADIAN);
  const sy = cy + (outerRadius + 4) * Math.sin(-midAngle * RADIAN);

  const mx = cx + (outerRadius + 10) * Math.cos(-midAngle * RADIAN);
  const my = cy + (outerRadius + 10) * Math.sin(-midAngle * RADIAN); // ✅ was +16 (typo-ish), keep consistent

  const isRight = mx > cx;
  const ex = mx + (isRight ? 8 : -8);
  const ey = my;

  return (
    <g>
      <path d={`M${sx},${sy} L${mx},${my} L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={2} />
      <text
        x={ex + (isRight ? 4 : -4)}
        y={ey}
        textAnchor={isRight ? "start" : "end"}
        dominantBaseline="central"
        fill={fill}
        fontSize={12}
        fontWeight={700}
        style={{ paintOrder: "stroke", stroke: "white", strokeWidth: 3 }}
      >
        {name}
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

const renderHourlyLabel = (props: any) => {
    const { x, y, value, stroke } = props;

    if (typeof x !== 'number' || typeof y !== 'number' || typeof value !== 'number' || value <= 0) {
      return null;
    }
    
    const labelText = `${value}`;

    return (
        <text
          x={x}
          y={y}
          dy={-10}
          fill={stroke}
          fontSize={12}
          fontWeight="bold"
          textAnchor="middle"
        >
          {labelText}
        </text>
    );
};

export function TodaysPerformanceCard() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery, leadSchema, { listen: false });

  const [activeFilter, setActiveFilter] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isClient, setIsClient] = useState(false);

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
            console.warn(`Invalid date format for lead '${'\'\''}${lead.id}'`, `'${'\'\''}${lead.submissionDateTime}'`);
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
  
  const { hourlySalesData, historicalDataKeys, totalCustomers, totalItemsSold } = useMemo(() => {
    if (!leads) return { hourlySalesData: [], historicalDataKeys: [], totalCustomers: 0, totalItemsSold: 0 };

    let rangeStart: Date;
    
    if (activeFilter === 'today') {
        rangeStart = startOfDay(new Date());
    } else if (activeFilter === 'yesterday') {
        rangeStart = startOfDay(subDays(new Date(), 1));
    } else if (activeFilter === 'custom' && selectedDate) {
        rangeStart = startOfDay(selectedDate);
    } else {
        rangeStart = startOfDay(new Date());
    }
    const rangeEnd = endOfDay(rangeStart);
    
    const filteredLeads = leads.filter(lead => {
        try {
            const submissionDate = new Date(lead.submissionDateTime);
            return submissionDate >= rangeStart && submissionDate <= rangeEnd;
        } catch (e) {
            return false;
        }
    });

    const renderPieNameOutside = (props: any) => {
      const {
        cx,
        cy,
        midAngle,
        innerRadius,
        outerRadius,
        name,
        fill,
      } = props;
    
      const RADIAN = Math.PI / 180;
    
      // start point: just outside the slice
      const sx = cx + (outerRadius + 4) * Math.cos(-midAngle * RADIAN);
      const sy = cy + (outerRadius + 4) * Math.sin(-midAngle * RADIAN);
    
      // middle bend
      const mx = cx + (outerRadius + 16) * Math.cos(-midAngle * RADIAN);
      const my = cy + (outerRadius + 16) * Math.sin(-midAngle * RADIAN);
    
      // end point: push left/right
      const isRight = mx > cx;
      const ex = mx + (isRight ? 14 : -14);
      const ey = my;
    
      return (
        <g>
          {/* leader line */}
          <path d={`M${sx},${sy} L${mx},${my} L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={2} />
          {/* label */}
          <text
            x={ex + (isRight ? 4 : -4)}
            y={ey}
            textAnchor={isRight ? "start" : "end"}
            dominantBaseline="central"
            fill={fill}
            fontSize={12}
            fontWeight={700}
            style={{ paintOrder: "stroke", stroke: "white", strokeWidth: 3 }} // makes it readable
          >
            {name}
          </text>
        </g>
      );
    };

    const salesByHour = filteredLeads.reduce((acc, lead) => {
      const hour = new Date(lead.submissionDateTime).getHours();
      if (!acc[hour]) {
        acc[hour] = { customers: new Set(), quantity: 0, amount: 0 };
      }
      acc[hour].customers.add(lead.customerName);
      const quantity = lead.orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
      acc[hour].quantity += quantity;
      
      let amount = lead.grandTotal || 0;
      if (lead.orderType === 'Item Sample' && lead.payments) {
        const securityDeposit = lead.payments
            .filter(p => p.type === 'securityDeposit')
            .reduce((sum, p) => sum + p.amount, 0);
        amount += securityDeposit;
      }
      acc[hour].amount += amount;

      return acc;
    }, {} as Record<number, { customers: Set<string>; quantity: number; amount: number }>);

    const totalCust = new Set<string>();
    let totalQty = 0;
    
    filteredLeads.forEach(lead => {
        const quantity = lead.orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
        totalQty += quantity;
        if(lead.orderType !== 'Item Sample') {
            totalCust.add(lead.customerName.toLowerCase());
        }
    });

    const historicalData: Record<string, number>[] = Array.from({ length: 24 }, () => ({}));
    const historicalDataKeys: string[] = [];

    for (let i = 1; i <= 4; i++) {
      const historicalDate = subDays(rangeStart, i * 7);
      const historicalRangeStart = startOfDay(historicalDate);
      const historicalRangeEnd = endOfDay(historicalDate);
      const historicalKey = `prevWeek${'\'\'\''}${i}`;
      historicalDataKeys.push(historicalKey);

      const historicalLeads = leads.filter(lead => {
        try {
          const submissionDate = new Date(lead.submissionDateTime);
          return submissionDate >= historicalRangeStart && submissionDate <= historicalRangeEnd;
        } catch (e) {
          return false;
        }
      });

      const historicalSalesByHour = historicalLeads.reduce((acc, lead) => {
        const hour = new Date(lead.submissionDateTime).getHours();
        if (!acc[hour]) {
            acc[hour] = new Set<string>();
        }
        acc[hour].add(lead.customerName);
        return acc;
      }, {} as Record<number, Set<string>>);

      for (let j = 0; j < 24; j++) {
        historicalData[j][historicalKey] = historicalSalesByHour[j] ? historicalSalesByHour[j].size : 0;
      }
    }

    const combinedHourlyData = Array.from({ length: 24 }, (_, i) => {
      const hourData = salesByHour[i];
      return {
        hour: `${i.toString().padStart(2, '0')}:00`, // <-- FIX: no extra quotes
        customerCount: hourData ? hourData.customers.size : 0,
        quantity: hourData ? hourData.quantity : 0,
        amount: hourData ? hourData.amount : 0,
        ...historicalData[i],
      };
    });

    return { hourlySalesData: combinedHourlyData, historicalDataKeys, totalCustomers: totalCust.size, totalItemsSold: totalQty };
  }, [leads, activeFilter, selectedDate]);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

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
    return {
        title: "Today's Performance",
        description: `Total sales amount and items sold by SCES for ${format(new Date(), 'MMMM dd, yyyy')}.`
    };
  }, [activeFilter, selectedDate]);
  
  const layoutChartData = useMemo(() => salesData.filter(d => d.layoutCount > 0), [salesData]);

  if (isLoading || !isClient) {
      return (
           <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start h-[400px]">
                    <Skeleton className="lg:col-span-2 h-full w-full" />
                    <Skeleton className="h-full w-full" />
                </div>
                <Separator />
                <Skeleton className="h-[300px] w-full" />
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
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
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
                                          tickFormatter={(value) => `₱${'\'\'\''}${Number(value) / 1000}k`}
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
                                                  if (name === 'Sales Amount') return formatCurrency(value as number);
                                                  return value.toLocaleString();
                                              }}
                                          />}
                                      />
                                      <Bar yAxisId="right" dataKey="quantity" name="Items Sold" radius={[4, 4, 0, 0]}>
                                          {salesData.map((entry, index) => (
                                              <Cell key={`cell-amount-${'\'\'\''}${index}`} fill={COLORS[index % COLORS.length]} />
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
                                        cx="58%"
                                        cy="50%"
                                        outerRadius={90}
                                        labelLine={false}
                                        label={(p: any) => {
                                          const { cx, cy, midAngle, innerRadius, outerRadius, value, name, fill } = p;

                                          if (
                                            typeof cx !== "number" ||
                                            typeof cy !== "number" ||
                                            typeof midAngle !== "number" ||
                                            typeof innerRadius !== "number" ||
                                            typeof outerRadius !== "number"
                                          ) return null;

                                          const v = Number(value);
                                          if (!Number.isFinite(v) || v <= 0) return null;

                                          const RADIAN = Math.PI / 180;

                                          // inside count
                                          const rIn = innerRadius + (outerRadius - innerRadius) * 0.7;
                                          const xIn = cx + rIn * Math.cos(-midAngle * RADIAN);
                                          const yIn = cy + rIn * Math.sin(-midAngle * RADIAN);

                                          // outside name
                                          const sx = cx + (outerRadius + 4) * Math.cos(-midAngle * RADIAN);
                                          const sy = cy + (outerRadius + 4) * Math.sin(-midAngle * RADIAN);
                                          const mx = cx + (outerRadius + 12) * Math.cos(-midAngle * RADIAN);
                                          const my = cy + (outerRadius + 12) * Math.sin(-midAngle * RADIAN);
                                          const isRight = mx > cx;
                                          const ex = mx + (isRight ? 10 : -10);
                                          const ey = my;

                                          return (
                                            <g>
                                              <path
                                                d={`M${sx},${sy} L${mx},${my} L${ex},${ey}`}
                                                stroke={fill}
                                                fill="none"
                                                strokeWidth={2}
                                              />
                                              <text
                                                x={ex + (isRight ? 4 : -4)}
                                                y={ey}
                                                textAnchor={isRight ? "start" : "end"}
                                                dominantBaseline="central"
                                                fill={fill}
                                                fontSize={12}
                                                fontWeight={700}
                                                style={{ paintOrder: "stroke", stroke: "white", strokeWidth: 3 }}
                                              >
                                                {name}
                                              </text>

                                              <text
                                                x={xIn}
                                                y={yIn}
                                                fill="white"
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                                fontSize={12}
                                                fontWeight="bold"
                                                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                                              >
                                                {v}
                                              </text>
                                            </g>
                                          );
                                        }}
                                      >
                                        {layoutChartData.map((entry, index) => (
                                          <Cell key={`cell-layout-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                      </Pie>
                                      <g>
                                        {layoutChartData.map((entry, index) => (
                                          <React.Fragment key={`pie-name-${index}`}>
                                            {/* reuse your existing function by manually passing slice fill */}
                                            {renderPieNameOutside({
                                              ...entry,
                                              fill: COLORS[index % COLORS.length],
                                            })}
                                          </React.Fragment>
                                        ))}
                                      </g>  
                                      
                                      <Legend
                                        layout="vertical"
                                        align="left"
                                        verticalAlign="middle"
                                        wrapperStyle={{ paddingRight: 16 }}
                                        formatter={(value) => <span style={{ display: 'inline-block', marginBottom: 10 }}>{value}</span>}
                                      />
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
        </div>
        <div className="flex items-center justify-around bg-muted p-4 rounded-lg">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Total Quantity</p>
            <p className="text-3xl font-bold">{totalItemsSold.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
            <p className="text-3xl font-bold">{formatCurrency(totalSales)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
            <p className="text-3xl font-bold">{totalCustomers}</p>
          </div>
        </div>
        <Separator className="my-4" />
        <CardHeader className="p-0">
          <CardTitle>Count of Clients per Interval</CardTitle>
          <CardDescription>Number of unique customers and total sales amount acquired per hour for the selected day.</CardDescription>
        </CardHeader>
        <div style={{ height: '300px' }}>
          <ChartContainer config={{ customerCount: { label: 'Customers' } }} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourlySalesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid stroke="hsl(var(--border) / 0.7)" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => {
                    const raw = typeof value === 'number' ? `${value}` : String(value ?? '');
                    const match = raw.match(/^(\d{1,2})/); // grab leading hour safely
                    const hour = match ? parseInt(match[1], 10) : 0;

                    const h12 = hour % 12 || 12;
                    const suffix = hour < 12 ? 'am' : 'pm';
                    return `${h12}${suffix}`;
                  }}
                  interval={0}
                />
                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" tickFormatter={(value) => `${'\'\'\''}${value}`} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" tickFormatter={(value) => `₱${'\'\'\''}${Number(value) / 1000}k`} />
                <Tooltip
                  content={<ChartTooltipContent
                      formatter={(value, name, item) => {
                          if (name === 'Customers') {
                              return (
                                  <div className="flex flex-col">
                                      <span>{item.payload.customerCount} customers</span>
                                      <span className="text-muted-foreground">{item.payload.quantity} items</span>
                                  </div>
                              );
                          }
                          if (name === 'Sales') {
                              return formatCurrency(value as number);
                          }
                          const weekMatch = name.match(/(\d+) week(s)? ago/);
                          if (weekMatch) {
                              const weekNum = weekMatch[1];
                              return (
                                  <div className="flex flex-col">
                                      <span>{value as number} customers</span>
                                      <span className="text-muted-foreground">({weekNum} week{parseInt(weekNum, 10) > 1 ? 's' : ''} ago)</span>
                                  </div>
                              );
                          }
                          return value;
                      }}
                  />}
                />
                <Legend />
                {historicalDataKeys.map((key, index) => (
                    <Line
                        key={key}
                        yAxisId="left"
                        dataKey={key}
                        type="monotone"
                        name={`${'\'\'\''}${index + 1} week${index > 0 ? 's' : ''} ago`}
                        stroke={COLORS[(index + 1) % COLORS.length]}
                        strokeOpacity={0.4}
                        strokeWidth={2}
                        dot={false}
                        activeDot={false}
                    />
                ))}
                 <Area yAxisId="right" type="linear" dataKey="amount" name="Sales" fill="hsl(var(--chart-2))" fillOpacity={0.4} stroke="hsl(var(--chart-2))">
                   <LabelList dataKey="amount" content={renderAmountLabel} />
                </Area>
                <Line yAxisId="left" type="monotone" dataKey="customerCount" name="Customers" stroke="hsl(var(--chart-1))" strokeWidth={2}>
                    <LabelList dataKey="customerCount" content={(props) => renderHourlyLabel({...props, stroke: 'hsl(var(--chart-1))'})} />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
