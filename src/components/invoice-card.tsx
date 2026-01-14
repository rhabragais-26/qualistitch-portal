
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as ShadTableFooter } from '@/components/ui/table';
import { Order } from './lead-form';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { getProductGroup, getUnitPrice, getProgrammingFees, type EmbroideryOption, getTierLabel, getAddOnPrice, AddOnType } from '@/lib/pricing';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose, DialogFooter, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Minus, Plus } from 'lucide-react';

type InvoiceCardProps = {
  orders: Order[];
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
};

type AddOns = {
  backLogo: number;
  names: number;
};

export function InvoiceCard({ orders }: InvoiceCardProps) {
  
  const [addOns, setAddOns] = useState<Record<string, AddOns>>({});

  const groupedOrders = useMemo(() => {
    return orders.reduce((acc, order) => {
      const productGroup = getProductGroup(order.productType);
      if (!productGroup) return acc;
      
      const groupKey = `${order.productType}-${order.embroidery}`;
      if (!acc[groupKey]) {
        acc[groupKey] = {
          productType: order.productType,
          embroidery: order.embroidery,
          orders: [],
          totalQuantity: 0,
        };
      }
      acc[groupKey].orders.push(order);
      acc[groupKey].totalQuantity += order.quantity;
      return acc;
    }, {} as Record<string, { productType: string; embroidery: EmbroideryOption; orders: Order[], totalQuantity: number }>);
  }, [orders]);

  const grandTotal = useMemo(() => {
    let total = 0;
    Object.entries(groupedOrders).forEach(([groupKey, group]) => {
      const unitPrice = getUnitPrice(group.productType, group.totalQuantity, group.embroidery);
      const { logoFee, backTextFee } = getProgrammingFees(group.totalQuantity, group.embroidery);
      let subtotal = group.totalQuantity * unitPrice + logoFee + backTextFee;
      
      const groupAddOns = addOns[groupKey] || { backLogo: 0, names: 0 };
      if (groupAddOns.backLogo > 0) {
          const backLogoPrice = getAddOnPrice('backLogo', group.totalQuantity);
          subtotal += groupAddOns.backLogo * backLogoPrice;
      }
      if (groupAddOns.names > 0) {
          const namesPrice = getAddOnPrice('names', group.totalQuantity);
          subtotal += groupAddOns.names * namesPrice;
      }
      
      total += subtotal;
    });
    return total;
  }, [groupedOrders, addOns]);

  return (
    <Card className="shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="font-headline text-xl">Pricing Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-22rem)] pr-4">
          {Object.keys(groupedOrders).length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Add orders to see the price summary.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedOrders).map(([groupKey, groupData]) => {
                const unitPrice = getUnitPrice(groupData.productType, groupData.totalQuantity, groupData.embroidery);
                const tierLabel = getTierLabel(groupData.productType, groupData.totalQuantity, groupData.embroidery);
                const { logoFee, backTextFee } = getProgrammingFees(groupData.totalQuantity, groupData.embroidery);
                const itemsSubtotal = groupData.totalQuantity * unitPrice;
                
                const groupAddOns = addOns[groupKey] || { backLogo: 0, names: 0 };
                const backLogoPrice = getAddOnPrice('backLogo', groupData.totalQuantity);
                const namesPrice = getAddOnPrice('names', groupData.totalQuantity);
                const backLogoTotal = groupAddOns.backLogo * backLogoPrice;
                const namesTotal = groupAddOns.names * namesPrice;

                const subtotal = itemsSubtotal + logoFee + backTextFee + backLogoTotal + namesTotal;
                
                return (
                  <div key={groupKey}>
                    <h3 className="font-bold text-lg mb-2 text-primary">
                        {groupData.productType}
                        <span className="text-sm font-normal text-muted-foreground ml-2">({groupData.embroidery === 'logo' ? 'Logo Only' : 'Logo + Back Text'})</span>
                    </h3>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="py-2 px-3 text-black">Details</TableHead>
                            <TableHead className="py-2 px-3 text-black text-center">Category</TableHead>
                            <TableHead className="py-2 px-3 text-black text-center">Unit Price</TableHead>
                            <TableHead className="py-2 px-3 text-black text-center">Quantity</TableHead>
                            <TableHead className="py-2 px-3 text-right text-black">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="py-2 px-3 text-xs font-medium text-black align-middle">Items Ordered</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{tierLabel}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{formatCurrency(unitPrice)}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{groupData.totalQuantity}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">{formatCurrency(itemsSubtotal)}</TableCell>
                            </TableRow>
                           {groupAddOns.backLogo > 0 && (
                            <TableRow>
                                <TableCell className="py-2 px-3 text-xs text-black align-middle">Add On: Back Logo</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{tierLabel}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{formatCurrency(backLogoPrice)}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{groupAddOns.backLogo}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">{formatCurrency(backLogoTotal)}</TableCell>
                            </TableRow>
                           )}
                           {groupAddOns.names > 0 && (
                            <TableRow>
                                <TableCell className="py-2 px-3 text-xs text-black align-middle">Add On: Names</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{tierLabel}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{formatCurrency(namesPrice)}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{groupAddOns.names}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">{formatCurrency(namesTotal)}</TableCell>
                            </TableRow>
                           )}
                          {logoFee > 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="py-2 px-3 text-xs text-right text-black align-middle">One-time Logo Programming Fee</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">{formatCurrency(logoFee)}</TableCell>
                            </TableRow>
                          )}
                          {backTextFee > 0 && (
                             <TableRow>
                                <TableCell colSpan={4} className="py-2 px-3 text-xs text-right text-black align-middle">One-time Back Text Programming Fee</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">{formatCurrency(backTextFee)}</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                        <ShadTableFooter>
                            <TableRow>
                                <TableCell colSpan={3}>
                                    <AddOnsDialog groupKey={groupKey} addOns={addOns} setAddOns={setAddOns} totalQuantity={groupData.totalQuantity} />
                                </TableCell>
                                <TableCell className="py-2 px-3 text-right font-bold text-black">Subtotal</TableCell>
                                <TableCell className="py-2 px-3 text-right font-bold text-black">{formatCurrency(subtotal)}</TableCell>
                            </TableRow>
                        </ShadTableFooter>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      {grandTotal > 0 && (
         <CardFooter>
            <div className="w-full pt-4">
                <Separator />
                <div className="flex justify-end items-center mt-4">
                    <span className="text-xl font-bold text-black mr-4">Grand Total:</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
                </div>
            </div>
        </CardFooter>
      )}
    </Card>
  );
}

function AddOnsDialog({ groupKey, addOns, setAddOns, totalQuantity }: { groupKey: string, addOns: Record<string, AddOns>, setAddOns: React.Dispatch<React.SetStateAction<Record<string, AddOns>>>, totalQuantity: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localAddOns, setLocalAddOns] = useState(addOns[groupKey] || { backLogo: 0, names: 0 });

  const handleSave = () => {
    setAddOns(prev => ({ ...prev, [groupKey]: localAddOns }));
    setIsOpen(false);
  };
  
  const handleQuantityChange = (type: keyof AddOns, change: number) => {
    setLocalAddOns(prev => ({...prev, [type]: Math.max(0, prev[type] + change)}));
  }

  const handleInputChange = (type: keyof AddOns, value: string) => {
    setLocalAddOns(prev => ({...prev, [type]: value === '' ? 0 : parseInt(value, 10) || 0}));
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-yellow-300 text-black border border-black hover:bg-yellow-400 font-bold">Add Ons</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Ons</DialogTitle>
          <DialogDescription>
            Specify quantities for additional logos or names. Prices are based on the main product's quantity tier ({totalQuantity} pcs).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
                <Label htmlFor="backLogo" className="text-base">Back Logo</Label>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange('backLogo', -1)}><Minus className="h-4 w-4" /></Button>
                    <Input id="backLogo" type="text" value={localAddOns.backLogo} onChange={(e) => handleInputChange('backLogo', e.target.value)} className="w-16 text-center" />
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange('backLogo', 1)}><Plus className="h-4 w-4" /></Button>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <Label htmlFor="names" className="text-base">Names</Label>
                 <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange('names', -1)}><Minus className="h-4 w-4" /></Button>
                    <Input id="names" type="text" value={localAddOns.names} onChange={(e) => handleInputChange('names', e.target.value)} className="w-16 text-center" />
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange('names', 1)}><Plus className="h-4 w-4" /></Button>
                </div>
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
