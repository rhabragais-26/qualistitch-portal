
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as ShadTableFooter } from '@/components/ui/table';
import { Order } from './lead-form';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { getProductGroup, getUnitPrice, getProgrammingFees, type EmbroideryOption, getTierLabel } from '@/lib/pricing';
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
    Object.values(groupedOrders).forEach(group => {
      const unitPrice = getUnitPrice(group.productType, group.totalQuantity, group.embroidery);
      const { logoFee, backTextFee } = getProgrammingFees(group.totalQuantity, group.embroidery);
      const subtotal = group.totalQuantity * unitPrice + logoFee + backTextFee;
      total += subtotal;
    });
    return total;
  }, [groupedOrders]);

  return (
    <Card className="shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="font-headline text-xl">Pricing Summary</CardTitle>
            <div className="flex flex-col items-end gap-2">
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
                const unitPrice = getUnitPrice(groupData.productType, groupData.totalQuantity, groupData.embroidery);
                const tierLabel = getTierLabel(groupData.productType, groupData.totalQuantity, groupData.embroidery);
                const { logoFee, backTextFee } = getProgrammingFees(groupData.totalQuantity, groupData.embroidery);
                const itemsSubtotal = groupData.totalQuantity * unitPrice;
                const subtotal = itemsSubtotal + logoFee + backTextFee;
                
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
                                <TableCell colSpan={4} className="py-2 px-3 text-right font-bold text-black">Subtotal</TableCell>
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
