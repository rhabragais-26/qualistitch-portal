

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

type InventoryItem = {
  id: string;
  productType: string;
  color: string;
  size: string;
  stock: number;
};

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
];

const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

export function InventoryReportTable() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [productTypeFilter, setProductTypeFilter] = React.useState(productTypes[0]);

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'inventory'));
  }, [firestore, user]);

  const { data: inventoryItems, isLoading: isInventoryLoading, error: inventoryError } = useCollection<InventoryItem>(inventoryQuery, undefined, { listen: false });

  const reportData = React.useMemo(() => {
    if (!inventoryItems) return { headers: [], rows: [] };

    const filtered = inventoryItems.filter(item => item.productType === productTypeFilter);

    if (filtered.length === 0) return { headers: [], rows: [] };

    const colors = [...new Set(filtered.map(item => item.color))].sort();
    const sizes = [...new Set(filtered.map(item => item.size))].sort((a, b) => {
        const indexA = sizeOrder.indexOf(a);
        const indexB = sizeOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    const rows = colors.map(color => {
      const sizeData: { [size: string]: number } = {};
      sizes.forEach(size => {
        const item = filtered.find(i => i.color === color && i.size === size);
        sizeData[size] = item ? item.stock : 0;
      });
      return { color, ...sizeData };
    });
    
    return { headers: sizes, rows };

  }, [inventoryItems, productTypeFilter]);

  const isLoading = isAuthLoading || isInventoryLoading;
  const error = inventoryError;

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-black">Inventory Report</CardTitle>
            <CardDescription className="text-gray-600">
              Stock quantity breakdown by color and size.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
              <SelectTrigger className="w-[220px] bg-gray-100 text-black placeholder:text-gray-500">
                <SelectValue placeholder="Filter by Product Type" />
              </SelectTrigger>
              <SelectContent>
                {productTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                            No inventory data for the selected product type.
                        </TableCell>
                    </TableRow>
                  ) : (
                    reportData.rows.map((row) => (
                      <TableRow key={row.color}>
                        <TableCell className="font-medium text-xs align-middle py-2 text-black">{row.color}</TableCell>
                        {reportData.headers.map(size => (
                          <TableCell key={size} className="text-center font-medium text-xs align-middle py-2 text-black">
                            {(row as any)[size] > 0 ? (row as any)[size] : '-'}
                          </TableCell>
                        ))}
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
