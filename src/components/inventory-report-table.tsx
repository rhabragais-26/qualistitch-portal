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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';

type InventoryItem = {
  id: string;
  productType: string;
  color: string;
  size: string;
  stock: number;
};

type Lead = {
  orders: {
    productType: string;
    color: string;
    size: string;
    quantity: number;
  }[];
};

const allProductTypes = [
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

const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

type InventoryReportTableProps = {
    reportType?: 'inventory' | 'priority';
}

export function InventoryReportTable({ reportType = 'inventory' }: InventoryReportTableProps) {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [productTypeFilter, setProductTypeFilter] = React.useState(allProductTypes[0]);

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'inventory'));
  }, [firestore, user]);

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'));
  }, [firestore, user]);

  const { data: inventoryItems, isLoading: isInventoryLoading, error: inventoryError } = useCollection<InventoryItem>(inventoryQuery, undefined, { listen: false });
  const { data: leads, isLoading: areLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery, undefined, { listen: false });

  const reportData = React.useMemo(() => {
    if (!inventoryItems) return { headers: [], rows: [] };
    
    let processedItems: {productType: string, color: string, size: string, count: number}[];
    
    const soldQuantities = new Map<string, number>();
    if (leads) {
        leads.forEach(lead => {
            if (lead.orders) {
                lead.orders.forEach(order => {
                    const key = `${order.productType}-${order.color}-${order.size}`;
                    soldQuantities.set(key, (soldQuantities.get(key) || 0) + order.quantity);
                });
            }
        });
    }

    if (reportType === 'priority') {
      if (!leads) return { headers: [], rows: [] };

      processedItems = inventoryItems.map(item => {
        const key = `${item.productType}-${item.color}-${item.size}`;
        const sold = soldQuantities.get(key) || 0;
        return { ...item, count: item.stock - sold };
      }).filter(item => item.count <= 10);

    } else { // 'inventory' reportType
      processedItems = inventoryItems.map(item => {
        const key = `${item.productType}-${item.color}-${item.size}`;
        const sold = soldQuantities.get(key) || 0;
        return {...item, count: item.stock - sold};
      });
    }

    let filteredItems = processedItems;
    if (productTypeFilter && productTypeFilter !== 'All') {
        filteredItems = filteredItems.filter(item => item.productType === productTypeFilter);
    }
    
    if (filteredItems.length === 0) return { headers: [], rows: [] };

    const colors = [...new Set(filteredItems.map(item => item.color))].sort();
    const sizes = [...new Set(filteredItems.map(item => item.size))].sort((a, b) => {
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
        // Only include rows that have at least one size with a count
        if(reportType === 'priority') {
            return sizes.some(size => row[size] !== null && row[size]! <= 10);
        }
        return sizes.some(size => row[size] !== null);
    });
    
    return { headers: sizes, rows };

  }, [inventoryItems, leads, productTypeFilter, reportType]);

  const isLoading = isAuthLoading || isInventoryLoading || areLeadsLoading;
  const error = inventoryError || leadsError;

  const title = reportType === 'priority' ? 'For Priority Purchase' : 'Remaining Stocks';
  const description = reportType === 'priority' 
    ? 'Items with low or negative stock levels (10 or less remaining).'
    : 'Remaining stock quantity breakdown by color and size.';
    
  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-black">{title}</CardTitle>
            <CardDescription className="text-gray-600">
              {description}
            </CardDescription>
          </div>
          {reportType === 'inventory' && (
            <div className="flex items-center gap-4">
              <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
                <SelectTrigger className="w-[220px] bg-gray-100 text-black placeholder:text-gray-500">
                  <SelectValue placeholder="Filter by Product Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Products</SelectItem>
                  {allProductTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {isLoading && (
          <div className="space-y-2 p-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-gray-200" />
            ))}
          </div>
        )}
        {error && (
          <div className="text-red-500 p-4">
            Error loading inventory report: {error.message}
          </div>
        )}
        {!isLoading && !error && (
          <div className="border rounded-md h-full">
            <ScrollArea className="h-full">
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
                  {reportData.rows.length === 0 ? (
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
        )}
      </CardContent>
    </Card>
  );
}
