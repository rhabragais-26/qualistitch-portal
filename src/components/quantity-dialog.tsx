"use client";

import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { PlusCircle, Trash2, Minus, Plus } from 'lucide-react';

type LeadOrder = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
}

type CaseItem = {
    id: string;
    productType: string;
    color: string;
    size: string;
    quantity: number;
};

type QuantityDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (items: CaseItem[]) => void;
    leadOrders: LeadOrder[];
    initialItems: CaseItem[];
}

export function QuantityDialog({ isOpen, onClose, onSave, leadOrders, initialItems }: QuantityDialogProps) {
    const [items, setItems] = useState<CaseItem[]>(initialItems.length > 0 ? initialItems : [{ id: uuidv4(), productType: '', color: '', size: '', quantity: 1 }]);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const availableProductTypes = useMemo(() => {
        return [...new Set(leadOrders.map(o => o.productType))];
    }, [leadOrders]);
    
    const getAvailableColors = (productType: string) => {
        if (!productType) return [];
        return [...new Set(leadOrders.filter(o => o.productType === productType).map(o => o.color))];
    };

    const getAvailableSizes = (productType: string, color: string) => {
        if (!productType || !color) return [];
        return [...new Set(leadOrders.filter(o => o.productType === productType && o.color === color).map(o => o.size))];
    };

    const getMaxQuantity = (productType: string, color: string, size: string) => {
        return leadOrders.find(o => o.productType === productType && o.color === color && o.size === size)?.quantity || 0;
    }


    const addNewItem = () => {
        setItems(prev => [...prev, { id: uuidv4(), productType: '', color: '', size: '', quantity: 1 }]);
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const updateItem = (id: string, field: keyof CaseItem, value: string | number) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'productType') {
                    updatedItem.color = '';
                    updatedItem.size = '';
                } else if (field === 'color') {
                    updatedItem.size = '';
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const handleSave = () => {
        const validItems = items.filter(item => item.productType && item.color && item.size && item.quantity > 0);
        onSave(validItems);
    };
    
    const handleOpenChange = (id: string, open: boolean) => {
        setOpenDropdown(open ? id : null);
    };


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Select Items with Related Case</DialogTitle>
                    <DialogDescription>
                        Specify the product, color, size, and quantity for each item included in this operational case.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40%]">Product Type</TableHead>
                                <TableHead className="w-[25%]">Color</TableHead>
                                <TableHead className="w-[15%]">Size</TableHead>
                                <TableHead className="w-[150px] text-center">Quantity</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map(item => {
                                const maxQty = getMaxQuantity(item.productType, item.color, item.size);
                                return (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <Select 
                                            value={item.productType} 
                                            onValueChange={(v) => updateItem(item.id, 'productType', v)}
                                            open={openDropdown === `${item.id}-productType`}
                                            onOpenChange={(open) => handleOpenChange(`${item.id}-productType`, open)}
                                        >
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>{availableProductTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select 
                                            value={item.color} 
                                            onValueChange={(v) => updateItem(item.id, 'color', v)}
                                            open={openDropdown === `${item.id}-color`}
                                            onOpenChange={(open) => handleOpenChange(`${item.id}-color`, open)}
                                            disabled={!item.productType}
                                        >
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                {getAvailableColors(item.productType).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select 
                                            value={item.size} 
                                            onValueChange={(v) => updateItem(item.id, 'size', v)}
                                            open={openDropdown === `${item.id}-size`}
                                            onOpenChange={(open) => handleOpenChange(`${item.id}-size`, open)}
                                            disabled={!item.productType || !item.color}
                                        >
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                {getAvailableSizes(item.productType, item.color).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-1">
                                            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => updateItem(item.id, 'quantity', Math.max(1, item.quantity - 1))}>
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(item.id, 'quantity', Math.min(maxQty, parseInt(e.target.value, 10) || 1))}
                                                className="w-16 text-center"
                                                max={maxQty}
                                            />
                                            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => updateItem(item.id, 'quantity', Math.min(maxQty, item.quantity + 1))} disabled={item.quantity >= maxQty}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                    <Button type="button" variant="outline" className="mt-4" onClick={addNewItem}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
