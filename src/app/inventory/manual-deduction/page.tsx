'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Boxes, Palette, Ruler, Plus, User, Calendar, MessageSquare, Trash2 } from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase, useUser, useCollection } from '@/firebase';
import { doc, collection, query, runTransaction, orderBy } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { toTitleCase, formatDateTime } from '@/lib/utils';
import { Header } from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import type { PricingConfig } from '@/lib/pricing';
import { initialPricingConfig } from '@/lib/pricing-data';

// Schemas and Types
const deductionItemSchema = z.object({
  id: z.string(),
  productType: z.string().min(1, "Required"),
  color: z.string().min(1, "Required"),
  size: z.string().min(1, "Required"),
  quantity: z.number().min(1, "Must be at least 1"),
});
type DeductionItem = z.infer<typeof deductionItemSchema>;

const deductionFormSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  endorsedTo: z.string().min(1, "Endorsed to is required."),
  reason: z.enum(["Freebies", "For Marketing Purposes", "Error Replacement", "c/o Sir Than", "For Showroom"]),
});
type DeductionFormValues = z.infer<typeof deductionFormSchema>;

type ManualDeduction = {
  id: string;
  date: string;
  submittedBy: string;
  endorsedTo: string;
  reason: string;
  items: Omit<DeductionItem, 'id'>[];
  timestamp: string;
};

// Main component
export default function ManualDeductionPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const [stagedItems, setStagedItems] = useState<DeductionItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const pricingConfigRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'pricing', 'default') : null),
    [firestore]
  );
  const { data: fetchedConfig } = useDoc<PricingConfig>(pricingConfigRef);

  const pricingConfig = useMemo(() => fetchedConfig || initialPricingConfig, [fetchedConfig]);
  
  const productTypes = useMemo(() => {
    if (!pricingConfig) return [];
    return Object.keys(pricingConfig.productGroupMapping || {}).sort();
  }, [pricingConfig]);

  const deductionForm = useForm<DeductionFormValues>({
    resolver: zodResolver(deductionFormSchema),
    defaultValues: { date: new Date() },
  });

  const deductionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'manual_item_deductions'), orderBy('timestamp', 'desc')) : null, [firestore]);
  const { data: deductions, isLoading } = useCollection<ManualDeduction>(deductionsQuery);

  const handleAddItem = (item: Omit<DeductionItem, 'id'>) => {
    setStagedItems(prev => [...prev, { ...item, id: uuidv4() }]);
  };

  const handleRemoveItem = (id: string) => {
    setStagedItems(prev => prev.filter(item => item.id !== id));
  };
  
  const handleSaveDeduction = async (data: DeductionFormValues) => {
    if (!firestore || !userProfile || stagedItems.length === 0) {
      toast({ variant: 'destructive', title: 'No items to deduct', description: 'Please add at least one item.' });
      return;
    }
    setIsSaving(true);
    
    const deductionId = uuidv4();
    const deductionRef = doc(firestore, 'manual_item_deductions', deductionId);
    
    const deductionData: ManualDeduction = {
      id: deductionId,
      date: data.date.toISOString(),
      submittedBy: userProfile.nickname,
      endorsedTo: data.endorsedTo,
      reason: data.reason,
      items: stagedItems.map(({ id, ...item }) => item), // remove temporary client-side ID
      timestamp: new Date().toISOString(),
    };

    try {
      await runTransaction(firestore, async (transaction) => {
        // 1. Save the deduction record
        transaction.set(deductionRef, deductionData);

        // 2. Decrement inventory stock for each item
        for (const item of stagedItems) {
          const inventoryItemId = `${item.productType}-${item.color}-${item.size}`.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-');
          const inventoryDocRef = doc(firestore, 'inventory', inventoryItemId);
          
          const inventoryDoc = await transaction.get(inventoryDocRef);
          if (!inventoryDoc.exists()) {
            throw new Error(`Inventory item not found for: ${item.productType} ${item.color} ${item.size}`);
          }
          const currentStock = inventoryDoc.data().stock || 0;
          const newStock = currentStock - item.quantity;
          transaction.update(inventoryDocRef, { stock: newStock });
        }
      });

      toast({ title: 'Success!', description: 'Manual deduction has been recorded and inventory updated.' });
      setStagedItems([]);
      deductionForm.reset({ date: new Date(), endorsedTo: '', reason: undefined });
    } catch (e: any) {
      console.error('Deduction failed:', e);
      toast({ variant: 'destructive', title: 'Deduction Failed', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Header>
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Manual Item Deduction</CardTitle>
                <CardDescription>Record inventory deductions for special cases.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...deductionForm}>
                  <form onSubmit={deductionForm.handleSubmit(handleSaveDeduction)} className="space-y-4">
                    <FormField control={deductionForm.control} name="date" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><Calendar /> Date</FormLabel>
                        <FormControl><Input type="date" value={format(field.value, 'yyyy-MM-dd')} onChange={(e) => field.onChange(new Date(e.target.value))} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={deductionForm.control} name="endorsedTo" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><User /> Endorsed To (Employee)</FormLabel>
                        <FormControl><Input placeholder="Enter employee name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={deductionForm.control} name="reason" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><MessageSquare /> Reason</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {["Freebies", "For Marketing Purposes", "Error Replacement", "c/o Sir Than", "For Showroom"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <Separator />
                    
                    <AddItemSubForm onAddItem={handleAddItem} productTypes={productTypes} />

                    <div className="pt-4 flex justify-end">
                      <Button type="submit" disabled={isSaving || stagedItems.length === 0}>
                        {isSaving ? 'Saving...' : 'Save Deduction'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-3">
             <Card>
                <CardHeader>
                    <CardTitle>Staged Items for Deduction</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[200px] border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Color</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stagedItems.length > 0 ? stagedItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.productType}</TableCell>
                                        <TableCell>{item.color}</TableCell>
                                        <TableCell>{item.size}</TableCell>
                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                        <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No items staged.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
             <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Deduction History</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px] border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Endorsed To</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Submitted By</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-24 w-full" /></TableCell></TableRow>
                                    : deductions && deductions.length > 0 ? deductions.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell>{formatDateTime(log.date).dateTimeShort}</TableCell>
                                        <TableCell>{log.endorsedTo}</TableCell>
                                        <TableCell>{log.reason}</TableCell>
                                        <TableCell>
                                            <ul className="list-disc pl-4 text-xs">
                                                {log.items.map((item, index) => (
                                                    <li key={index}>
                                                        {item.quantity}x {item.productType} ({item.color}, {item.size})
                                                    </li>
                                                ))}
                                            </ul>
                                        </TableCell>
                                        <TableCell>{log.submittedBy}</TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No records yet.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </Header>
  );
}

// Sub-form for adding items
const addItemSchema = z.object({
    productType: z.string().min(1),
    color: z.string().min(1),
    size: z.string().min(1),
    quantity: z.coerce.number().min(1),
});
type AddItemFormValues = z.infer<typeof addItemSchema>;

const AddItemSubForm = ({ onAddItem, productTypes }: { onAddItem: (item: Omit<DeductionItem, 'id'>) => void; productTypes: string[] }) => {
    const form = useForm<AddItemFormValues>({
        resolver: zodResolver(addItemSchema),
        defaultValues: { quantity: 1 }
    });
    
    const { watch, setValue } = form;
    const productTypeValue = watch('productType');
    const colorValue = watch('color');
    const isPolo = productTypeValue?.includes('Polo Shirt');
    
    const jacketColors = useMemo(() => ['Army Green', 'Black', 'Black/Gray', 'Black/Khaki', 'Black/Navy Blue', 'Brown', 'Dark Gray', 'Dark Khaki', 'Khaki', 'Light Gray', 'Light Khaki', 'Maroon/Gray', 'Navy Blue', 'Navy Blue/Gray', 'Olive Green'], []);
    const poloShirtColors = useMemo(() => ['Aqua Blue', 'Black', 'Brown', 'Choco Brown', 'Cream', 'Dark Green', 'Dark Gray', 'Dawn Blue', 'Emerald Green', 'Estate Blue', 'Fair Orchid', 'Fuchsia', 'Gold', 'Golden Yellow', 'Green', 'Green Briar', 'Honey Mustard', 'Irish Green', 'Jade Green', 'Light Green', 'Light Gray', 'Maroon', 'Melange Gray', 'Military Green', 'Mint Green', 'Mocha', 'Navy Blue', 'Nine Ion Gray', 'Oatmeal', 'Orange', 'Pink', 'Purple', 'Rapture Rose', 'Red', 'Royal Blue', 'Sky Blue', 'Slate Blue', 'Teal', 'White', 'Yellow'], []);
    const productSizes = useMemo(() => ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'], []);
    
    const availableColors = isPolo ? poloShirtColors : jacketColors;

    useEffect(() => {
        if (colorValue && !availableColors.includes(colorValue)) {
            setValue('color', '');
        }
    }, [productTypeValue, availableColors, colorValue, setValue]);

    const handleSubmit = (data: AddItemFormValues) => {
        onAddItem(data);
        form.reset({ productType: data.productType, color: '', size: '', quantity: 1 });
    };

    return (
        <FormProvider {...form}>
            <div className="space-y-3 p-4 border rounded-md bg-muted/50">
                <h4 className="font-semibold">Add Item to Deduct</h4>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="productType" render={({ field }) => (
                        <FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Product Type"/></SelectTrigger></FormControl><SelectContent>{productTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                    )}/>
                    <FormField control={form.control} name="color" render={({ field }) => (
                        <FormItem><Select onValueChange={field.onChange} value={field.value} disabled={!productTypeValue}><FormControl><SelectTrigger><SelectValue placeholder="Color"/></SelectTrigger></FormControl><SelectContent>{availableColors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                    )}/>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="size" render={({ field }) => (
                        <FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Size"/></SelectTrigger></FormControl><SelectContent>{productSizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                    )}/>
                    <FormField control={form.control} name="quantity" render={({ field }) => (
                        <FormItem><FormControl><Input type="number" placeholder="Quantity" {...field} /></FormControl><FormMessage/></FormItem>
                    )}/>
                 </div>
                 <Button type="button" onClick={form.handleSubmit(handleSubmit)} className="w-full">Add Item</Button>
            </div>
        </FormProvider>
    );
};
