'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
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
import { format, isPast } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Edit, Trash2, PlusCircle, Checkbox, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '../ui/dialog';
import { v4 as uuidv4 } from 'uuid';
import { updateMonthlyForecastRollup } from '@/app/finance/financial-forecast/actions';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';

const scheduledExpenseSchema = z.object({
    date: z.string().min(1, 'Date is required.'),
    categoryId: z.string().min(1, 'Category is required.'),
    amount: z.coerce.number().min(0, 'Amount must be a positive number.'),
    vendor: z.string().optional(),
    notes: z.string().optional(),
    recurrence: z.enum(['One-time', 'Weekly', 'Monthly']),
    endDate: z.string().optional(),
  }).refine(data => !data.endDate || new Date(data.endDate) > new Date(data.date), {
    message: "End date must be after the start date.",
    path: ["endDate"],
  });

type ScheduledExpenseFormValues = z.infer<typeof scheduledExpenseSchema>;

type FinanceCategory = { id: string; name: string; group: string; };
type FinanceForecastScheduled = ScheduledExpenseFormValues & {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

function ScheduledExpenseForm({ onSave, existingRecord, onClose }: { onSave: (data: any) => void; existingRecord: Partial<FinanceForecastScheduled> | null; onClose: () => void; }) {
    const { userProfile } = useUser();
    const firestore = useFirestore();
    const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'financeCategories'), orderBy('name')) : null, [firestore]);
    const { data: categories, isLoading: categoriesLoading } = useCollection<FinanceCategory>(categoriesQuery, undefined, { listen: false });
  
    const form = useForm<ScheduledExpenseFormValues>({
      resolver: zodResolver(scheduledExpenseSchema),
      defaultValues: {
        date: existingRecord?.date ? format(new Date(existingRecord.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        categoryId: existingRecord?.categoryId || '',
        amount: existingRecord?.amount || 0,
        vendor: existingRecord?.vendor || '',
        notes: existingRecord?.notes || '',
        recurrence: existingRecord?.recurrence || 'One-time',
        endDate: existingRecord?.endDate ? format(new Date(existingRecord.endDate), 'yyyy-MM-dd') : '',
      },
    });

    const recurrenceValue = form.watch('recurrence');
  
    const onSubmit = (data: ScheduledExpenseFormValues) => {
        const dataToSave = {
            ...data,
            id: existingRecord?.id || uuidv4(),
            updatedAt: new Date().toISOString(),
            ...(existingRecord ? {} : {
                createdAt: new Date().toISOString(),
                createdBy: userProfile?.uid
            })
        }
        onSave(dataToSave);
    };
  
    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="date" render={({ field }) => (
                        <FormItem><FormLabel>Start/Due Date</FormLabel><Input type="date" {...field} /><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="categoryId" render={({ field }) => (
                        <FormItem><FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={categoriesLoading}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl>
                            <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="amount" render={({ field }) => (
                        <FormItem><FormLabel>Amount</FormLabel>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2">₱</span>
                            <Input type="text" placeholder="0.00" className="pl-7 text-right" 
                                value={field.value ? new Intl.NumberFormat('en-US').format(field.value) : ''}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/,/g, '');
                                    field.onChange(isNaN(parseFloat(value)) ? 0 : parseFloat(value));
                                }}
                            /><FormMessage />
                        </div>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="vendor" render={({ field }) => (
                        <FormItem><FormLabel>Vendor/Payee (Optional)</FormLabel><Input {...field} /><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="recurrence" render={({ field }) => (
                    <FormItem><FormLabel>Recurrence</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="One-time">One-time</SelectItem>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                        </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />

                {recurrenceValue !== 'One-time' && (
                    <FormField control={form.control} name="endDate" render={({ field }) => (
                        <FormItem><FormLabel>End Date (Optional)</FormLabel><Input type="date" {...field} /><FormMessage /></FormItem>
                    )} />
                )}

                <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Notes (Optional)</FormLabel><Textarea {...field} /><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Save</Button>
                </DialogFooter>
            </form>
        </FormProvider>
    );
  }

export function ScheduledExpenses() {
    const firestore = useFirestore();
    const { userProfile, isAdmin } = useUser();
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<FinanceForecastScheduled | null>(null);
    const [deletingRecord, setDeletingRecord] = useState<FinanceForecastScheduled | null>(null);

    const canEdit = isAdmin || userProfile?.position === 'Finance';

    const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'financeCategories'), orderBy('name')) : null, [firestore]);
    const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCollection<FinanceCategory>(categoriesQuery, undefined, { listen: false });

    const scheduledQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'financeForecastScheduled'), orderBy('date', 'desc')) : null, [firestore]);
    const { data: scheduledExpenses, isLoading: expensesLoading, error: expensesError, refetch } = useCollection<FinanceForecastScheduled>(scheduledQuery, undefined, { listen: false });

    const handleSave = async (data: FinanceForecastScheduled) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'financeForecastScheduled', data.id);
        
        try {
            await setDoc(docRef, data, { merge: true });
            
            // Trigger rollups for affected months
            const affectedMonths = new Set<string>();
            affectedMonths.add(format(new Date(data.date), 'yyyy-MM'));
            if (editingRecord) {
              affectedMonths.add(format(new Date(editingRecord.date), 'yyyy-MM'));
            }
            // More complex logic would be needed here for recurring items spanning many months
            // For now, we update the start month.
            await Promise.all(Array.from(affectedMonths).map(month => updateMonthlyForecastRollup(month)));

            toast({ title: `Scheduled Expense ${editingRecord ? 'Updated' : 'Saved'}` });
            setIsFormOpen(false);
            setEditingRecord(null);
            refetch();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
        }
    };

    const handleDelete = async () => {
        if (!deletingRecord || !firestore) return;
        try {
            const docRef = doc(firestore, 'financeForecastScheduled', deletingRecord.id);
            await deleteDoc(docRef);
            await updateMonthlyForecastRollup(format(new Date(deletingRecord.date), 'yyyy-MM'));
            toast({ title: 'Record Deleted' });
            refetch();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
        } finally {
            setDeletingRecord(null);
        }
    };
    
    const getStatus = (record: FinanceForecastScheduled) => {
        if (record.recurrence !== 'One-time') {
          return <Badge variant="secondary">Recurring</Badge>;
        }
        if (isPast(new Date(record.date))) {
          return <Badge variant="destructive">Overdue</Badge>;
        }
        return <Badge className="bg-green-600">Upcoming</Badge>;
    };

    const isLoading = categoriesLoading || expensesLoading;
    const error = categoriesError || expensesError;

    return (
        <div className="mt-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Scheduled Expenses</CardTitle>
                            <CardDescription>Manage recurring and one-time future expenses.</CardDescription>
                        </div>
                        {canEdit && (
                            <Button onClick={() => { setEditingRecord(null); setIsFormOpen(true); }}><PlusCircle className="mr-2 h-4 w-4"/>Add Scheduled Expense</Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md h-[60vh] overflow-y-auto modern-scrollbar">
                        <Table>
                            <TableHeader className="sticky top-0 bg-neutral-800 z-10">
                                <TableRow>
                                    <TableHead className="text-white">Date</TableHead>
                                    <TableHead className="text-white">Category</TableHead>
                                    <TableHead className="text-white text-right">Amount</TableHead>
                                    <TableHead className="text-white">Recurrence</TableHead>
                                    <TableHead className="text-white">Vendor</TableHead>
                                    <TableHead className="text-white">Notes</TableHead>
                                    <TableHead className="text-white text-center">Status</TableHead>
                                    {canEdit && <TableHead className="text-white text-center">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={canEdit ? 8 : 7}><Skeleton className="h-8 w-full"/></TableCell></TableRow>)
                                    : error ? <TableRow><TableCell colSpan={canEdit ? 8 : 7} className="text-center text-destructive">Error: {error.message}</TableCell></TableRow>
                                    : scheduledExpenses && scheduledExpenses.length > 0 ? scheduledExpenses.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{format(new Date(item.date), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell>{categories?.find(c => c.id === item.categoryId)?.name}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                            <TableCell>{item.recurrence}</TableCell>
                                            <TableCell>{item.vendor}</TableCell>
                                            <TableCell className="max-w-[200px] truncate">{item.notes}</TableCell>
                                            <TableCell className="text-center">{getStatus(item)}</TableCell>
                                            {canEdit && <TableCell className="text-center">
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingRecord(item); setIsFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingRecord(item)}><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>}
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground">No scheduled expenses found.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                         <DialogTitle>{editingRecord ? 'Edit Scheduled Expense' : 'Add Scheduled Expense'}</DialogTitle>
                    </DialogHeader>
                    <ScheduledExpenseForm onSave={handleSave} existingRecord={editingRecord} onClose={() => setIsFormOpen(false)} />
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deletingRecord} onOpenChange={() => setDeletingRecord(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete this scheduled expense. This action cannot be undone.</AlertDialogDescription>
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
