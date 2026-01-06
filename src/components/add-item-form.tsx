
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState, useEffect, useMemo } from 'react';

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
import { Boxes, Palette, Ruler, Hash, Plus, Minus, Warehouse } from 'lucide-react';
import type { StagedItem } from '@/app/inventory/add-items/page';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';

const productTypes = [
  'Executive Jacket 1',
  'Executive Jacket v2 (with lines)',
  'Turtle Neck Jacket',
  'Corporate Jacket',
  'Reversible v1',
  'Reversible v2',
  'Polo Shirt (Coolpass)',
  'Polo Shirt (Cotton Blend)',
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

type InventoryItem = {
  id: string;
  productType: string;
  color: string;
  size: string;
  stock: number;
};

type AddItemFormProps = {
    onAddItem: (item: Omit<StagedItem, 'id'>) => void;
}

export function AddItemForm({ onAddItem }: AddItemFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [currentStock, setCurrentStock] = useState<number | null>(null);

  const inventoryQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'inventory')) : null, [firestore]);
  const { data: inventoryItems } = useCollection<InventoryItem>(inventoryQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productType: '',
      color: '',
      size: '',
      stock: 0,
    },
  });
  
  const { formState: { isValid } } = form;
  const watchedProductType = form.watch('productType');
  const watchedColor = form.watch('color');
  const watchedSize = form.watch('size');
  
  useEffect(() => {
    if (watchedProductType && watchedColor && watchedSize && inventoryItems) {
      const item = inventoryItems.find(
        (i) =>
          i.productType === watchedProductType &&
          i.color === watchedColor &&
          i.size === watchedSize
      );
      setCurrentStock(item ? item.stock : 0);
    } else {
      setCurrentStock(null);
    }
  }, [watchedProductType, watchedColor, watchedSize, inventoryItems]);


  const handleReset = () => {
    form.reset({
      productType: '',
      color: '',
      size: '',
      stock: 0,
    });
  };

  function onSubmit(values: FormValues) {
    onAddItem(values);
    toast({
        title: 'Item Staged!',
        description: `Added ${values.productType} (${values.color}, ${values.size}) to the list.`,
    });
    handleReset();
  }

  return (
    <Card className="w-full max-w-md shadow-xl animate-in fade-in-50 duration-500 bg-white text-black">
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
                     <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
              
              {currentStock !== null && (
                <div className="md:col-span-2 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Warehouse className="h-5 w-5 text-blue-600" />
                  <p className="text-sm text-blue-800">
                    Current stock for this item: <span className="font-bold">{currentStock}</span>
                  </p>
                </div>
              )}

               <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <div className="flex items-center gap-4">
                      <FormLabel className="flex items-center gap-2 text-black whitespace-nowrap">
                        <Hash className="h-4 w-4 text-primary" />
                        Add Stock
                      </FormLabel>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => field.onChange(Math.max(0, (field.value || 0) - 1))} >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            className="w-24 text-center"
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || /^[0-9\b]+$/.test(value)) {
                                  field.onChange(value === '' ? 0 : parseInt(value, 10));
                                }
                            }}
                            onBlur={(e) => {
                                if (e.target.value === '') {
                                    field.onChange(0);
                                }
                            }}
                          />
                        </FormControl>
                         <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => field.onChange((field.value || 0) + 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4 gap-4">
              <Button type="button" variant="outline" size="lg" onClick={handleReset}>
                Reset
              </Button>
              <Button type="submit" size="lg" className="shadow-md transition-transform active:scale-95 text-white font-bold" disabled={!isValid}>
                Add to List
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
