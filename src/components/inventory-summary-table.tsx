
'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
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
import { Input } from './ui/input';
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
  'Polo Shirt (Coolpass)',
  'Polo Shirt (Cotton Blend)',
];

const productColors = [
  'Black', 'Brown', 'Dark Khaki', 'Light Khaki', 'Olive Green', 'Navy Blue',
  'Light Gray', 'Dark Gray', 'Khaki', 'Black/Khaki', 'Black/Navy Blue',
  'Army Green', 'Polo Color',
];

const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

export function InventorySummaryTable() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [productTypeFilter, setProductTypeFilter] = React.useState('All');
  const [colorFilter, setColorFilter] = React.useState('All');
  
  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'inventory'), orderBy('productType', 'asc'));
  }, [firestore, user]);

  const { data: inventoryItems, isLoading: isInventoryLoading, error } = useCollection<InventoryItem>(inventoryQuery);

  const filteredItems = React.useMemo(() => {
    if (!inventoryItems) return [];
    
    const filtered = inventoryItems.filter(item => {
      const matchesProductType = productTypeFilter === 'All' || item.productType === productTypeFilter;
      const matchesColor = colorFilter === 'All' || item.color === colorFilter;
      return matchesProductType && matchesColor;
    });

    return filtered.sort((a, b) => {
        const sizeAIndex = sizeOrder.indexOf(a.size);
        const sizeBIndex = sizeOrder.indexOf(b.size);

        if (sizeAIndex === -1 && sizeBIndex === -1) return a.size.localeCompare(b.size);
        if (sizeAIndex === -1) return 1;
        if (sizeBIndex === -1) return -1;
        
        return sizeAIndex - sizeBIndex;
    });

  }, [inventoryItems, productTypeFilter, colorFilter]);

  const isLoading = isAuthLoading || isInventoryLoading;

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-black">Inventory Summary</CardTitle>
              <CardDescription className="text-gray-600">
                Number of stocks by Product Type, Color and Size.
              </CardDescription>
            </div>
             <div className="flex items-center gap-4">
                <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
                    <SelectTrigger className="w-[220px] bg-gray-100 text-black placeholder:text-gray-500">
                    <SelectValue placeholder="Filter by Product Type" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="All">All Product Types</SelectItem>
                    {productTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <Select value={colorFilter} onValueChange={setColorFilter}>
                    <SelectTrigger className="w-[180px] bg-gray-100 text-black placeholder:text-gray-500">
                    <SelectValue placeholder="Filter by Color" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="All">All Colors</SelectItem>
                    {productColors.map(color => (
                        <SelectItem key={color} value={color}>{color}</SelectItem>
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
            Error loading inventory: {error.message}
          </div>
        )}
        {!isLoading && !error && (
           <div className="border rounded-md h-full">
            <ScrollArea className="h-full">
                <Table>
                  <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-white font-bold align-middle">Product Type</TableHead>
                      <TableHead className="text-white font-bold align-middle">Color</TableHead>
                      <TableHead className="text-white font-bold align-middle">Size</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                    <TableBody>
                    {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium text-xs align-middle py-2 text-black">{item.productType}</TableCell>
                            <TableCell className="text-xs align-middle py-2 text-black">{item.color}</TableCell>
                            <TableCell className="text-xs align-middle py-2 text-black">{item.size}</TableCell>
                            <TableCell className="text-center font-medium text-xs align-middle py-2 text-black">{item.stock}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
