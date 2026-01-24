
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, collection, query, orderBy, deleteDoc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';

type AdSpendInquiry = {
    id: string;
    date: string;
    adAccount: string;
    adsSpent: number;
    metaInquiries: number;
    pancakeInquiries: number;
    submittedBy: string;
    timestamp: string;
};

const formSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  adAccount: z.string().min(1, 'AD Account is required.'),
  adsSpent: z.coerce.number().min(0, "Cannot be negative.").default(0),
  metaInquiries: z.coerce.number().min(0, "Cannot be negative.").default(0),
  pancakeInquiries: z.coerce.number().min(0, "Cannot be negative.").default(0),
});

type FormValues = z.infer<typeof formSchema>;

const adAccountOptions = ["Personal Account", "AD Account 101", "AD Account 102"];

function AdsVsInquiriesPage() {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [editingInquiry, setEditingInquiry] = useState<AdSpendInquiry | null>(null);
  const [deletingInquiry, setDeletingInquiry] = useState<AdSpendInquiry | null>(null);
  
  const inquiriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'ad_spend_inquiries'), orderBy('timestamp', 'desc')) : null, [firestore]);
  const { data: inquiries, isLoading, error, refetch } = useCollection<AdSpendInquiry>(inquiriesQuery);
  
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [valuesToSave, setValuesToSave] = useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      adAccount: '',
      adsSpent: 0,
      metaInquiries: 0,
      pancakeInquiries: 0,
    },
  });

  useEffect(() => {
    if (editingInquiry) {
      form.reset({
        date: new Date(editingInquiry.date),
        adAccount: editingInquiry.adAccount,
        adsSpent: editingInquiry.adsSpent || 0,
        metaInquiries: editingInquiry.metaInquiries || 0,
        pancakeInquiries: editingInquiry.pancakeInquiries || 0,
      });
    } else {
      form.reset({ date: new Date(), adAccount: '', adsSpent: 0, metaInquiries: 0, pancakeInquiries: 0 });
    }
  }, [editingInquiry, form]);
  
  const handleActualSubmit = async (values: FormValues) => {
    if (!firestore || !userProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to submit.' });
        return;
    }
    
    const dataToSave = {
        date: values.date.toISOString(),
        adAccount: values.adAccount,
        adsSpent: values.adsSpent || 0,
        metaInquiries: values.metaInquiries || 0,
        pancakeInquiries: values.pancakeInquiries || 0,
        submittedBy: userProfile.nickname,
        timestamp: new Date().toISOString(),
    };

    try {
        if (editingInquiry) {
            const inquiryRef = doc(firestore, 'ad_spend_inquiries', editingInquiry.id);
            await updateDoc(inquiryRef, dataToSave);
            toast({ title: 'Success!', description: 'Entry has been updated.' });
            setEditingInquiry(null);
        } else {
            const docId = `${format(values.date, 'yyyy-MM-dd')}_${userProfile.nickname}_${values.adAccount}`;
            const inquiryRef = doc(firestore, 'ad_spend_inquiries', docId);
            await setDoc(inquiryRef, { ...dataToSave, id: docId });
            toast({
                title: 'Success!',
                description: `Entry for ${format(values.date, 'PPP')} has been saved/replaced.`,
            });
        }
        
        form.reset({
            date: new Date(),
            adAccount: values.adAccount,
            adsSpent: 0,
            metaInquiries: 0,
            pancakeInquiries: 0,
        });
        refetch();
    } catch (e: any) {
        console.error("Error saving data:", e);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: e.message || "An unknown error occurred.",
        });
    } finally {
        setValuesToSave(null);
        setShowReplaceDialog(false);
    }
  }

  async function onSubmit(values: FormValues) {
    if (!userProfile || !firestore) return;

    if (editingInquiry) {
        await handleActualSubmit(values);
        return;
    }
    
    const docId = `${format(values.date, 'yyyy-MM-dd')}_${userProfile.nickname}_${values.adAccount}`;
    const inquiryRef = doc(firestore, 'ad_spend_inquiries', docId);
    
    const docSnap = await getDoc(inquiryRef);

    if (docSnap.exists()) {
        setValuesToSave(values);
        setShowReplaceDialog(true);
    } else {
        await handleActualSubmit(values);
    }
  }

  const confirmDelete = async () => {
    if (!deletingInquiry || !firestore) return;
    try {
        const inquiryRef = doc(firestore, 'ad_spend_inquiries', deletingInquiry.id);
        await deleteDoc(inquiryRef);
        toast({ title: 'Success!', description: 'Entry has been deleted.' });
        setDeletingInquiry(null);
        refetch();
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };
  
  return (
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-[auto_1fr] gap-8 items-start">
          <div>
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>{editingInquiry ? 'Edit' : 'Record'} Ad Spend vs. Inquiries</CardTitle>
                <CardDescription>{editingInquiry ? 'Update the details below.' : 'Enter the daily ad spend and generated inquiries.'}</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField control={form.control} name="date" render={({ field }) => (
                      <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" value={format(field.value, 'yyyy-MM-dd')} onChange={(e) => field.onChange(new Date(`${e.target.value}T00:00:00`))} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="adAccount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>AD Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger></FormControl>
                            <SelectContent>{adAccountOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="adsSpent" render={({ field }) => (
                      <FormItem><FormLabel>Ads Spent</FormLabel>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black">₱</span>
                            <FormControl>
                                <Input
                                type="text"
                                placeholder="0.00"
                                className="pl-7 text-right"
                                value={field.value ? new Intl.NumberFormat('en-US').format(field.value) : ''}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/,/g, '');
                                    if (/^\d*\.?\d*$/.test(value) || value === '') {
                                    const numericValue = parseFloat(value);
                                    field.onChange(isNaN(numericValue) ? 0 : numericValue);
                                    }
                                }}
                                />
                            </FormControl>
                        </div>
                      <FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="metaInquiries" render={({ field }) => (
                        <FormItem><FormLabel>Inquiries (Meta)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="pancakeInquiries" render={({ field }) => (
                        <FormItem><FormLabel>Inquiries (Pancake)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="flex justify-end gap-2">
                      {editingInquiry && <Button type="button" variant="outline" onClick={() => setEditingInquiry(null)}>Cancel</Button>}
                      <Button type="submit">{editingInquiry ? 'Save Changes' : 'Record Data'}</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Records</CardTitle>
                <CardDescription>A log of all recorded ad spend and inquiries.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md h-[75vh] overflow-y-auto modern-scrollbar">
                  <Table>
                    <TableHeader className="sticky top-0 bg-neutral-800 z-10">
                      <TableRow>
                        <TableHead className="text-center text-white font-bold">Date</TableHead>
                        <TableHead className="text-white font-bold">Ad Account</TableHead>
                        <TableHead className="text-center text-white font-bold">Ads Spent</TableHead>
                        <TableHead className="text-center text-white font-bold">Meta Inquiries</TableHead>
                        <TableHead className="text-center text-white font-bold">Pancake Inquiries</TableHead>
                        <TableHead className="text-center text-white font-bold">CPM</TableHead>
                        <TableHead className="text-center text-white font-bold">Submitted By</TableHead>
                        <TableHead className="text-center text-white font-bold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? [...Array(5)].map((_, i) => (<TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))
                        : error ? <TableRow><TableCell colSpan={8} className="text-center text-destructive">Error: {error.message}</TableCell></TableRow>
                        : inquiries && inquiries.length > 0 ? inquiries.map(inquiry => {
                            const cpm = inquiry.metaInquiries > 0 ? inquiry.adsSpent / inquiry.metaInquiries : 0;
                            return (
                          <TableRow key={inquiry.id}>
                            <TableCell className="text-center">{format(new Date(inquiry.date), 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                                {inquiry.adAccount}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(inquiry.adsSpent)}</TableCell>
                            <TableCell className="text-center">{inquiry.metaInquiries}</TableCell>
                            <TableCell className="text-center">{inquiry.pancakeInquiries}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(cpm)}</TableCell>
                            <TableCell className="text-center">{inquiry.submittedBy}</TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="icon" onClick={() => setEditingInquiry(inquiry)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingInquiry(inquiry)}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                            )
                        })
                        : <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No records yet.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <AlertDialog open={!!deletingInquiry} onOpenChange={() => setDeletingInquiry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the record.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Record Exists</AlertDialogTitle>
                <AlertDialogDescription>
                    An entry for this date and account already exists. Do you want to replace it with the new data?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setValuesToSave(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => valuesToSave && handleActualSubmit(valuesToSave)}>Replace</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Header>
  );
}

export default AdsVsInquiriesPage;
