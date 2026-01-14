"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as ShadTableFooter } from '@/components/ui/table';
import { Order } from './lead-form';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

type QuotationCardProps = {
  orders: Order[];
};

export function QuotationCard({ orders }: QuotationCardProps) {
  const groupedOrders = useMemo(() => {
    return orders.reduce((acc, order) => {
      if (!acc[order.productType]) {
        acc[order.productType] = [];
      }
      acc[order.productType].push(order);
      return acc;
    }, {} as Record<string, Order[]>);
  }, [orders]);

  const grandTotal = useMemo(() => {
    return orders.reduce((sum, order) => sum + order.quantity, 0);
  }, [orders]);

  return (
    <Card className="shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Quotation</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-20rem)]">
          {Object.keys(groupedOrders).length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Add orders to see the quotation summary.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedOrders).map(([productType, productOrders]) => {
                const productTotal = productOrders.reduce((sum, order) => sum + order.quantity, 0);
                return (
                  <div key={productType}>
                    <h3 className="font-bold text-lg mb-2 text-primary">{productType}</h3>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-black">Color</TableHead>
                            <TableHead className="text-black">Size</TableHead>
                            <TableHead className="text-black text-right">Quantity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productOrders.map((order, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-black text-xs">{order.color}</TableCell>
                              <TableCell className="text-black text-xs">{order.size}</TableCell>
                              <TableCell className="text-black text-xs text-right">{order.quantity}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <ShadTableFooter>
                            <TableRow>
                                <TableCell colSpan={2} className="text-right font-bold text-black">Total for {productType}</TableCell>
                                <TableCell className="text-right font-bold text-black">{productTotal}</TableCell>
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
                    <span className="text-2xl font-bold text-primary">{grandTotal}</span>
                </div>
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
