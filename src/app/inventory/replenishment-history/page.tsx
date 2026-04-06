'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

import { Header } from '@/components/header';
import { ReplenishmentHistoryTable } from '@/components/replenishment-history-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, runTransaction } from 'firebase/firestore';
import type { PricingConfig } from '@/lib/pricing';
import { initialPricingConfig } from '@/lib/pricing-data';

const formSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  productType: z.string().min(1, 'Product type is required.'),
  color: z.string().min(1, 'Color is required.'),
  size: z.string().min(1, 'Size is required.'),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
});

type FormValues = z.infer<typeof formSchema>;

const jacketColors = [
    'Army Green', 'Black', 'Black/Gray', 'Black/Khaki', 'Black/Navy Blue',
    'Brown', 'Dark Gray', 'Dark Khaki', 'Khaki', 'Light Gray', 'Light Khaki',
    'Maroon/Gray', 'Navy Blue', 'Navy Blue/Gray', 'Olive Green',
];

const poloShirtColors = [
    'Aqua Blue', 'Black', 'Brown', 'Choco Brown', 'Cream', 'Dark Green', 'Dark Gray',
    'Dawn Blue', 'Emerald Green', 'Estate Blue', 'Fair Orchid', 'Fuchsia', 'Gold',
    'Golden Yellow', 'Green', 'Green Briar', 'Honey Mustard', 'Irish Green', 'Jade Green',
    'Light Green', 'Light Gray', 'Maroon', 'Melange Gray', 'Military Green', 'Mint Green',
    'Mocha', 'Navy Blue', 'Nine Ion Gray', 'Oatmeal', 'Orange', 'Pink', 'Purple',
    'Rapture Rose', 'Red', 'Royal Blue', 'Sky Blue', 'Slate Blue', 'Teal', 'White', 'Yellow'
];

const productSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

export default function ReplenishmentHistoryPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userProfile } = useUser();

  const pricingConfigRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'pricing', 'default') : null),
    [firestore]
  );
  const { data: fetchedConfig } = useDoc<PricingConfig>(pricingConfigRef);

  const pricingConfig = useMemo(() => {
    if (fetchedConfig) return fetchedConfig;
    return initialPricingConfig as PricingConfig;
  }, [fetchedConfig]);

  const productTypes = useMemo(() => {
    if (!pricingConfig) return [];
    return Object.keys(pricingConfig.productGroupMapping || {}).sort();
  }, [pricingConfig]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      productType: '',
      color: '',
      size: '',
      quantity: 1,
    },
  });

  const { watch, setValue } = form;
  const productTypeValue = watch('productType');
  const isPolo = productTypeValue.includes('Polo Shirt');
  const availableColors = isPolo ? poloShirtColors : jacketColors;
  const currentColor = watch('color');

  useEffect(() => {
    if (!availableColors.includes(currentColor)) {
        setValue('color', '');
    }
  }, [productTypeValue, availableColors, currentColor, setValue]);


  const onSubmit = async (values: FormValues) => {
    if (!firestore || !userProfile) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in to perform this action." });
        return;
    }

    const replenishmentId = uuidv4();
    const replenishmentRef = doc(firestore, 'inventory_replenishments', replenishmentId);
    
    const itemId = `${values.productType}-${values.color}-${values.size}`.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-');
    const itemDocRef = doc(firestore, 'inventory', itemId);

    try {
        await runTransaction(firestore, async (transaction) => {
            const itemDoc = await transaction.get(itemDocRef);
            if (!itemDoc.exists()) {
                transaction.set(itemDocRef, {
                    id: itemId,
                    productType: values.productType,
                    color: values.color,
                    size: values.size,
                    stock: values.quantity,
                });
            } else {
                const currentStock = itemDoc.data().stock || 0;
                transaction.update(itemDocRef, { stock: currentStock + values.quantity });
            }

            transaction.set(replenishmentRef, {
                id: replenishmentId,
                date: new Date(values.date).toISOString(),
                productType: values.productType,
                color: values.color,
                size: values.size,
                quantity: values.quantity,
                submittedBy: userProfile.nickname,
                timestamp: new Date().toISOString(),
            });
        });

        toast({ title: 'Success!', description: 'Replenishment recorded and inventory updated.' });
        form.reset({
            date: values.date, // keep the date
            productType: '',
            color: '',
            size: '',
            quantity: 1,
        });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Save Failed", description: e.message });
    }
  }

  return (
    <Header>
      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_2fr] gap-8 p-4 sm:p-6 lg:p-8 items-start">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Add Replenishment</CardTitle>
              <CardDescription>Record a new inventory replenishment.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="productType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a Product Type" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {productTypes.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="color" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!productTypeValue}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a Color" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {availableColors.map((color) => (
                                <SelectItem key={color} value={color}>{color}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="size" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Size</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!productTypeValue}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a Size" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {productSizes.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="flex justify-end">
                    <Button type="submit">Add Replenishment</Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        <div>
          <ReplenishmentHistoryTable />
        </div>
      </main>
    </Header>
  );
}
