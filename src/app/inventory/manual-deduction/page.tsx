
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Calendar, MessageSquare, Boxes, Palette, Ruler, Trash2 } from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


const manualDeductionFormSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  endorsedTo: z.string().min(1, "Endorsed to is required."),
  reason: z.enum(["Freebies", "For Marketing Purposes", "Error Replacement", "c/o Sir Than", "For Showroom"], { required_error: "A reason is required." }),
  productType: z.string().min(1, "Product type is required."),
  color: z.string().min(1, "Color is required."),
  size: z.string().min(1, "Size is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
});

type ManualDeductionFormValues = z.infer<typeof manualDeductionFormSchema>;

type InventoryItem = {
  id: string;
  productType: string;
  color: string;
  size: string;
  stock: number;
};

type ManualDeduction = {
  id: string;
  date: string;
  submittedBy: string;
  endorsedTo: string;
  reason: string;
  items: {
    productType: string;
    color: string;
    size: string;
    quantity: number;
  }[];
  timestamp: string;
};

// Main component
export default function ManualDeductionPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [deletingDeduction, setDeletingDeduction] = useState<ManualDeduction | null>(null);

  const pricingConfigRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'pricing', 'default') : null),
    [firestore]
  );
  const { data: fetchedConfig } = useDoc<PricingConfig>(pricingConfigRef);
  const inventoryQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'inventory')) : null, [firestore]);
  const { data: inventoryItems } = useCollection<InventoryItem>(inventoryQuery);

  const pricingConfig = useMemo(() => fetchedConfig || initialPricingConfig, [fetchedConfig]);
  
  const productTypes = useMemo(() => {
    if (!pricingConfig) return [];
    return Object.keys(pricingConfig.productGroupMapping || {}).sort();
  }, [pricingConfig]);

  const form = useForm<ManualDeductionFormValues>({
    resolver: zodResolver(manualDeductionFormSchema),
    defaultValues: { 
      date: new Date(),
      endorsedTo: '',
      reason: undefined,
      productType: '',
      color: '',
      size: '',
      quantity: 1,
     },
  });

  const deductionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'manual_item_deductions'), orderBy('timestamp', 'desc')) : null, [firestore]);
  const { data: deductions, isLoading, refetch } = useCollection<ManualDeduction>(deductionsQuery, undefined, { listen: false });
  
  const { watch, setValue } = form;
  const productTypeValue = watch('productType');
  const colorValue = watch('color');
  const sizeValue = watch('size');
  
  const availableStock = useMemo(() => {
    if (!inventoryItems || !productTypeValue || !colorValue || !sizeValue) return null;
    const item = inventoryItems.find(i => 
      i.productType === productTypeValue && 
      i.color === colorValue && 
      i.size === sizeValue
    );
    return item?.stock;
  }, [inventoryItems, productTypeValue, colorValue, sizeValue]);

  const handleSaveDeduction = async (data: ManualDeductionFormValues) => {
    if (!firestore || !userProfile) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    setIsSaving(true);
    
    if (availableStock === null || availableStock === undefined || data.quantity > availableStock) {
        toast({
            variant: 'destructive',
            title: 'Not enough stock',
            description: `Only ${availableStock ?? 0} items available for ${data.productType} (${data.color}, ${data.size}).`,
        });
        setIsSaving(false);
        return;
    }
    
    const deductionId = uuidv4();
    const deductionRef = doc(firestore, 'manual_item_deductions', deductionId);
    
    const itemToDeduct = {
        productType: data.productType,
        color: data.color,
        size: data.size,
        quantity: data.quantity,
    };
    
    const deductionData: ManualDeduction = {
      id: deductionId,
      date: data.date.toISOString(),
      submittedBy: userProfile.nickname,
      endorsedTo: data.endorsedTo,
      reason: data.reason,
      items: [itemToDeduct],
      timestamp: new Date().toISOString(),
    };

    try {
      await runTransaction(firestore, async (transaction) => {
        const inventoryItemId = `${itemToDeduct.productType}-${itemToDeduct.color}-${itemToDeduct.size}`.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-');
        const inventoryDocRef = doc(firestore, 'inventory', inventoryItemId);
        
        const inventoryDoc = await transaction.get(inventoryDocRef);
        const currentStock = inventoryDoc.exists() ? inventoryDoc.data().stock || 0 : 0;
        
        const newStock = currentStock - itemToDeduct.quantity;

        if (newStock < 0) {
          throw new Error(`Not enough stock for ${itemToDeduct.productType} (${itemToDeduct.color}, ${itemToDeduct.size}). Available: ${currentStock}, Needed: ${itemToDeduct.quantity}.`);
        }
        
        if (inventoryDoc.exists()) {
            transaction.update(inventoryDocRef, { stock: newStock });
        } else {
             // This case should be rare if validation is correct, but as a fallback:
            throw new Error(`Inventory item not found for: ${itemToDeduct.productType} ${itemToDeduct.color} ${itemToDeduct.size}`);
        }
        
        transaction.set(deductionRef, deductionData);
      });

      toast({ title: 'Success!', description: 'Manual deduction has been recorded and inventory updated.' });
      refetch();
      form.reset({
        date: new Date(),
        endorsedTo: '',
        reason: undefined,
        productType: '',
        color: '',
        size: '',
        quantity: 1,
      });
    } catch (e: any) {
      console.error('Deduction failed:', e);
      toast({ variant: 'destructive', title: 'Deduction Failed', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDeduction = async () => {
    if (!deletingDeduction || !firestore) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const deductionData = deletingDeduction;

            // Add back stock for each item in the deduction
            for (const item of deductionData.items) {
                const inventoryItemId = `${item.productType}-${item.color}-${item.size}`.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-');
                const inventoryDocRef = doc(firestore, 'inventory', inventoryItemId);

                const inventoryDoc = await transaction.get(inventoryDocRef);
                const currentStock = inventoryDoc.exists() ? inventoryDoc.data().stock || 0 : 0;
                
                const newStock = currentStock + item.quantity;
                
                if (inventoryDoc.exists()) {
                    transaction.update(inventoryDocRef, { stock: newStock });
                } else {
                    transaction.set(inventoryDocRef, {
                        id: inventoryItemId,
                        productType: item.productType,
                        color: item.color,
                        size: item.size,
                        stock: newStock
                    });
                }
            }

            const deductionRef = doc(firestore, 'manual_item_deductions', deductionData.id);
            transaction.delete(deductionRef);
        });

        toast({ title: 'Success!', description: 'Deduction record has been deleted and inventory restored.' });
        setDeletingDeduction(null);
        refetch();
    } catch (e: any) {
        console.error('Failed to delete deduction:', e);
        toast({ variant: 'destructive', title: 'Deletion Failed', description: e.message });
    }
  };


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
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSaveDeduction)} className="space-y-4">
                        <FormField control={form.control} name="date" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2"><Calendar /> Date</FormLabel>
                            <FormControl><Input type="date" value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={(e) => field.onChange(new Date(e.target.value))} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )} />
                        <FormField control={form.control} name="endorsedTo" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2"><User /> Endorsed To (Employee)</FormLabel>
                            <FormControl><Input placeholder="Enter employee name" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )} />
                        <FormField control={form.control} name="reason" render={({ field }) => (
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
                        
                        <h4 className="font-semibold pt-2">Item to Deduct</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="productType" render={({ field }) => (
                                <FormItem><FormLabel className="flex items-center gap-2"><Boxes />Product Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Product Type"/></SelectTrigger></FormControl><SelectContent>{productTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                            )}/>
                            <FormField control={form.control} name="color" render={({ field }) => (
                                <FormItem><FormLabel className="flex items-center gap-2"><Palette />Color</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!productTypeValue}><FormControl><SelectTrigger><SelectValue placeholder="Color"/></SelectTrigger></FormControl><SelectContent>{availableColors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                            )}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="size" render={({ field }) => (
                                <FormItem><FormLabel className="flex items-center gap-2"><Ruler />Size</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Size"/></SelectTrigger></FormControl><SelectContent>{productSizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                            )}/>
                            <FormField control={form.control} name="quantity" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quantity</FormLabel>
                                    <FormControl><Input type="number" placeholder="Quantity" {...field} /></FormControl>
                                    {availableStock !== null && availableStock !== undefined ? (
                                        <FormDescription>
                                            Available: {availableStock}
                                        </FormDescription>
                                    ) : (productTypeValue && colorValue && sizeValue) &&
                                        <FormDescription>
                                            Checking stock...
                                        </FormDescription>
                                    }
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                        </div>

                        <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={isSaving}>
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
                    <CardTitle>Deduction History</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[60vh] border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-center">Date</TableHead>
                                    <TableHead className="text-center">Endorsed To</TableHead>
                                    <TableHead className="text-center">Reason</TableHead>
                                    <TableHead className="text-center">Items</TableHead>
                                    <TableHead className="text-center">Submitted By</TableHead>
                                    <TableHead className="text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? <TableRow><TableCell colSpan={6}><Skeleton className="h-24 w-full" /></TableCell></TableRow>
                                    : deductions && deductions.length > 0 ? deductions.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-center align-middle">{formatDateTime(log.date).dateTimeShort}</TableCell>
                                        <TableCell className="text-center align-middle">{log.endorsedTo}</TableCell>
                                        <TableCell className="text-center align-middle">{log.reason}</TableCell>
                                        <TableCell className="text-left align-middle">
                                            <ul className="list-disc pl-4 text-xs">
                                                {log.items.map((item, index) => (
                                                    <li key={index}>
                                                        {item.quantity}x {item.productType} ({item.color}, {item.size})
                                                    </li>
                                                ))}
                                            </ul>
                                        </TableCell>
                                        <TableCell className="text-center align-middle">{log.submittedBy}</TableCell>
                                        <TableCell className="text-center align-middle">
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingDeduction(log)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No records yet.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <AlertDialog open={!!deletingDeduction} onOpenChange={() => setDeletingDeduction(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the deduction record and add the item quantity back to inventory. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteDeduction}>Confirm Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </Header>
  );
}
