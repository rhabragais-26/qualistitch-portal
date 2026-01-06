
'use client';

import type { StagedItem } from '@/app/inventory/add-items/page';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Save, Trash2, Plus, Minus } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';

type StagedItemsListProps = {
  items: StagedItem[];
  onUpdateItem: (item: StagedItem) => void;
  onRemoveItem: (id: string) => void;
  onSaveAll: () => void;
};

const productTypes = [
  'Executive Jacket 1', 'Executive Jacket v2 (with lines)', 'Turtle Neck Jacket',
  'Corporate Jacket', 'Reversible v1', 'Reversible v2', 'Polo Shirt (Coolpass)',
  'Polo Shirt (Cotton Blend)',
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

function EditItemDialog({
  item,
  onSave,
  onClose,
}: {
  item: StagedItem;
  onSave: (updatedItem: StagedItem) => void;
  onClose: () => void;
}) {
  const [productType, setProductType] = useState(item.productType);
  const [color, setColor] = useState(item.color);
  const [size, setSize] = useState(item.size);
  const [stock, setStock] = useState(item.stock);
  
  const isPolo = productType.includes('Polo Shirt');
  const availableColors = isPolo ? poloShirtColors : jacketColors;

  useEffect(() => {
    if (!availableColors.includes(color)) {
        setColor('');
    }
  }, [productType, availableColors, color]);

  const handleSave = () => {
    onSave({ ...item, productType, color, size, stock });
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Staged Item</DialogTitle>
          <DialogDescription>Update the details of the item before saving.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-product-type">Product Type</Label>
            <Select value={productType} onValueChange={setProductType}>
              <SelectTrigger id="edit-product-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {productTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="edit-color">Color</Label>
                <Select value={color} onValueChange={setColor}>
                    <SelectTrigger id="edit-color"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {availableColors.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="edit-size">Size</Label>
                <Select value={size} onValueChange={setSize}>
                    <SelectTrigger id="edit-size"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {productSizes.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <div className="space-y-2">
              <Label>Stock</Label>
              <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setStock(Math.max(0, stock - 1))}>
                      <Minus className="h-4 w-4" />
                  </Button>
                  <Input 
                      type="number" 
                      value={stock} 
                      onChange={(e) => setStock(parseInt(e.target.value, 10) || 0)} 
                      className="w-24 text-center"
                  />
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setStock(stock + 1)}>
                      <Plus className="h-4 w-4" />
                  </Button>
              </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} className="text-white font-bold">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export function StagedItemsList({ items, onUpdateItem, onRemoveItem, onSaveAll }: StagedItemsListProps) {
    const [editingItem, setEditingItem] = useState<StagedItem | null>(null);
  
    return (
      <Card className="w-full max-w-2xl shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
        <CardHeader>
          <CardTitle>Staged Items</CardTitle>
          <CardDescription>These items will be added to the inventory when you save.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <ScrollArea className="h-[550px] border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-neutral-800 z-10">
                <TableRow>
                  <TableHead className="text-white">Product Type</TableHead>
                  <TableHead className="text-white">Color</TableHead>
                  <TableHead className="text-white">Size</TableHead>
                  <TableHead className="text-white text-center">Stock</TableHead>
                  <TableHead className="text-white text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No items added yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-xs">{item.productType}</TableCell>
                      <TableCell className="text-xs">{item.color}</TableCell>
                      <TableCell className="text-xs">{item.size}</TableCell>
                      <TableCell className="text-center text-xs">{item.stock}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)} className="h-8 w-8 text-blue-600 hover:bg-gray-200">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onRemoveItem(item.id)} className="h-8 w-8 text-destructive hover:bg-red-100">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex justify-end">
            <Button onClick={onSaveAll} disabled={items.length === 0} className="font-bold text-white">
                <Save className="mr-2 h-4 w-4" />
                Save All Items
            </Button>
        </CardFooter>
         {editingItem && (
            <EditItemDialog
                item={editingItem}
                onSave={onUpdateItem}
                onClose={() => setEditingItem(null)}
            />
        )}
      </Card>
    );
}
