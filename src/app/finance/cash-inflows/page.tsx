
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

// Types for downpayments from leads
type Payment = {
  type: 'down' | 'full';
  amount: number;
  mode: string;
};

type Lead = {
  id: string;
  payments?: Payment[];
  submissionDateTime: string;
};

// Types for other cash inflows
type OtherCashInflow = {
  id: string;
  date: string;
  description: string;
  amount: number;
  paymentMode: string;
  submittedBy: string;
  timestamp: string;
};

const otherInflowSchema = z.object({
  date: z.date({ required_error: 'A date is required.' }),
  description: z.string().min(1, 'Description is required.'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  paymentMode: z.string().min(1, 'Payment mode is required.'),
});

type OtherInflowFormValues = z.infer<typeof otherInflowSchema>;

const paymentModes = [
    "CASH", "GCash (Jam)", "GCash (Jonathan)", "GCash (Jhun)", "GCash (Jays)", "GCash (Tantan)", "Paymaya", "Bank Transfer to BDO", "Bank Transfer to BPI", "Bank Transfer to ChinaBank"
];

function OtherInflowsForm() {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();

  const form = useForm<OtherInflowFormValues>({
    resolver: zodResolver(otherInflowSchema),
    defaultValues: {
      date: new Date(),
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
        form.reset({ date: new Date(), description: '', amount: 0, paymentMode: '' });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Save Failed", description: e.message });
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Record Other Cash Inflow</CardTitle>
        <CardDescription>Enter details of cash inflows not from downpayments.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" value={format(field.value, 'yyyy-MM-dd')} onChange={(e) => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem>
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
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading: leadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery);
  
  const otherInflowsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'other_cash_inflows'), orderBy('date', 'desc')) : null, [firestore]);
  const { data: otherInflows, isLoading: otherInflowsLoading, error: otherInflowsError } = useCollection<OtherCashInflow>(otherInflowsQuery);

  const combinedInflows = useMemo(() => {
    const downpayments = (leads || []).flatMap(lead => 
        (lead.payments || [])
            .filter(p => p.type === 'down' && p.amount > 0)
            .map((p, i) => ({
                id: `${lead.id}-${i}`,
                date: lead.submissionDateTime,
                description: `Downpayment from Lead`,
                amount: p.amount,
                paymentMode: p.mode,
                source: 'Downpayment'
            }))
    );

    const other = (otherInflows || []).map(inflow => ({
        ...inflow,
        source: 'Other'
    }));
    
    return [...downpayments, ...other].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [leads, otherInflows]);


  const grandTotal = useMemo(() => {
    return combinedInflows.reduce((sum, item) => sum + item.amount, 0);
  }, [combinedInflows]);

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
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote />
                    Cash Inflows Summary
                  </CardTitle>
                  <CardDescription>
                    Summary of all recorded cash inflows from downpayments and other sources.
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Cash Inflow</p>
                  <p className="text-2xl font-bold">{formatCurrency(grandTotal)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md h-[75vh] overflow-y-auto modern-scrollbar">
                <Table>
                  <TableHeader className="sticky top-0 bg-neutral-800 z-10">
                    <TableRow>
                      <TableHead className="text-white font-bold">Date</TableHead>
                      <TableHead className="text-white font-bold">Description</TableHead>
                      <TableHead className="text-white font-bold">Payment Method</TableHead>
                      <TableHead className="text-white font-bold text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Skeleton className="h-24 w-full" />
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-destructive">
                          Error loading data: {error.message}
                        </TableCell>
                      </TableRow>
                    ) : combinedInflows.length > 0 ? (
                      combinedInflows.map((inflow, index) => (
                        <TableRow key={`${inflow.id}-${index}`}>
                            <TableCell className="font-bold">{format(parseISO(inflow.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{inflow.description}</TableCell>
                            <TableCell>{inflow.paymentMode}</TableCell>
                            <TableCell className="text-right">{formatCurrency(inflow.amount)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No cash inflow data available.
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
