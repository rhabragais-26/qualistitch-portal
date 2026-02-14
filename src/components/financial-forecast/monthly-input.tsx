
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format, parse } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { updateMonthlyForecastRollup } from '@/app/finance/financial-forecast/actions';

const forecastSchema = z.object({
  month: z.string().min(1, 'Month is required.'),
  categoryId: z.string().min(1, 'Category is required.'),
  amount: z.coerce.number().min(0, 'Amount must be a positive number.'),
  notes: z.string().optional(),
});

type ForecastFormValues = z.infer<typeof forecastSchema>;

type FinanceCategory = { id: string; name: string; group: string; };
type FinanceForecastMonthly = ForecastFormValues & {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

export function MonthlyForecastInput() {
  const firestore = useFirestore();
  const { userProfile, isAdmin } = useUser();
  const { toast } = useToast();
  
  const [editingRecord, setEditingRecord] = useState<FinanceForecastMonthly | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<FinanceForecastMonthly | null>(null);
  
  const [monthFilter, setMonthFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const canEdit = isAdmin || userProfile?.position === 'Finance';
  
  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'financeCategories'), orderBy('name')) : null, [firestore]);
  const { data: categories, isLoading: categoriesLoading } = useCollection<FinanceCategory>(categoriesQuery);

  const forecastQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'financeForecastMonthly'), orderBy('month', 'desc'), orderBy('updatedAt', 'desc')) : null, [firestore]);
  const { data: forecasts, isLoading: forecastsLoading, refetch } = useCollection<FinanceForecastMonthly>(forecastQuery);

  const form = useForm<ForecastFormValues>({
    resolver: zodResolver(forecastSchema),
    defaultValues: { month: format(new Date(), 'yyyy-MM'), categoryId: '', amount: 0, notes: '' },
  });

  useEffect(() => {
    if (editingRecord) {
      form.reset({
        month: editingRecord.month,
        categoryId: editingRecord.categoryId,
        amount: editingRecord.amount,
        notes: editingRecord.notes || '',
      });
    } else {
      form.reset({ month: format(new Date(), 'yyyy-MM'), categoryId: '', amount: 0, notes: '' });
    }
  }, [editingRecord, form]);

  const onSubmit = async (values: ForecastFormValues) => {
    if (!firestore || !userProfile) return;
    
    const docId = editingRecord?.id || `${values.month}_${values.categoryId}`;
    const docRef = doc(firestore, 'financeForecastMonthly', docId);

    const dataToSave = {
      ...values,
      updatedAt: new Date().toISOString(),
      ...(editingRecord ? {} : { 
        id: docId,
        createdAt: new Date().toISOString(),
        createdBy: userProfile.uid
      })
    };

    try {
      await setDoc(docRef, dataToSave, { merge: true });
      await updateMonthlyForecastRollup(values.month);
      if (editingRecord && editingRecord.month !== values.month) {
        await updateMonthlyForecastRollup(editingRecord.month);
      }
      
      toast({ title: `Forecast ${editingRecord ? 'Updated' : 'Saved'}`, description: `Data for ${values.month} has been saved.` });
      form.reset({ month: values.month, categoryId: '', amount: 0, notes: '' });
      setEditingRecord(null);
      refetch();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    }
  };

  const handleDelete = async () => {
    if (!deletingRecord || !firestore) return;
    try {
        const docRef = doc(firestore, 'financeForecastMonthly', deletingRecord.id);
        await deleteDoc(docRef);
        await updateMonthlyForecastRollup(deletingRecord.month);
        toast({ title: 'Forecast Deleted', description: 'The record has been removed.' });
        refetch();
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    } finally {
        setDeletingRecord(null);
    }
  };

  const filteredForecasts = useMemo(() => {
    if (!forecasts) return [];
    return forecasts.filter(f => 
        (monthFilter === '' || f.month === monthFilter) &&
        (categoryFilter === 'All' || f.categoryId === categoryFilter) &&
        (searchTerm === '' || 
            categories?.find(c => c.id === f.categoryId)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.notes?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [forecasts, monthFilter, categoryFilter, searchTerm, categories]);

  const monthOptions = useMemo(() => {
    if (!forecasts) return [];
    return [...new Set(forecasts.map(f => f.month))];
  }, [forecasts]);

  const isLoading = categoriesLoading || forecastsLoading;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start mt-6">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>{editingRecord ? 'Edit' : 'Add'} Monthly Forecast</CardTitle>
                    <CardDescription>Enter forecasted expense for a specific month and category.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <fieldset disabled={!canEdit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="month" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Month</FormLabel>
                                            <Input type="month" {...field} />
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="categoryId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Category</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={categoriesLoading}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="amount" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount</FormLabel>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black">₱</span>
                                            <FormControl>
                                                <Input
                                                    type="text" placeholder="0.00" className="pl-7 text-right"
                                                    value={field.value ? new Intl.NumberFormat('en-US').format(field.value) : ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/,/g, '');
                                                        if (/^\d*\.?\d*$/.test(value) || value === '') {
                                                            field.onChange(isNaN(parseFloat(value)) ? 0 : parseFloat(value));
                                                        }
                                                    }}
                                                />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="notes" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes (Optional)</FormLabel>
                                        <Textarea placeholder="Add any relevant notes..." {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <div className="flex justify-end gap-2">
                                    {editingRecord && <Button type="button" variant="outline" onClick={() => setEditingRecord(null)}>Cancel</Button>}
                                    <Button type="button" variant="ghost" onClick={() => form.reset({ month: form.getValues('month'), categoryId: '', amount: 0, notes: '' })}>Clear</Button>
                                    <Button type="submit">{editingRecord ? 'Update Record' : 'Save Record'}</Button>
                                </div>
                            </fieldset>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-3">
             <Card>
                <CardHeader>
                    <CardTitle>Monthly Forecast Records</CardTitle>
                    <div className="flex items-center gap-2 pt-2">
                        <Input placeholder="Search notes or category..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-xs" />
                        <Select value={monthFilter} onValueChange={setMonthFilter}>
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by Month" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Months</SelectItem>
                                {monthOptions.map(m => <SelectItem key={m} value={m}>{format(parse(m, 'yyyy-MM', new Date()), 'MMMM yyyy')}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by Category" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Categories</SelectItem>
                                {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md h-[60vh] overflow-y-auto modern-scrollbar">
                        <Table>
                            <TableHeader className="sticky top-0 bg-neutral-800 z-10">
                                <TableRow>
                                    <TableHead className="text-white">Month</TableHead>
                                    <TableHead className="text-white">Category</TableHead>
                                    <TableHead className="text-white text-right">Amount</TableHead>
                                    <TableHead className="text-white">Notes</TableHead>
                                    <TableHead className="text-white">Updated</TableHead>
                                    {canEdit && <TableHead className="text-white text-center">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={canEdit ? 6 : 5}><Skeleton className="h-8 w-full"/></TableCell></TableRow>)
                                    : error ? <TableRow><TableCell colSpan={canEdit ? 6 : 5} className="text-center text-destructive">Error: {error.message}</TableCell></TableRow>
                                    : filteredForecasts.length > 0 ? filteredForecasts.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{format(parse(item.month, 'yyyy-MM', new Date()), 'MMM yyyy')}</TableCell>
                                            <TableCell>{categories?.find(c => c.id === item.categoryId)?.name}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                            <TableCell className="max-w-[200px] truncate">{item.notes}</TableCell>
                                            <TableCell>{format(new Date(item.updatedAt), 'MMM dd, h:mm a')}</TableCell>
                                            {canEdit && <TableCell className="text-center">
                                                <Button variant="ghost" size="icon" onClick={() => setEditingRecord(item)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingRecord(item)}><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>}
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground">No records found.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
        <AlertDialog open={!!deletingRecord} onOpenChange={() => setDeletingRecord(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete the record. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
