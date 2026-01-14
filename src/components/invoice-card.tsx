
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as ShadTableFooter } from '@/components/ui/table';
import { Order } from './lead-form';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { getProductGroup, getUnitPrice, getProgrammingFees, type EmbroideryOption } from '@/lib/pricing';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

type InvoiceCardProps = {
  orders: Order[];
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
};

export function InvoiceCard({ orders }: InvoiceCardProps) {
  const [embroideryOption, setEmbroideryOption] = useState<EmbroideryOption>('logo');

  const groupedOrders = useMemo(() => {
    return orders.reduce((acc, order) => {
      const productGroup = getProductGroup(order.productType);
      if (!productGroup) return acc;
      
      const groupKey = `${order.productType}`;
      if (!acc[groupKey]) {
        acc[groupKey] = {
          productType: order.productType,
          orders: [],
          totalQuantity: 0,
        };
      }
      acc[groupKey].orders.push(order);
      acc[groupKey].totalQuantity += order.quantity;
      return acc;
    }, {} as Record<string, { productType: string; orders: Order[], totalQuantity: number }>);
  }, [orders]);

  const grandTotal = useMemo(() => {
    let total = 0;
    Object.values(groupedOrders).forEach(group => {
      const unitPrice = getUnitPrice(group.productType, group.totalQuantity, embroideryOption);
      const { logoFee, backTextFee } = getProgrammingFees(group.totalQuantity, embroideryOption);
      const subtotal = group.totalQuantity * unitPrice + logoFee + backTextFee;
      total += subtotal;
    });
    return total;
  }, [groupedOrders, embroideryOption]);

  return (
    <Card className="shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="font-headline text-xl">Pricing Summary</CardTitle>
            <div className="flex flex-col items-end gap-2">
                <RadioGroup value={embroideryOption} onValueChange={(v) => setEmbroideryOption(v as EmbroideryOption)} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="logo" id="r1" />
                        <Label htmlFor="r1" className="text-sm">with Logo</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="logoAndText" id="r2" />
                        <Label htmlFor="r2" className="text-sm">with Logo and Back Text</Label>
                    </div>
                </RadioGroup>
                 <Button variant="outline" size="sm">Add Ons</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-22rem)]">
          {Object.keys(groupedOrders).length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Add orders to see the price summary.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedOrders).map(([groupKey, groupData]) => {
                const unitPrice = getUnitPrice(groupData.productType, groupData.totalQuantity, embroideryOption);
                const { logoFee, backTextFee } = getProgrammingFees(groupData.totalQuantity, embroideryOption);
                const itemsSubtotal = groupData.totalQuantity * unitPrice;
                const subtotal = itemsSubtotal + logoFee + backTextFee;
                
                return (
                  <div key={groupKey}>
                    <h3 className="font-bold text-lg mb-2 text-primary">{groupData.productType}</h3>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-black py-2 px-3">Description</TableHead>
                            <TableHead className="text-black text-right py-2 px-3">Unit Price</TableHead>
                            <TableHead className="text-black text-right py-2 px-3">Quantity</TableHead>
                            <TableHead className="text-black text-right py-2 px-3">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="text-black text-xs font-medium py-2 px-3">Total Items</TableCell>
                                <TableCell className="text-black text-xs text-right py-2 px-3">{formatCurrency(unitPrice)}</TableCell>
                                <TableCell className="text-black text-xs text-right py-2 px-3">{groupData.totalQuantity}</TableCell>
                                <TableCell className="text-black text-xs text-right py-2 px-3">{formatCurrency(itemsSubtotal)}</TableCell>
                            </TableRow>
                          {logoFee > 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-black text-xs text-right py-2 px-3">One-time Logo Programming Fee</TableCell>
                                <TableCell className="text-black text-xs text-right py-2 px-3">{formatCurrency(logoFee)}</TableCell>
                            </TableRow>
                          )}
                          {backTextFee > 0 && (
                             <TableRow>
                                <TableCell colSpan={3} className="text-black text-xs text-right py-2 px-3">One-time Back Text Programming Fee</TableCell>
                                <TableCell className="text-black text-xs text-right py-2 px-3">{formatCurrency(backTextFee)}</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                        <ShadTableFooter>
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold text-black py-2 px-3">Subtotal</TableCell>
                                <TableCell className="text-right font-bold text-black py-2 px-3">{formatCurrency(subtotal)}</TableCell>
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
