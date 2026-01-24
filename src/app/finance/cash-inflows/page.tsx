'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, doc, setDoc, orderBy, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
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
import { format, parseISO, subDays } from 'date-fns';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Banknote, Edit, Trash2, Check } from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


// Types for downpayments from leads
type Payment = {
  id?: string;
  type: 'down' | 'full' | 'balance' | 'additional';
  amount: number;
  mode: string;
  timestamp?: string;
  processedBy?: string;
  verified?: boolean;
  verifiedBy?: string;
  verifiedTimestamp?: string;
};

type Lead = {
  id: string;
  customerName: string;
  joNumber?: number;
  payments?: Payment[];
  submissionDateTime: string;
  salesRepresentative: string;
  lastModifiedBy?: string;
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

// Updated OtherInflowsForm to handle edits
function OtherInflowsForm({
  editingInflow,
  onSaveComplete,
}: {
  editingInflow: OtherCashInflow | null;
  onSaveComplete: () => void;
}) {
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

  useEffect(() => {
    if (editingInflow) {
      form.reset({
        date: new Date(editingInflow.date),
        customerName: editingInflow.customerName,
        description: editingInflow.description,
        amount: editingInflow.amount,
        paymentMode: editingInflow.paymentMode,
      });
    } else {
      form.reset({
        date: new Date(),
        customerName: '',
        description: '',
        amount: 0,
        paymentMode: '',
      });
    }
  }, [editingInflow, form]);

  async function onSubmit(values: OtherInflowFormValues) {
    if (!firestore || !userProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }
    
    const dataToSave = {
        date: values.date.toISOString(),
        customerName: values.customerName,
        description: values.description,
        amount: values.amount,
        paymentMode: values.paymentMode,
        submittedBy: userProfile.nickname,
        timestamp: new Date().toISOString(),
    };

    try {
      if (editingInflow) {
        const inflowRef = doc(firestore, 'other_cash_inflows', editingInflow.id);
        await updateDoc(inflowRef, dataToSave);
        toast({ title: 'Success!', description: 'Cash inflow has been updated.' });
      } else {
        const docId = uuidv4();
        const inflowRef = doc(firestore, 'other_cash_inflows', docId);
        await setDoc(inflowRef, { ...dataToSave, id: docId });
        toast({ title: 'Success!', description: 'Cash inflow has been recorded.' });
      }
      onSaveComplete();
    } catch (e: any) {
        toast({ variant: "destructive", title: "Save Failed", description: e.message });
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{editingInflow ? 'Edit' : 'Record'} Other Cash Inflow</CardTitle>
        <CardDescription>{editingInflow ? 'Update the details below.' : 'Enter details of cash inflows not from lead payments.'}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" className="w-48" value={format(field.value, 'yyyy-MM-dd')} onChange={(e) => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="customerName" render={({ field }) => (
              <FormItem><FormLabel>Customer Name</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="e.g., Sale of scrap materials" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black">₱</span>
                        <FormControl>
                            <Input type="text" placeholder="0.00" {...field} className="pl-7" />
                        </FormControl>
                    </div>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="paymentMode" render={({ field }) => (
                <FormItem><FormLabel>Payment Mode</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select mode of payment" /></SelectTrigger></FormControl>
                    <SelectContent>{paymentModes.map(mode => <SelectItem key={mode} value={mode}>{mode}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage /></FormItem>
            )} />
            <div className="flex justify-end gap-2">
              {editingInflow && <Button type="button" variant="outline" onClick={onSaveComplete}>Cancel</Button>}
              <Button type="submit">{editingInflow ? 'Save Changes' : 'Record Inflow'}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function CashInflowsPage() {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const [monthFilter, setMonthFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  
  const [editingInflow, setEditingInflow] = useState<OtherCashInflow | null>(null);
  const [deletingInflow, setDeletingInflow] = useState<OtherCashInflow | null>(null);
  const { toast } = useToast();
  const [verifyingPayment, setVerifyingPayment] = useState<{ leadId: string; paymentIndex: number } | null>(null);
  const [activeQuickFilter, setActiveQuickFilter] = useState<'yesterday' | 'today' | null>(null);

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading: leadsLoading, error: leadsError, refetch: refetchLeads } = useCollection<Lead>(leadsQuery);
  
  const otherInflowsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'other_cash_inflows'), orderBy('date', 'desc')) : null, [firestore]);
  const { data: otherInflows, isLoading: otherInflowsLoading, error: otherInflowsError, refetch: refetchOtherInflows } = useCollection<OtherCashInflow>(otherInflowsQuery);

  const formatJoNumber = (joNumber: number | undefined): string => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  };

  const combinedInflows = useMemo(() => {
    const leadPayments = (leads || []).flatMap((lead, leadIndex) => 
        (lead.payments || [])
            .filter(p => p.amount > 0)
            .map((p, paymentIndex) => {
                let description: string;
                switch (p.type) {
                    case 'down': description = 'Downpayment'; break;
                    case 'full': description = 'Full Payment'; break;
                    case 'balance': description = 'Balance Payment'; break;
                    case 'additional': description = 'Additional Payment'; break;
                    default: description = 'Payment'; break;
                }
                
                let processedBy = p.processedBy || lead.salesRepresentative;
                if (processedBy === 'Finance' && lead.lastModifiedBy) {
                    processedBy = lead.lastModifiedBy;
                }

                return {
                    id: `${lead.id}-${p.id || paymentIndex}`, // A unique ID for the row
                    leadId: lead.id, // ID of the lead document
                    paymentIndex: paymentIndex, // Index of the payment in the array
                    date: p.timestamp || lead.submissionDateTime,
                    customerName: lead.customerName,
                    description: description,
                    amount: p.amount,
                    paymentMode: p.mode,
                    source: 'Lead Payment',
                    joNumber: lead.joNumber,
                    processedBy: processedBy,
                    verified: p.verified,
                    verifiedBy: p.verifiedBy,
                    verifiedTimestamp: p.verifiedTimestamp,
                    type: p.type
                };
            })
    );

    const other = (otherInflows || []).map(inflow => ({
        ...inflow,
        source: 'Other',
        joNumber: undefined,
        processedBy: inflow.submittedBy,
        leadId: inflow.id,
        paymentIndex: -1,
        type: 'other' as const,
        verified: true,
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

  const handleSaveComplete = () => {
    setEditingInflow(null);
    refetchOtherInflows();
  }

  const confirmDelete = async () => {
    if (!deletingInflow || !firestore) return;
    try {
      const inflowRef = doc(firestore, 'other_cash_inflows', deletingInflow.id);
      await deleteDoc(inflowRef);
      toast({ title: 'Success!', description: 'Inflow record has been deleted.' });
      setDeletingInflow(null);
      refetchOtherInflows();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleConfirmVerification = async () => {
    if (!verifyingPayment || !firestore || !userProfile) return;

    const { leadId, paymentIndex } = verifyingPayment;
    const leadRef = doc(firestore, 'leads', leadId);

    try {
        const leadSnap = await getDoc(leadRef);
        if (!leadSnap.exists()) {
            throw new Error("Lead document not found.");
        }
        
        const leadData = leadSnap.data() as Lead;
        const updatedPayments = [...(leadData.payments || [])];
        
        if (updatedPayments[paymentIndex]) {
            updatedPayments[paymentIndex] = {
                ...updatedPayments[paymentIndex],
                verified: true,
                verifiedBy: userProfile.nickname,
                verifiedTimestamp: new Date().toISOString(),
            };
        } else {
            throw new Error("Payment not found at the specified index.");
        }

        await updateDoc(leadRef, { payments: updatedPayments });

        toast({
            title: 'Payment Verified!',
            description: 'The payment has been successfully verified.',
        });
        
        refetchLeads();

    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Verification Failed",
            description: e.message || "Could not verify the payment.",
        });
    } finally {
        setVerifyingPayment(null);
    }
  };

  return (
    <>
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 grid grid-cols-1 xl:grid-cols-[auto_1fr] gap-8 items-start">
        <div>
            <OtherInflowsForm 
              editingInflow={editingInflow}
              onSaveComplete={handleSaveComplete}
            />
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
               <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Select value={monthFilter} onValueChange={(value) => { setMonthFilter(value); setDateFilter('All'); setActiveQuickFilter(null); }}>
                    <SelectTrigger className="w-[160px]">
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
                  <Select value={dateFilter} onValueChange={(value) => { setDateFilter(value); setActiveQuickFilter(null); }}>
                    <SelectTrigger className="w-[160px]">
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
                  <Button
                        variant={activeQuickFilter === 'yesterday' ? 'default' : 'outline'}
                        onClick={() => {
                            if (activeQuickFilter === 'yesterday') {
                                setActiveQuickFilter(null);
                                setDateFilter('All');
                                setMonthFilter('All');
                            } else {
                                setActiveQuickFilter('yesterday');
                                const yesterday = subDays(new Date(), 1);
                                setDateFilter(format(yesterday, 'yyyy-MM-dd'));
                                setMonthFilter(format(yesterday, 'yyyy-MM'));
                            }
                        }}
                    >Yesterday</Button>
                    <Button
                        variant={activeQuickFilter === 'today' ? 'default' : 'outline'}
                        onClick={() => {
                            if (activeQuickFilter === 'today') {
                                setActiveQuickFilter(null);
                                setDateFilter('All');
                                setMonthFilter('All');
                            } else {
                                setActiveQuickFilter('today');
                                const today = new Date();
                                setDateFilter(format(today, 'yyyy-MM-dd'));
                                setMonthFilter(format(today, 'yyyy-MM'));
                            }
                        }}
                    >Today</Button>
                  <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                      <SelectTrigger className="w-[200px]">
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
                    className="w-[200px]"
                  />
                  <Button onClick={() => { setMonthFilter('All'); setDateFilter('All'); setPaymentMethodFilter('All'); setJoNumberSearch(''); setActiveQuickFilter(null); }}>Reset Filters</Button>
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
                      <TableHead className="text-white font-bold text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Skeleton className="h-24 w-full" />
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-destructive">
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
                            <TableCell className="text-center">
                              {inflow.source === 'Lead Payment' ? (
                                inflow.verified ? (
                                  <div className="flex flex-col items-center justify-center text-sm text-green-600 font-semibold">
                                      <Check className="mr-2 h-4 w-4" />
                                      Verified
                                      {inflow.verifiedTimestamp && (
                                          <TooltipProvider>
                                              <Tooltip>
                                                  <TooltipTrigger asChild>
                                                      <div className="text-[10px] text-gray-500 ml-2 cursor-pointer">({formatDateTime(inflow.verifiedTimestamp).dateTimeShort})</div>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                      <p>Verified by {inflow.verifiedBy}</p>
                                                  </TooltipContent>
                                              </Tooltip>
                                          </TooltipProvider>
                                      )}
                                  </div>
                                ) : (
                                  <Button size="sm" onClick={() => setVerifyingPayment({ leadId: inflow.leadId, paymentIndex: inflow.paymentIndex })}>
                                    Verify
                                  </Button>
                                )
                              ) : inflow.source === 'Other' ? (
                                <div className="flex justify-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => setEditingInflow(inflow as OtherCashInflow)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingInflow(inflow as OtherCashInflow)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : null}
                            </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
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
    <AlertDialog open={!!deletingInflow} onOpenChange={() => setDeletingInflow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the inflow record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
     <AlertDialog open={!!verifyingPayment} onOpenChange={() => setVerifyingPayment(null)}>
      <AlertDialogContent>
          <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
              Please confirm that this payment has been received.
          </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmVerification}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
