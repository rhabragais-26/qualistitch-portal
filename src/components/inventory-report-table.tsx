
'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from './ui/skeleton';
import React from 'react';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';

type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
};

type Lead = {
  submissionDateTime: string;
  isSentToProduction?: boolean;
  isEndorsedToLogistics?: boolean;
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  orders: Order[];
};

type InventoryItem = {
  id: string;
  productType: string;
  color: string;
  size: string;
  stock: number;
};

const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

type InventoryReportTableProps = {
    reportType?: 'inventory' | 'priority';
    productTypeFilter: string;
    colorFilter: string;
    sizeFilter: string;
    sellThroughRateFilter?: string;
}

export function InventoryReportTable({ reportType = 'inventory', productTypeFilter, colorFilter, sizeFilter, sellThroughRateFilter }: InventoryReportTableProps) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return query(collection(firestore, 'inventory'));
  }, [firestore, user, isUserLoading]);

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'));
  }, [firestore, user]);

  const { data: inventoryItems, isLoading: isInventoryLoading, error: inventoryError } = useCollection<InventoryItem>(inventoryQuery, undefined, { listen: false });
  const { data: leads, isLoading: areLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery, undefined, { listen: false });

  const reportData = React.useMemo(() => {
    if (!inventoryItems || !leads) return { headers: [], rows: [] };
    
    const soldQuantities = new Map<string, number>();
    const onProcessQuantities = new Map<string, number>();
    const dispatchedQuantities = new Map<string, number>();
    
    if (leads) {
        leads.forEach(lead => {
            const createKey = (order: { productType: string, color: string, size: string }) => `${order.productType}-${order.color}-${order.size}`;
            
            lead.orders.forEach(order => {
                const key = createKey(order);
                soldQuantities.set(key, (soldQuantities.get(key) || 0) + order.quantity);
            });

            if (lead.shipmentStatus === 'Shipped' || lead.shipmentStatus === 'Delivered') {
                lead.orders.forEach(order => {
                    const key = createKey(order);
                    dispatchedQuantities.set(key, (dispatchedQuantities.get(key) || 0) + order.quantity);
                });
            } else if (lead.isSentToProduction || lead.isEndorsedToLogistics) {
                lead.orders.forEach(order => {
                    const key = createKey(order);
                    onProcessQuantities.set(key, (onProcessQuantities.get(key) || 0) + order.quantity);
                });
            }
        });
    }

    const enrichedItems = inventoryItems.map(item => {
        const key = `${item.productType}-${item.color}-${item.size}`;
        const sold = soldQuantities.get(key) || 0;
        const onProcess = onProcessQuantities.get(key) || 0;
        const dispatched = dispatchedQuantities.get(key) || 0;
        const onHand = item.stock;

        const count = (onHand + onProcess + dispatched) - sold;
        
        const totalStockEver = onHand + sold;
        const sellThroughRate = totalStockEver > 0 ? (sold / totalStockEver) * 100 : 0;

        return { ...item, count, sellThroughRate };
    });

    let processedItems = enrichedItems;
    
    if (reportType === 'priority') {
      processedItems = processedItems.filter(item => item.count <= 10);
    }
    
    if (reportType === 'priority' && sellThroughRateFilter && sellThroughRateFilter !== 'All') {
        processedItems = processedItems.filter(item => {
            const rate = item.sellThroughRate;
            switch(sellThroughRateFilter) {
                case '80-100': return rate >= 80;
                case '50-79': return rate >= 50 && rate < 80;
                case 'below-50': return rate < 50;
                default: return true;
            }
        });
    }
    
    let filteredItems = processedItems;
    if (productTypeFilter && productTypeFilter !== 'All') {
        filteredItems = filteredItems.filter(item => item.productType === productTypeFilter);
    }
    if (colorFilter && colorFilter !== 'All Colors') {
        filteredItems = filteredItems.filter(item => item.color === colorFilter);
    }
    if (sizeFilter && sizeFilter !== 'All Sizes') {
        filteredItems = filteredItems.filter(item => item.size === sizeFilter);
    }
    
    if (filteredItems.length === 0) return { headers: [], rows: [] };

    const colors = [...new Set(filteredItems.map(item => item.color))].sort();
    const sizes = sizeFilter !== 'All Sizes' ? [sizeFilter] : [...new Set(filteredItems.map(item => item.size))].sort((a, b) => {
        const indexA = sizeOrder.indexOf(a);
        const indexB = sizeOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    const rows = colors.map(color => {
      const sizeData: { [size: string]: number | null } = {};
      sizes.forEach(size => {
        const item = filteredItems.find(i => i.color === color && i.size === size);
        sizeData[size] = item ? item.count : null;
      });
      return { color, ...sizeData };
    }).filter(row => {
        if(reportType === 'priority') {
            return sizes.some(size => row[size] !== null && row[size]! <= 10);
        }
        return sizes.some(size => row[size] !== null);
    });
    
    return { headers: sizes, rows };

  }, [inventoryItems, leads, productTypeFilter, colorFilter, sizeFilter, reportType, sellThroughRateFilter]);
  

  const isLoading = isAuthLoading || isInventoryLoading || areLeadsLoading;
  const error = inventoryError || leadsError;

  return (
    <div className="border rounded-md">
        <ScrollArea>
          <Table>
            <TableHeader className="bg-neutral-800 sticky top-0 z-10">
              <TableRow>
                <TableHead className="text-white font-bold align-middle w-auto">Color</TableHead>
                {reportData.headers.map(size => (
                  <TableHead key={size} className="text-white font-bold align-middle text-center">{size}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                    <TableCell colSpan={reportData.headers.length + 1}>
                         <Skeleton className="h-24 w-full bg-gray-200" />
                    </TableCell>
                </TableRow>
               ) : error ? (
                <TableRow>
                    <TableCell colSpan={reportData.headers.length + 1} className="text-center text-destructive">
                        Error loading inventory report: {error.message}
                    </TableCell>
                </TableRow>
               ) : reportData.rows.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={reportData.headers.length + 1} className="text-center text-muted-foreground align-middle">
                        {reportType === 'priority' ? 'No items require priority purchase.' : 'No inventory data for the selected product type.'}
                    </TableCell>
                </TableRow>
              ) : (
                reportData.rows.map((row) => (
                  <TableRow key={row.color}>
                    <TableCell className="font-medium text-xs align-middle py-2 text-black">{row.color}</TableCell>
                    {reportData.headers.map(size => {
                      const stockCount = (row as any)[size];
                      let cellClass = "text-black";
                      if (stockCount < 0) cellClass = 'text-destructive font-bold';
                      else if (stockCount >= 0 && stockCount <= 10) cellClass = 'text-orange-500 font-bold';

                      return (
                      <TableCell key={size} className={cn("text-center font-medium text-xs align-middle py-2", cellClass)}>
                        {stockCount !== null ? stockCount : '-'}
                      </TableCell>
                    )})}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
  );
}
