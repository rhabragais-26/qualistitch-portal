

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
import React, { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
};

type Lead = {
  orders: Order[];
};

type InventoryItem = {
  id: string;
  productType: string;
  color: string;
  size: string;
  stock: number;
};

type EnrichedInventoryItem = InventoryItem & {
  sold: number;
  remaining: number;
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
];

const jacketColors = [
  'Black', 'Brown', 'Dark Khaki', 'Light Khaki', 'Olive Green', 'Navy Blue',
  'Light Gray', 'Dark Gray', 'Khaki', 'Black/Khaki', 'Black/Navy Blue',
  'Army Green',
];

const poloShirtColors = [
    'White', 'Black', 'Light Gray', 'Dark Gray', 'Red', 'Maroon', 'Navy Blue', 'Royal Blue', 'Aqua Blue', 'Slate Blue', 'Emerald Green', 'Golden Yellow', 'Yellow', 'Orange', 'Dark Green', 'Green', 'Light Green', 'Pink', 'Fuchsia', 'Sky Blue', 'Oatmeal', 'Cream', 'Purple', 'Gold', 'Brown'
];

const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

const statusOptions = ['All Statuses', 'In Stock', 'Low Stock', 'Need to Reorder'];

export function InventorySummaryTable() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [productTypeFilter, setProductTypeFilter] = React.useState('All');
  const [colorFilter, setColorFilter] = React.useState('All');
  const [statusFilter, setStatusFilter] = React.useState('All Statuses');
  
  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'inventory'), orderBy('productType', 'asc'));
  }, [firestore, user]);

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'));
  }, [firestore, user]);

  const { data: inventoryItems, isLoading: isInventoryLoading, error: inventoryError } = useCollection<InventoryItem>(inventoryQuery, undefined, { listen: false });
  const { data: leads, isLoading: areLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery, undefined, { listen: false });

  const availableColors = React.useMemo(() => {
    if (productTypeFilter === 'All') {
      return [...new Set([...jacketColors, ...poloShirtColors])].sort();
    }
    const isPolo = productTypeFilter.includes('Polo Shirt');
    return isPolo ? poloShirtColors : jacketColors;
  }, [productTypeFilter]);

  React.useEffect(() => {
    if (colorFilter !== 'All' && !availableColors.includes(colorFilter)) {
      setColorFilter('All');
    }
  }, [availableColors, colorFilter]);

  const filteredItems = useMemo(() => {
    if (!inventoryItems || !leads) return [];
    
    const soldQuantities = new Map<string, number>();
    leads.forEach(lead => {
        lead.orders.forEach(order => {
            const key = `${order.productType}-${order.color}-${order.size}`;
            soldQuantities.set(key, (soldQuantities.get(key) || 0) + order.quantity);
        });
    });

    const enrichedItems: EnrichedInventoryItem[] = inventoryItems.map(item => {
        const key = `${item.productType}-${item.color}-${item.size}`;
        const sold = soldQuantities.get(key) || 0;
        return {
            ...item,
            sold,
            remaining: item.stock - sold,
        };
    });
    
    const filtered = enrichedItems.filter(item => {
      const matchesProductType = productTypeFilter === 'All' || item.productType === productTypeFilter;
      const matchesColor = colorFilter === 'All' || item.color === colorFilter;
      
      let matchesStatus = true;
      if (statusFilter !== 'All Statuses') {
        if (statusFilter === 'Need to Reorder') {
          matchesStatus = item.remaining <= 5;
        } else if (statusFilter === 'Low Stock') {
          matchesStatus = item.remaining > 5 && item.remaining <= 10;
        } else if (statusFilter === 'In Stock') {
          matchesStatus = item.remaining > 10;
        }
      }
      
      return matchesProductType && matchesColor && matchesStatus;
    });

    return filtered.sort((a, b) => {
        const productTypeComparison = a.productType.localeCompare(b.productType);
        if (productTypeComparison !== 0) {
            return productTypeComparison;
        }

        const colorComparison = a.color.localeCompare(b.color);
        if (colorComparison !== 0) {
            return colorComparison;
        }

        const sizeAIndex = sizeOrder.indexOf(a.size);
        const sizeBIndex = sizeOrder.indexOf(b.size);

        if (sizeAIndex === -1 && sizeBIndex === -1) return a.size.localeCompare(b.size);
        if (sizeAIndex === -1) return 1;
        if (sizeBIndex === -1) return -1;
        
        return sizeAIndex - sizeBIndex;
    });

  }, [inventoryItems, leads, productTypeFilter, colorFilter, statusFilter]);

  const isLoading = isAuthLoading || isInventoryLoading || areLeadsLoading;
  const error = inventoryError || leadsError;

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col border-none">
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
                    {availableColors.map(color => (
                        <SelectItem key={color} value={color}>{color}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] bg-gray-100 text-black placeholder:text-gray-500">
                    <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                    {statusOptions.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-gray-200" />
            ))}
          </div>
        ) : error ? (
          <div className="text-red-500 p-4">
            Error loading inventory: {error.message}
          </div>
        ) : (
           <div className="border rounded-md h-full">
            <ScrollArea className="h-full">
                <Table>
                  <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-white font-bold align-middle">Product Type</TableHead>
                      <TableHead className="text-white font-bold align-middle">Color</TableHead>
                      <TableHead className="text-white font-bold align-middle">Size</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">Stock</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">Sold</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">Remaining</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                    <TableBody>
                    {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium text-xs align-middle py-2 text-black">{item.productType}</TableCell>
                            <TableCell className="text-xs align-middle py-2 text-black">{item.color}</TableCell>
                            <TableCell className="text-xs align-middle py-2 text-black">{item.size}</TableCell>
                            <TableCell className="text-center font-medium text-xs align-middle py-2 text-black">{item.stock}</TableCell>
                            <TableCell className="text-center font-medium text-xs align-middle py-2 text-black">{item.sold}</TableCell>
                            <TableCell className="text-center font-medium text-xs align-middle py-2 text-black">{item.remaining}</TableCell>
                            <TableCell className="text-center align-middle py-2">
                              {item.remaining <= 5 ? (
                                <Badge variant="destructive">Need to Reorder</Badge>
                              ) : item.remaining <= 10 ? (
                                <Badge variant="warning">Low Stock</Badge>
                              ) : (
                                <Badge variant="secondary">In Stock</Badge>
                              )}
                            </TableCell>
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
    
