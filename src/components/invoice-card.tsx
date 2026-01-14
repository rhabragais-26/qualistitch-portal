
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as ShadTableFooter } from '@/components/ui/table';
import { Order } from './lead-form';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { getProductGroup, getUnitPrice, getProgrammingFees, type EmbroideryOption } from '@/lib/pricing';

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
      
      const groupKey = `${productGroup}-${order.embroidery}`;
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

  const getEmbroideryLabel = (embroidery: EmbroideryOption) => {
    return embroidery === 'logo' ? 'Logo Only' : 'Logo + Back Text';
  };

  return (
    <Card className="shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Pricing Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-20rem)]">
          {Object.keys(groupedOrders).length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Add orders to see the price summary.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedOrders).map(([groupKey, groupData]) => {
                const unitPrice = getUnitPrice(groupData.productType, groupData.totalQuantity, groupData.embroidery);
                const { logoFee, backTextFee } = getProgrammingFees(groupData.totalQuantity, groupData.embroidery);
                const itemsSubtotal = groupData.totalQuantity * unitPrice;
                const subtotal = itemsSubtotal + logoFee + backTextFee;
                
                return (
                  <div key={groupKey}>
                    <h3 className="font-bold text-lg mb-2 text-primary">{groupData.productType}</h3>
                    <p className="text-sm text-muted-foreground mb-2 -mt-2">{getEmbroideryLabel(groupData.embroidery)}</p>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-black">Item</TableHead>
                            <TableHead className="text-black text-right">Unit Price</TableHead>
                            <TableHead className="text-black text-right">Quantity</TableHead>
                            <TableHead className="text-black text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupData.orders.map((order, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-black text-xs">{order.color} - {order.size}</TableCell>
                              <TableCell className="text-black text-xs text-right">{formatCurrency(unitPrice)}</TableCell>
                              <TableCell className="text-black text-xs text-right">{order.quantity}</TableCell>
                              <TableCell className="text-black text-xs text-right">{formatCurrency(order.quantity * unitPrice)}</TableCell>
                            </TableRow>
                          ))}
                          {logoFee > 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-black text-xs text-right">One-time Logo Programming Fee</TableCell>
                                <TableCell className="text-black text-xs text-right">{formatCurrency(logoFee)}</TableCell>
                            </TableRow>
                          )}
                          {backTextFee > 0 && (
                             <TableRow>
                                <TableCell colSpan={3} className="text-black text-xs text-right">One-time Back Text Programming Fee</TableCell>
                                <TableCell className="text-black text-xs text-right">{formatCurrency(backTextFee)}</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                        <ShadTableFooter>
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold text-black">Subtotal</TableCell>
                                <TableCell className="text-right font-bold text-black">{formatCurrency(subtotal)}</TableCell>
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

    