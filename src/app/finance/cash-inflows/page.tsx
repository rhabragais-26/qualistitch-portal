'use client';

import React, { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, doc, setDoc, orderBy } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Header } from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Banknote } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';


// Types for downpayments from leads
type Payment = {
  type: 'down' | 'full' | 'balance';
  amount: number;
  mode: string;
  timestamp?: string;
  processedBy?: string;
};

type Lead = {
  id: string;
  customerName: string;
  joNumber?: number;
  payments?: Payment[];
  submissionDateTime: string;
  salesRepresentative: string;
};

// Types for other cash inflows
type OtherCashInflow = {
  id: string;
  date: string;
  customerName: string;
  description: string;
  amount: number;
  paymentMode: string;
  submittedBy: string;
  timestamp: string;
};

const otherInflowSchema = z.object({
  date: z.date({ required_error: 'A date is required.' }),
  customerName: z.string().min(1, 'Customer name is required.'),
  description: z.string().min(1, 'Description is required.'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  paymentMode: z.string().min(1, 'Payment mode is required.'),
});

type OtherInflowFormValues = z.infer<typeof otherInflowSchema>;

const paymentModes = [
    "CASH", "GCash (Jam)", "GCash (Jonathan)", "GCash (Jhun)", "GCash (Jays)", "GCash (Tantan)", "Paymaya", "Bank Transfer to BDO", "Bank Transfer to BPI", "Bank Transfer to ChinaBank", "J&T Remittance", "LBC Remittance"
];

function OtherInflowsForm() {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();

  const form = useForm<OtherInflowFormValues>({
    resolver: zodResolver(otherInflowSchema),
    defaultValues: {
      date: new Date(),
      customerName: '',
      description: '',
      amount: 0,
      paymentMode: '',
    },
  });

  async function onSubmit(values: OtherInflowFormValues) {
    if (!firestore || !userProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }
    
    const docId = uuidv4();
    const dataToSave = {
        id: docId,
        date: values.date.toISOString(),
        customerName: values.customerName,
        description: values.description,
        amount: values.amount,
        paymentMode: values.paymentMode,
        submittedBy: userProfile.nickname,
        timestamp: new Date().toISOString(),
    };

    try {
        const inflowRef = doc(firestore, 'other_cash_inflows', docId);
        await setDoc(inflowRef, dataToSave);
        toast({ title: 'Success!', description: 'Cash inflow has been recorded.' });
        form.reset({ date: new Date(), customerName: '', description: '', amount: 0, paymentMode: '' });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Save Failed", description: e.message });
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Record Other Cash Inflow</CardTitle>
        <CardDescription>Enter details of cash inflows not from lead payments.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" value={format(field.value, 'yyyy-MM-dd')} onChange={(e) => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="customerName" render={({ field }) => (
              <FormItem><FormLabel>Customer Name</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="e.g., Sale of scrap materials" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="paymentMode" render={({ field }) => (
                <FormItem><FormLabel>Payment Mode</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select mode of payment" /></SelectTrigger></FormControl>
                    <SelectContent>{paymentModes.map(mode => <SelectItem key={mode} value={mode}>{mode}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage /></FormItem>
            )} />
            <div className="flex justify-end">
              <Button type="submit">Record Inflow</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function CashInflowsPage() {
  const firestore = useFirestore();
  const [monthFilter, setMonthFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');
  const [joNumberSearch, setJoNumberSearch] = useState('');

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading: leadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery);
  
  const otherInflowsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'other_cash_inflows'), orderBy('date', 'desc')) : null, [firestore]);
  const { data: otherInflows, isLoading: otherInflowsLoading, error: otherInflowsError } = useCollection<OtherCashInflow>(otherInflowsQuery);

  const formatJoNumber = (joNumber: number | undefined): string => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  };

  const combinedInflows = useMemo(() => {
    const leadPayments = (leads || []).flatMap(lead => 
        (lead.payments || [])
            .filter(p => p.amount > 0)
            .map((p, i) => {
                let description: string;
                switch (p.type) {
                    case 'down':
                        description = 'Downpayment';
                        break;
                    case 'full':
                        description = 'Full Payment';
                        break;
                    case 'balance':
                        description = 'Balance Payment';
                        break;
                    default:
                        description = 'Payment';
                        break;
                }

                return {
                    id: `${lead.id}-${i}`,
                    date: p.timestamp || lead.submissionDateTime,
                    customerName: lead.customerName,
                    description: description,
                    amount: p.amount,
                    paymentMode: p.mode,
                    source: 'Lead Payment',
                    joNumber: lead.joNumber,
                    processedBy: p.processedBy || lead.salesRepresentative
                };
            })
    );

    const other = (otherInflows || []).map(inflow => ({
        ...inflow,
        source: 'Other',
        joNumber: undefined,
        processedBy: inflow.submittedBy,
    }));
    
    return [...leadPayments, ...other].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [leads, otherInflows]);
  
  const paymentMethodOptions = useMemo(() => {
    const allModes = new Set<string>();
    (combinedInflows).forEach(inflow => {
        allModes.add(inflow.paymentMode);
    });
    return ['All', ...Array.from(allModes).sort()];
  }, [combinedInflows]);

  const { monthOptions, dateOptions } = useMemo(() => {
    const uniqueMonths = new Set<string>();
    const uniqueDates = new Set<string>();

    combinedInflows.forEach(inflow => {
        const date = parseISO(inflow.date);
        uniqueMonths.add(format(date, 'yyyy-MM'));
        uniqueDates.add(format(date, 'yyyy-MM-dd'));
    });

    const monthOpts = ['All', ...Array.from(uniqueMonths).sort((a,b) => b.localeCompare(a))];
    
    let dateOptsForSelectedMonth = Array.from(uniqueDates);
    if(monthFilter !== 'All') {
        dateOptsForSelectedMonth = dateOptsForSelectedMonth.filter(d => d.startsWith(monthFilter));
    }
    const finalDateOpts = ['All', ...dateOptsForSelectedMonth.sort((a, b) => b.localeCompare(a))];

    return { monthOptions: monthOpts, dateOptions: finalDateOpts };
  }, [combinedInflows, monthFilter]);
  
  const filteredInflows = useMemo(() => {
    return combinedInflows.filter(inflow => {
        const inflowDate = parseISO(inflow.date);
        const inflowDateStr = format(inflowDate, 'yyyy-MM-dd');
        const inflowMonthStr = format(inflowDate, 'yyyy-MM');

        const matchesMonth = monthFilter === 'All' || inflowMonthStr === monthFilter;
        const matchesDate = dateFilter === 'All' || inflowDateStr === dateFilter;

        const matchesPaymentMethod = paymentMethodFilter === 'All' || inflow.paymentMode === paymentMethodFilter;

        const formattedJo = inflow.joNumber ? formatJoNumber(inflow.joNumber) : '';
        const matchesJo = !joNumberSearch || (formattedJo && formattedJo.toLowerCase().includes(joNumberSearch.toLowerCase()));

        return matchesMonth && matchesDate && matchesPaymentMethod && matchesJo;
    });
  }, [combinedInflows, monthFilter, dateFilter, paymentMethodFilter, joNumberSearch]);


  const grandTotal = useMemo(() => {
    return filteredInflows.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredInflows]);

  const isLoading = leadsLoading || otherInflowsLoading;
  const error = leadsError || otherInflowsError;

  return (
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 grid grid-cols-1 xl:grid-cols-[auto_1fr] gap-8 items-start">
        <div>
            <OtherInflowsForm />
        </div>
        <div>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote />
                    Cash Inflows Summary
                  </CardTitle>
                  <CardDescription>
                    Summary of all recorded cash inflows from lead payments and other sources.
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Displayed Inflow</p>
                  <p className="text-2xl font-bold">{formatCurrency(grandTotal)}</p>
                </div>
              </div>
               <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                  <Select value={monthFilter} onValueChange={(value) => { setMonthFilter(value); setDateFilter('All'); }}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by month" />
                    </SelectTrigger>
                    <SelectContent>
                        {monthOptions.map(option => (
                            <SelectItem key={option} value={option}>
                                {option === 'All' ? 'All Months' : format(parseISO(option + '-01'), 'MMMM yyyy')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Filter by date" />
                    </SelectTrigger>
                    <SelectContent>
                        {dateOptions.map(option => (
                            <SelectItem key={option} value={option}>
                                {option === 'All' ? 'All Dates' : format(parseISO(option), 'MMM-dd-yyyy')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                      <SelectTrigger className="w-[240px]">
                          <SelectValue placeholder="Filter by Payment Method" />
                      </SelectTrigger>
                      <SelectContent>
                          {paymentMethodOptions.map(option => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <Input 
                    placeholder="Search by J.O. No..."
                    value={joNumberSearch}
                    onChange={(e) => setJoNumberSearch(e.target.value)}
                    className="w-[240px]"
                  />
                  <Button onClick={() => { setMonthFilter('All'); setDateFilter('All'); setPaymentMethodFilter('All'); setJoNumberSearch(''); }}>Reset Filters</Button>
               </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md h-[75vh] overflow-y-auto modern-scrollbar">
                <Table>
                  <TableHeader className="sticky top-0 bg-neutral-800 z-10">
                    <TableRow>
                      <TableHead className="text-white font-bold">Date</TableHead>
                      <TableHead className="text-white font-bold">Description</TableHead>
                      <TableHead className="text-white font-bold">Customer Name</TableHead>
                      <TableHead className="text-white font-bold">Payment Method</TableHead>
                      <TableHead className="text-white font-bold">J.O. Number</TableHead>
                      <TableHead className="text-white font-bold">Processed by</TableHead>
                      <TableHead className="text-white font-bold text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-24 w-full" />
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-destructive">
                          Error loading data: {error.message}
                        </TableCell>
                      </TableRow>
                    ) : filteredInflows.length > 0 ? (
                      filteredInflows.map((inflow, index) => (
                        <TableRow key={`${inflow.id}-${index}`}>
                            <TableCell className="font-bold">{format(parseISO(inflow.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{inflow.description}</TableCell>
                            <TableCell>{(inflow as any).customerName}</TableCell>
                            <TableCell>{inflow.paymentMode}</TableCell>
                            <TableCell>{inflow.joNumber ? formatJoNumber(inflow.joNumber) : '-'}</TableCell>
                            <TableCell>{inflow.processedBy}</TableCell>
                            <TableCell className="text-right">{formatCurrency(inflow.amount)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No cash inflow data available for the selected filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </Header>
  );
}
