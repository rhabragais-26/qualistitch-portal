"use client";

import React, { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell, PieChart, Pie, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from './ui/skeleton';
import { format, startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth, getMonth, getYear, parse, isValid } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Order = {
  quantity: number;
  productType: string;
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
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'));
  }, [firestore, user]);

  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

  const availableYears = useMemo(() => {
    if (!leads) return [];
    const years = new Set(leads.map(lead => getYear(new Date(lead.submissionDateTime))));
    return Array.from(years).sort((a, b) => b - a);
  }, [leads]);

  const months = useMemo(() => [
      { value: '1', label: 'January' }, { value: '2', label: 'February' },
      { value: '3', label: 'March' }, { value: '4', label: 'April' },
      { value: '5', label: 'May' }, { value: '6', label: 'June' },
      { value: '7', label: 'July' }, { value: '8', label: 'August' },
      { value: '9', label: 'September' }, { value: '10', label: 'October' },
      { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ], []);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth) - 1; // month is 0-indexed in Date

    if (isNaN(year) || isNaN(month)) return leads;

    return leads.filter(lead => {
      const submissionDate = new Date(lead.submissionDateTime);
      return getYear(submissionDate) === year && getMonth(submissionDate) === month;
    });
  }, [leads, selectedYear, selectedMonth]);


  const salesRepData = useMemo(() => {
    if (!filteredLeads) {
      return [];
    }
  
    const statsBySalesRep = filteredLeads.reduce((acc, lead) => {
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
  }, [filteredLeads]);
  
  const priorityData = useMemo(() => {
    if (!filteredLeads) {
      return [];
    }

    const quantityByPriority = filteredLeads.reduce((acc, lead) => {
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
  }, [filteredLeads]);

  const totalPriorityQuantity = useMemo(() => priorityData.reduce((sum, item) => sum + item.value, 0), [priorityData]);
  
  const dailySalesData = useMemo(() => {
    if (!filteredLeads) {
      return [];
    }

    const salesByDay = filteredLeads.reduce((acc, lead) => {
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
  }, [filteredLeads]);
  
  const monthlySalesData = useMemo(() => {
    if (!leads) {
      return [];
    }
  
    const salesByMonth = leads
      .filter(lead => {
        if (!selectedYear) return true;
        const submissionDate = new Date(lead.submissionDateTime);
        return getYear(submissionDate) === parseInt(selectedYear);
      })
      .reduce((acc, lead) => {
        const submissionDate = new Date(lead.submissionDateTime);
        const month = format(submissionDate, 'MMM yyyy');
        const leadQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
    
        if (!acc[month]) {
          acc[month] = 0;
        }
        acc[month] += leadQuantity;
        
        return acc;
      }, {} as { [key: string]: number });
  
    return Object.entries(salesByMonth)
      .map(([date, quantity]) => ({
        date,
        quantity,
      }))
      .sort((a, b) => parse(a.date, 'MMM yyyy', new Date()).getTime() - parse(b.date, 'MMM yyyy', new Date()).getTime());
  }, [leads, selectedYear]);
  
  const soldQtyByProductType = useMemo(() => {
    if (!filteredLeads) {
      return [];
    }

    const quantityByProductType = filteredLeads.reduce((acc, lead) => {
      lead.orders.forEach(order => {
        const productType = order.productType;
        const quantity = order.quantity;

        if (!acc[productType]) {
          acc[productType] = 0;
        }
        acc[productType] += quantity;
      });
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(quantityByProductType)
      .map(([name, quantity]) => ({
        name,
        quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [filteredLeads]);


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
      <div className="mb-8 p-4 bg-card/80 backdrop-blur-sm rounded-lg shadow-xl">
        <div className="flex gap-4 items-center">
            <div className='flex items-center gap-2'>
                <span className="text-sm font-medium text-card-foreground">Year:</span>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className='flex items-center gap-2'>
                <span className="text-sm font-medium text-card-foreground">Month:</span>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                        {months.map(month => (
                            <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Filter results by year and month. The CSR, Priority, Daily, and Product Type charts will reflect the selected period. The monthly chart filters by year only.</p>
      </div>
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
            <CardDescription>Total quantity of items sold each day for the selected month.</CardDescription>
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
                    <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), 'd')} tick={{ fill: 'hsl(var(--foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      content={<ChartTooltipContent />}
                    />
                    <Line type="monotone" dataKey="quantity" name="Quantity" stroke="hsl(var(--chart-1))" strokeWidth={2} activeDot={{ r: 8 }}>
                      <LabelList dataKey="quantity" position="top" fill="hsl(var(--foreground))" />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Monthly Sold QTY</CardTitle>
            <CardDescription>Total quantity of items sold each month for the selected year.</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlySalesData}
                    margin={{
                      top: 20, right: 30, left: 20, bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3-3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(value) => format(parse(value, 'MMM yyyy', new Date()), 'MMM')} tick={{ fill: 'hsl(var(--foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="quantity" name="Quantity" radius={[4, 4, 0, 0]}>
                      {monthlySalesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      <LabelList dataKey="quantity" position="top" fill="hsl(var(--foreground))" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
       <div className="mt-8">
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Sold QTY by Product Type</CardTitle>
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
                    <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
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
      </div>
    </>
  );
}
