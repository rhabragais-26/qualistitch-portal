
"use client"

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Minus, Plus } from 'lucide-react';
import { z } from 'zod';

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
  'Patches',
  'Client Owned',
];

const jacketColors = [
  'Black', 'Brown', 'Dark Khaki', 'Light Khaki', 'Olive Green', 'Navy Blue',
  'Light Gray', 'Dark Gray', 'Khaki', 'Black/Khaki', 'Black/Navy Blue',
  'Army Green',
];

const poloShirtColors = [
    'White', 'Black', 'Light Gray', 'Dark Gray', 'Red', 'Maroon', 'Navy Blue', 'Royal Blue', 'Aqua Blue', 'Emerald Green', 'Golden Yellow', 'Slate Blue', 'Yellow', 'Orange', 'Dark Green', 'Green', 'Light Green', 'Pink', 'Fuchsia', 'Sky Blue', 'Oatmeal', 'Cream', 'Purple', 'Gold', 'Brown'
];

const productSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

const orderSchema = z.object({
  productType: z.string(),
  color: z.string(),
  size: z.string(),
  quantity: z.number(),
});
type Order = z.infer<typeof orderSchema>;

const EditOrderDialogMemo = React.memo(function EditOrderDialog({ isOpen, onOpenChange, order, onSave, onClose }: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  order: Order;
  onSave: (updatedOrder: Order) => void;
  onClose: () => void;
}) {
  const [productType, setProductType] = useState(order.productType);
  const [color, setColor] = useState(order.color);
  const [size, setSize] = useState(order.size);
  const [quantity, setQuantity] = useState<number | string>(order.quantity);

  const isPolo = productType.includes('Polo Shirt');
  const availableColors = isPolo ? poloShirtColors : jacketColors;

  React.useEffect(() => {
    setProductType(order.productType);
    setColor(order.color);
    setSize(order.size);
    setQuantity(order.quantity);
  }, [order]);
  
  useEffect(() => {
    if (!availableColors.includes(color)) {
        setColor('');
    }
  }, [productType, availableColors, color]);

  const handleSave = () => {
    const numQuantity = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;
    if (productType && color && size && numQuantity > 0) {
      onSave({ ...order, productType, color, size, quantity: numQuantity });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
          <DialogDescription>
            Update the details for the selected order.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-product-type">Product Type:</Label>
            <Select onValueChange={setProductType} value={productType}>
              <SelectTrigger id="edit-product-type">
                <SelectValue placeholder="Select a Product Type" />
              </SelectTrigger>
              <SelectContent>
                {productTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className="flex items-center gap-2">
              <Label htmlFor="edit-color" className='text-sm'>Color:</Label>              <Select onValueChange={setColor} value={color} disabled={!productType || productType === 'Patches'}>
                <SelectTrigger id="edit-color">
                  <SelectValue placeholder="Select a Color" />
                </SelectTrigger>
                <SelectContent>
                  {availableColors.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="edit-size" className='text-sm'>Size:</Label>
              <Select onValueChange={setSize} value={size} disabled={productType === 'Patches'}>
                <SelectTrigger id="edit-size" className="w-[100px]">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  {productSizes.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <Label htmlFor="edit-quantity">Quantity:</Label>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(q => Math.max(1, (typeof q === 'string' ? parseInt(q, 10) || 0 : q) - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id="edit-quantity"
              type="text"
              value={quantity}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^[0-9\b]+$/.test(value)) {
                  setQuantity(value === '' ? '' : parseInt(value, 10));
                }
              }}
              onBlur={(e) => {
                if (e.target.value === '') {
                  setQuantity(1);
                }
              }}
              className="w-16 text-center"
            />
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(q => (typeof q === 'string' ? parseInt(q, 10) || 0 : q) + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={!productType || !color || !size || quantity === 0 || Number(quantity) < 1} className="text-white font-bold">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export { EditOrderDialogMemo as EditOrderDialog };
