
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { useFirestore, useUser, setDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, collection, query, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useMemo } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '@/lib/utils';

type OperationalExpense = {
    id: string;
    date: string;
    category: string;
    description: string;
    amount: number;
    submittedBy: string;
    timestamp: string;
};

const formSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  category: z.string().min(1, 'Category is required.'),
  description: z.string().min(1, 'Description is required.'),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0."),
});

type FormValues = z.infer<typeof formSchema>;

const expenseCategories = ["Salaries & Wages", "Rent & Lease", "Utilities", "Marketing & Advertising", "Office Supplies", "Travel & Transportation", "Repairs & Maintenance", "Taxes & Licenses", "Professional Services", "Others"];

function OperationalExpensesPage() {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [editingExpense, setEditingExpense] = useState<OperationalExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<OperationalExpense | null>(null);

  const expensesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'operational_expenses'), orderBy('timestamp', 'desc')) : null, [firestore]);
  const { data: expenses, isLoading, error, refetch } = useCollection<OperationalExpense>(expensesQuery, undefined, { listen: false });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      category: '',
      description: '',
      amount: 0,
    },
  });

  useEffect(() => {
    if (editingExpense) {
      form.reset({
        date: new Date(editingExpense.date),
        category: editingExpense.category,
        description: editingExpense.description,
        amount: editingExpense.amount,
      });
    } else {
      form.reset({
        date: new Date(),
        category: '',
        description: '',
        amount: 0,
      });
    }
  }, [editingExpense, form]);

  async function onSubmit(values: FormValues) {
    if (!firestore || !userProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }

    const dataToSave = {
        date: values.date.toISOString(),
        category: values.category,
        description: values.description,
        amount: values.amount,
        submittedBy: userProfile.nickname,
        timestamp: new Date().toISOString(),
    };

    try {
        if (editingExpense) {
            const expenseRef = doc(firestore, 'operational_expenses', editingExpense.id);
            await updateDoc(expenseRef, dataToSave);
            toast({ title: 'Success!', description: 'Expense has been updated.' });
            setEditingExpense(null);
        } else {
            const docId = uuidv4();
            const expenseRef = doc(firestore, 'operational_expenses', docId);
            await setDoc(expenseRef, { ...dataToSave, id: docId });
            toast({ title: 'Success!', description: 'Expense has been recorded.' });
        }
        form.reset({ date: new Date(), category: '', description: '', amount: 0 });
        refetch();
    } catch (e: any) {
        toast({ variant: "destructive", title: "Save Failed", description: e.message });
    }
  }

  const confirmDelete = async () => {
    if (!deletingExpense || !firestore) return;
    try {
        const expenseRef = doc(firestore, 'operational_expenses', deletingExpense.id);
        await deleteDoc(expenseRef);
        toast({ title: 'Success!', description: 'Expense has been deleted.' });
        setDeletingExpense(null);
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
                <CardTitle>{editingExpense ? 'Edit' : 'Record'} Operational Expense</CardTitle>
                <CardDescription>{editingExpense ? 'Update the details below.' : 'Enter the details of the expense.'}</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField control={form.control} name="date" render={({ field }) => (
                      <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" value={format(field.value, 'yyyy-MM-dd')} onChange={(e) => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl><SelectContent>{expenseCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., Office electricity bill" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem><FormLabel>Amount</FormLabel>
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
                    <div className="flex justify-end gap-2">
                      {editingExpense && <Button type="button" variant="outline" onClick={() => setEditingExpense(null)}>Cancel</Button>}
                      <Button type="submit">{editingExpense ? 'Save Changes' : 'Record Expense'}</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Expense Records</CardTitle>
                <CardDescription>A log of all recorded operational expenses.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md h-[75vh] overflow-y-auto modern-scrollbar">
                  <Table>
                    <TableHeader className="sticky top-0 bg-neutral-800 z-10">
                      <TableRow>
                        <TableHead className="text-center text-white font-bold">Date</TableHead>
                        <TableHead className="text-center text-white font-bold">Category</TableHead>
                        <TableHead className="text-white font-bold">Description</TableHead>
                        <TableHead className="text-center text-white font-bold">Amount</TableHead>
                        <TableHead className="text-center text-white font-bold">Submitted By</TableHead>
                        <TableHead className="text-center text-white font-bold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? [...Array(8)].map((_, i) => (<TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))
                        : error ? <TableRow><TableCell colSpan={6} className="text-center text-destructive">Error: {error.message}</TableCell></TableRow>
                        : expenses && expenses.length > 0 ? expenses.map(expense => (
                          <TableRow key={expense.id}>
                            <TableCell className="text-center">{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="text-center">{expense.category}</TableCell>
                            <TableCell>{expense.description}</TableCell>
                            <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                            <TableCell className="text-center">{expense.submittedBy}</TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="icon" onClick={() => setEditingExpense(expense)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingExpense(expense)}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))
                        : <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No expenses recorded yet.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <AlertDialog open={!!deletingExpense} onOpenChange={() => setDeletingExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the expense record.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Header>
  );
}

export default OperationalExpensesPage;
