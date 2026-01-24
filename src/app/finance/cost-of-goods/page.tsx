
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { useFirestore, useUser, setDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, collection, query, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '@/lib/utils';

type CostOfGoods = {
    id: string;
    date: string;
    itemDescription: string;
    supplier: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    submittedBy: string;
    timestamp: string;
};

const formSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  itemDescription: z.string().min(1, 'Item Description is required.'),
  supplier: z.string().min(1, 'Supplier is required.'),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  unitCost: z.coerce.number().min(0.01, "Unit Cost must be greater than 0."),
});

type FormValues = z.infer<typeof formSchema>;

function CostOfGoodsPage() {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [editingCogs, setEditingCogs] = useState<CostOfGoods | null>(null);
  const [deletingCogs, setDeletingCogs] = useState<CostOfGoods | null>(null);

  const cogsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'cost_of_goods'), orderBy('timestamp', 'desc')) : null, [firestore]);
  const { data: cogsData, isLoading, error, refetch } = useCollection<CostOfGoods>(cogsQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      itemDescription: '',
      supplier: '',
      quantity: 1,
      unitCost: 0,
    },
  });

  useEffect(() => {
    if (editingCogs) {
      form.reset({
        date: new Date(editingCogs.date),
        itemDescription: editingCogs.itemDescription,
        supplier: editingCogs.supplier,
        quantity: editingCogs.quantity,
        unitCost: editingCogs.unitCost,
      });
    } else {
      form.reset({ date: new Date(), itemDescription: '', supplier: '', quantity: 1, unitCost: 0 });
    }
  }, [editingCogs, form]);

  async function onSubmit(values: FormValues) {
    if (!firestore || !userProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }

    const totalCost = values.quantity * values.unitCost;

    const dataToSave = {
        date: values.date.toISOString(),
        itemDescription: values.itemDescription,
        supplier: values.supplier,
        quantity: values.quantity,
        unitCost: values.unitCost,
        totalCost: totalCost,
        submittedBy: userProfile.nickname,
        timestamp: new Date().toISOString(),
    };

    try {
        if (editingCogs) {
            const cogsRef = doc(firestore, 'cost_of_goods', editingCogs.id);
            await updateDoc(cogsRef, dataToSave);
            toast({ title: 'Success!', description: 'Cost of Goods record has been updated.' });
            setEditingCogs(null);
        } else {
            const docId = uuidv4();
            const cogsRef = doc(firestore, 'cost_of_goods', docId);
            await setDoc(cogsRef, { ...dataToSave, id: docId });
            toast({ title: 'Success!', description: 'Cost of Goods has been recorded.' });
        }
        form.reset({ date: new Date(), itemDescription: '', supplier: '', quantity: 1, unitCost: 0 });
        refetch();
    } catch (e: any) {
        toast({ variant: "destructive", title: "Save Failed", description: e.message });
    }
  }

  const confirmDelete = async () => {
    if (!deletingCogs || !firestore) return;
    try {
        const cogsRef = doc(firestore, 'cost_of_goods', deletingCogs.id);
        await deleteDoc(cogsRef);
        toast({ title: 'Success!', description: 'Record has been deleted.' });
        setDeletingCogs(null);
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
                <CardTitle>{editingCogs ? 'Edit' : 'Record'} Cost of Goods</CardTitle>
                <CardDescription>{editingCogs ? 'Update the details below.' : 'Enter the details of the cost.'}</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField control={form.control} name="date" render={({ field }) => (
                      <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" value={format(field.value, 'yyyy-MM-dd')} onChange={(e) => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="itemDescription" render={({ field }) => (
                      <FormItem><FormLabel>Item Description</FormLabel><FormControl><Input placeholder="e.g., Fabric, Thread" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="supplier" render={({ field }) => (
                      <FormItem><FormLabel>Supplier</FormLabel><FormControl><Input placeholder="e.g., Textile Corp." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="quantity" render={({ field }) => (
                        <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="unitCost" render={({ field }) => (
                        <FormItem><FormLabel>Unit Cost</FormLabel>
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
                    </div>
                    <div className="flex justify-end gap-2">
                      {editingCogs && <Button type="button" variant="outline" onClick={() => setEditingCogs(null)}>Cancel</Button>}
                      <Button type="submit">{editingCogs ? 'Save Changes' : 'Record Cost'}</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Cost of Goods Records</CardTitle>
                <CardDescription>A log of all recorded costs of goods.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md h-[75vh] overflow-y-auto modern-scrollbar">
                  <Table>
                    <TableHeader className="sticky top-0 bg-neutral-800 z-10">
                      <TableRow>
                        <TableHead className="text-center text-white font-bold">Date</TableHead>
                        <TableHead className="text-white font-bold">Item Description</TableHead>
                        <TableHead className="text-white font-bold">Supplier</TableHead>
                        <TableHead className="text-center text-white font-bold">Qty</TableHead>
                        <TableHead className="text-center text-white font-bold">Unit Cost</TableHead>
                        <TableHead className="text-center text-white font-bold">Total Cost</TableHead>
                        <TableHead className="text-center text-white font-bold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? [...Array(5)].map((_, i) => (<TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))
                        : error ? <TableRow><TableCell colSpan={7} className="text-center text-destructive">Error: {error.message}</TableCell></TableRow>
                        : cogsData && cogsData.length > 0 ? cogsData.map(cogs => (
                          <TableRow key={cogs.id}>
                            <TableCell className="text-center">{format(new Date(cogs.date), 'MMM d, yyyy')}</TableCell>
                            <TableCell>{cogs.itemDescription}</TableCell>
                            <TableCell>{cogs.supplier}</TableCell>
                            <TableCell className="text-center">{cogs.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(cogs.unitCost)}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(cogs.totalCost)}</TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="icon" onClick={() => setEditingCogs(cogs)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingCogs(cogs)}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))
                        : <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No records yet.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <AlertDialog open={!!deletingCogs} onOpenChange={() => setDeletingCogs(null)}>
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
    </Header>
  );
}

export default CostOfGoodsPage;
