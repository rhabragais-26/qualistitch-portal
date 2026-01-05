"use client";

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell, PieChart, Pie, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from './ui/skeleton';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

type Order = {
  quantity: number;
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
};

const chartConfig = {
  quantity: {
    label: 'Quantity',
  },
  customerCount: {
    label: 'Customers',
  },
};

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(220, 70%, 60%)',
  'hsl(340, 70%, 60%)',
  'hsl(100, 70%, 60%)',
  'hsl(20, 70%, 60%)',
];

export function ReportsSummary() {
  const firestore = useFirestore();
  const { user } = useUser();

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'));
  }, [firestore, user]);

  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

  const salesRepData = useMemo(() => {
    if (!leads) {
      return [];
    }
  
    const statsBySalesRep = leads.reduce((acc, lead) => {
      const leadQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
      const csr = lead.salesRepresentative;
      
      if (!acc[csr]) {
        acc[csr] = { quantity: 0, customers: new Set<string>() };
      }
      
      acc[csr].quantity += leadQuantity;
      acc[csr].customers.add(lead.customerName);
      
      return acc;
    }, {} as { [key: string]: { quantity: number; customers: Set<string> } });
    
    return Object.entries(statsBySalesRep)
      .map(([name, { quantity, customers }]) => ({
        name,
        quantity,
        customerCount: customers.size,
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [leads]);
  
  const priorityData = useMemo(() => {
    if (!leads) {
      return [];
    }

    const quantityByPriority = leads.reduce((acc, lead) => {
      const leadQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
      const priority = lead.priorityType || 'Regular';
      if (acc[priority]) {
        acc[priority] += leadQuantity;
      } else {
        acc[priority] = leadQuantity;
      }
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(quantityByPriority)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  const totalPriorityQuantity = useMemo(() => priorityData.reduce((sum, item) => sum + item.value, 0), [priorityData]);
  
  const dailySalesData = useMemo(() => {
    if (!leads) {
      return [];
    }

    const now = new Date();
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday as start of the week
    const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });

    const salesByDay = leads
      .filter(lead => {
        const submissionDate = new Date(lead.submissionDateTime);
        return isWithinInterval(submissionDate, { start: startOfThisWeek, end: endOfThisWeek });
      })
      .reduce((acc, lead) => {
        const date = format(new Date(lead.submissionDateTime), 'MMM d, yyyy');
        const leadQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);

        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date] += leadQuantity;
        
        return acc;
      }, {} as { [key: string]: number });

    return Object.entries(salesByDay)
      .map(([date, quantity]) => ({
        date,
        quantity,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [leads]);


  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
           <Card className="lg:col-span-2 w-full shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading data: {error.message}</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>CSR Performance</CardTitle>
            <CardDescription>Total quantity of orders and number of customers by each CSR.</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '250px' }}>
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesRepData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <YAxis yAxisId="left" orientation="left" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      content={<ChartTooltipContent />}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="quantity" name="Quantity" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]}>
                       <LabelList dataKey="quantity" position="top" fill="hsl(var(--foreground))" fontSize={12} />
                    </Bar>
                    <Bar yAxisId="right" dataKey="customerCount" name="Customers" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="customerCount" position="top" fill="hsl(var(--foreground))" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
             <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs p-2">CSR</TableHead>
                    <TableHead className="text-right text-xs p-2">Quantity</TableHead>
                    <TableHead className="text-right text-xs p-2">Customers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesRepData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium flex items-center text-xs p-2">
                         <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        {item.name}
                      </TableCell>
                      <TableCell className="text-right text-xs p-2">{item.quantity}</TableCell>
                      <TableCell className="text-right text-xs p-2">{item.customerCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm flex flex-col">
          <CardHeader>
            <CardTitle>QTY by Priority Type</CardTitle>
            <CardDescription>Total quantity of orders for each priority type.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div style={{ height: '250px' }}>
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<ChartTooltipContent nameKey="value" />} />
                    <Pie
                      data={priorityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      labelLine={false}
                      label={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        percent,
                        index,
                      }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);

                        return (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor={x > cx ? "start" : "end"}
                            dominantBaseline="central"
                            fontSize={14}
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                     <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            <div className="mt-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs p-2">Priority Type</TableHead>
                    <TableHead className="text-right text-xs p-2">Quantity</TableHead>
                    <TableHead className="text-right text-xs p-2">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priorityData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium flex items-center text-xs p-2">
                         <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        {item.name}
                      </TableCell>
                      <TableCell className="text-right text-xs p-2">{item.value}</TableCell>
                      <TableCell className="text-right text-xs p-2">
                        {totalPriorityQuantity > 0 ? `${((item.value / totalPriorityQuantity) * 100).toFixed(2)}%` : '0.00%'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Daily Sold QTY</CardTitle>
            <CardDescription>Total quantity of items sold each day for the current week.</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dailySalesData}
                    margin={{
                      top: 20, right: 30, left: 20, bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3-3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      content={<ChartTooltipContent />}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="quantity" stroke="hsl(var(--chart-1))" strokeWidth={2} activeDot={{ r: 8 }}>
                      <LabelList dataKey="quantity" position="top" fill="hsl(var(--foreground))" />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
