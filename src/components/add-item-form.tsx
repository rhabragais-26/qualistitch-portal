
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState } from 'react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Boxes, Palette, Ruler, Hash } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const productTypes = [
  'Executive Jacket 1',
  'Executive Jacket v2 (with lines)',
  'Turtle Neck Jacket',
  'Corporate Jacket',
  'Reversible v1',
  'Reversible v2',
  'Polo Shirt (Coolpass)',
  'Polo Shirt (Cotton Blend)',
  'Patches',
  'Client Owned',
];

const productColors = [
  'Black', 'Brown', 'Dark Khaki', 'Light Khaki', 'Olive Green', 'Navy Blue',
  'Light Gray', 'Dark Gray', 'Khaki', 'Black/Khaki', 'Black/Navy Blue',
  'Army Green', 'Polo Color',
];

const productSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

const formSchema = z.object({
  productType: z.string().min(1, 'Product type is required.'),
  color: z.string().min(1, 'Color is required.'),
  size: z.string().min(1, 'Size is required.'),
  stock: z.coerce.number().min(0, 'Stock cannot be negative.'),
});

type FormValues = z.infer<typeof formSchema>;

export function AddItemForm() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productType: '',
      color: '',
      size: '',
      stock: 0,
    },
  });

  const productType = form.watch('productType');
    const isPatches = productType === 'Patches';

    useState(() => {
        if (isPatches) {
            form.setValue('color', 'N/A');
            form.setValue('size', 'N/A');
        } else {
            if (form.getValues('color') === 'N/A') form.setValue('color', '');
            if (form.getValues('size') === 'N/A') form.setValue('size', '');
        }
    });

  const handleReset = () => {
    form.reset({
      productType: '',
      color: '',
      size: '',
      stock: 0,
    });
  };

  async function onSubmit(values: FormValues) {
    if (!firestore) return;
    
    // An inventory item is uniquely identified by its properties, not a random ID.
    // This prevents creating duplicate entries for the same item.
    const itemId = `${values.productType}-${values.color}-${values.size}`.toLowerCase().replace(/\s+/g, '-');
    const inventoryRef = collection(firestore, 'inventory');
    const itemDocRef = doc(inventoryRef, itemId);

    const submissionData = {
      id: itemId,
      productType: values.productType,
      color: values.color,
      size: values.size,
      stock: values.stock,
    };

    try {
      // Using setDoc with merge:true will create or update the stock.
      await setDoc(itemDocRef, submissionData, { merge: true });
      toast({
        title: 'Inventory Item Added/Updated!',
        description: `Item ${values.productType} (${values.color}, ${values.size}) has been saved.`,
      });
      handleReset();
    } catch (e: any) {
      console.error('Error saving inventory item: ', e);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: e.message || 'Could not save the inventory item.',
      });
    }
  }

  return (
    <Card className="w-full max-w-2xl shadow-xl animate-in fade-in-50 duration-500 bg-white text-black">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-black">Add New Item to Inventory</CardTitle>
        <CardDescription className="text-gray-600">
          Fill in the details below to add a new item and its stock quantity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="flex items-center gap-2 text-black"><Boxes className="h-4 w-4 text-primary" />Product Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a Product Type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-black"><Palette className="h-4 w-4 text-primary" />Color</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value} disabled={isPatches}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a Color" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {productColors.map((color) => (
                            <SelectItem key={color} value={color}>{color}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-black"><Ruler className="h-4 w-4 text-primary" />Size</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPatches}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a Size" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {productSizes.map((size) => (
                            <SelectItem key={size} value={size}>{size}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="flex items-center gap-2 text-black"><Hash className="h-4 w-4 text-primary" />Stock Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4 gap-4">
              <Button type="button" variant="outline" size="lg" onClick={handleReset}>
                Reset
              </Button>
              <Button type="submit" size="lg" className="shadow-md transition-transform active:scale-95 text-white font-bold">
                Add Item
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
