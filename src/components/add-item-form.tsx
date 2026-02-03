
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import React, { useState, useEffect } from 'react';

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
import { Separator } from './ui/separator';

const productTypes = [
  'Executive Jacket 1',
  'Executive Jacket v2 (with lines)',
  'Turtle Neck Jacket',
  'Corporate Jacket',
  'Reversible v1',
  'Reversible v2',
  'Polo Shirt (Smilee) - Cool Pass',
  'Polo Shirt (Smilee) - Cotton Blend',
  'Polo Shirt (Lifeline)',
  'Polo Shirt (Blue Corner)',
  'Polo Shirt (Softex)',
];

const jacketColors = [
  'Black', 'Brown', 'Dark Khaki', 'Light Khaki', 'Olive Green', 'Navy Blue',
  'Light Gray', 'Dark Gray', 'Khaki', 'Black/Khaki', 'Black/Navy Blue',
  'Army Green',
];

const poloShirtColors = [
    'White', 'Black', 'Light Gray', 'Dark Gray', 'Red', 'Maroon', 'Navy Blue', 'Royal Blue', 'Aqua Blue', 'Emerald Green', 'Golden Yellow', 'Slate Blue', 'Yellow', 'Orange', 'Dark Green', 'Green', 'Light Green', 'Pink', 'Fuchsia', 'Sky Blue', 'Oatmeal', 'Cream', 'Purple', 'Gold', 'Brown', 'Melange Gray', 'Choco Brown', 'Irish Green', 'Mint Green', 'Dawn Blue', 'Military Green', 'Fair Orchid', 'Mocha', 'Green Briar', 'Teal', 'Rapture Rose', 'Estate Blue', 'Honey Mustard', 'Nine Ion Gray'
];

const productSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

const sizeQuantitySchema = z.object({
  size: z.string(),
  stock: z.number().min(0),
});

const formSchema = z.object({
  productType: z.string().min(1, 'Product type is required.'),
  color: z.string().min(1, 'Color is required.'),
  sizeQuantities: z.array(sizeQuantitySchema),
});

type FormValues = z.infer<typeof formSchema>;

type AddItemFormProps = {
    onAddItem: (item: Omit<StagedItem, 'id'>) => void;
    isReadOnly: boolean;
}

const AddItemFormMemo = React.memo(function AddItemForm({ onAddItem, isReadOnly }: AddItemFormProps) {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productType: '',
      color: '',
      sizeQuantities: productSizes.map(size => ({ size, stock: 0 })),
    },
  });
  
  const { control, handleSubmit, reset, watch, setValue, formState: { isValid } } = form;
  
  const productTypeValue = watch('productType');
  const isPolo = productTypeValue.includes('Polo Shirt');
  const availableColors = isPolo ? poloShirtColors : jacketColors;
  const currentColor = watch('color');

  useEffect(() => {
    if (!availableColors.includes(currentColor)) {
        setValue('color', '');
    }
  }, [productTypeValue, availableColors, currentColor, setValue]);


  const { fields, update } = useFieldArray({
    control,
    name: "sizeQuantities"
  });

  const handleReset = () => {
    reset({
      productType: '',
      color: '',
      sizeQuantities: productSizes.map(size => ({ size, stock: 0 })),
    });
  };

  function onSubmit(values: FormValues) {
    let itemsAddedCount = 0;
    values.sizeQuantities.forEach(item => {
      if (item.stock > 0) {
        onAddItem({
          productType: values.productType,
          color: values.color,
          size: item.size,
          stock: item.stock
        });
        itemsAddedCount++;
      }
    });

    if (itemsAddedCount > 0) {
        toast({
            title: 'Items Staged!',
            description: `Added ${itemsAddedCount} item(s) with product type ${values.productType} to the list.`,
        });
        handleReset();
    } else {
        toast({
            variant: 'destructive',
            title: 'No Items to Add',
            description: `Please enter a quantity for at least one size.`,
        });
    }
  }

  return (
    <Card className="w-full max-w-2xl shadow-xl animate-in fade-in-50 duration-500 bg-white text-black">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-black">Add New Item to Inventory</CardTitle>
        <CardDescription className="text-gray-600">
          Fill in the details below to add new items and their stock quantities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <fieldset disabled={isReadOnly} className="space-y-6">
              <FormField
                control={control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-black"><Boxes className="h-4 w-4 text-primary" />Product Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
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
                control={control}
                name="color"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex items-center gap-2 text-black"><Palette className="h-4 w-4 text-primary" />Color</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a Color" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {availableColors.map((color) => (
                            <SelectItem key={color} value={color}>{color}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
              />

            <Separator />

            <div className="space-y-4">
              <FormLabel className="flex items-center gap-2 text-black"><Ruler className="h-4 w-4 text-primary" />Size Quantities</FormLabel>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                {fields.map((field, index) => (
                    <FormField
                        key={field.id}
                        control={control}
                        name={`sizeQuantities.${index}.stock`}
                        render={({ field: stockField }) => (
                            <FormItem className="flex items-center justify-between">
                                <FormLabel className="text-sm font-bold text-black w-12">{field.size}</FormLabel>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => update(index, { ...field, stock: Math.max(0, (stockField.value || 0) - 1)})}
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            {...stockField}
                                            className="w-16 text-center"
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                stockField.onChange(value === '' ? 0 : parseInt(value, 10));
                                            }}
                                            onBlur={(e) => {
                                                if (e.target.value === '') {
                                                    stockField.onChange(0);
                                                }
                                            }}
                                        />
                                    </FormControl>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => update(index, { ...field, stock: (stockField.value || 0) + 1})}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </FormItem>
                        )}
                    />
                ))}
              </div>
            </div>


            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" size="lg" onClick={handleReset} disabled={isReadOnly}>
                Reset
              </Button>
              <Button type="submit" size="lg" className="shadow-md transition-transform active:scale-95 text-white font-bold" disabled={!isValid || isReadOnly}>
                Add to List
              </Button>
            </div>
            </fieldset>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
});

export { AddItemFormMemo as AddItemForm };
