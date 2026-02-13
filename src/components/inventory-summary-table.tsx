

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
import React, { useMemo, useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Boxes, Shirt, PackageX, MinusCircle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  'Polo Shirt (Lifeline)',
  'Polo Shirt (Blue Corner)',
  'Polo Shirt (Softex)',
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

const statusOptions = ['All Statuses', 'In Stock', 'Low Stock', 'Out of Stock', 'Negative Stock'];

export function InventorySummaryTable() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [productTypeFilter, setProductTypeFilter] = React.useState('All');
  const [colorFilter, setColorFilter] = React.useState('All');
  const [statusFilter, setStatusFilter] = React.useState('All Statuses');
  const [searchTerm, setSearchTerm] = useState('');
  const [sizeFilter, setSizeFilter] = useState('All');

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
      return ['All', ...[...new Set([...jacketColors, ...poloShirtColors])].sort()];
    }
    const isPolo = productTypeFilter.includes('Polo Shirt');
    return ['All', ...(isPolo ? poloShirtColors : jacketColors)];
  }, [productTypeFilter]);
  
  const availableSizes = useMemo(() => {
      if (!inventoryItems) return ['All'];
      const sizes = [...new Set(inventoryItems.map(item => item.size))].sort((a, b) => {
        const indexA = sizeOrder.indexOf(a);
        const indexB = sizeOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
      });
      return ['All', ...sizes];
  }, [inventoryItems]);

  useEffect(() => {
    if (colorFilter !== 'All' && !availableColors.includes(colorFilter)) {
      setColorFilter('All');
    }
  }, [availableColors, colorFilter]);

  const enrichedItems = useMemo(() => {
    if (!inventoryItems || !leads) return [];
    
    const soldQuantities = new Map<string, number>();
    leads.forEach(lead => {
        lead.orders.forEach(order => {
            const key = `${order.productType}-${order.color}-${order.size}`;
            soldQuantities.set(key, (soldQuantities.get(key) || 0) + order.quantity);
        });
    });

    return inventoryItems.map(item => {
        const key = `${item.productType}-${item.color}-${item.size}`;
        const sold = soldQuantities.get(key) || 0;
        return {
            ...item,
            sold,
            remaining: item.stock - sold,
        };
    });
  }, [inventoryItems, leads]);
  
  const filteredItems = useMemo(() => {
    return enrichedItems.filter(item => {
      const matchesProductType = productTypeFilter === 'All' || item.productType === productTypeFilter;
      const matchesColor = colorFilter === 'All' || item.color === colorFilter;
      const matchesSize = sizeFilter === 'All' || item.size === sizeFilter;
      
      let status = '';
      if (item.remaining < 0) status = 'Negative Stock';
      else if (item.remaining === 0) status = 'Out of Stock';
      else if (item.remaining <= 10) status = 'Low Stock';
      else status = 'In Stock';
      
      const matchesStatus = statusFilter === 'All Statuses' || status === statusFilter;
      
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ? item.productType.toLowerCase().includes(lowercasedSearchTerm) : true;
      
      return matchesProductType && matchesColor && matchesSize && matchesStatus && matchesSearch;
    }).sort((a, b) => {
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

  }, [enrichedItems, productTypeFilter, colorFilter, statusFilter, searchTerm, sizeFilter]);

  const summaryData = useMemo(() => {
    if (!enrichedItems) return { total: 0, low: 0, outOfStock: 0, negative: 0 };
    return enrichedItems.reduce((acc, item) => {
        acc.total++;
        if (item.remaining < 0) {
            acc.negative++;
        } else if (item.remaining === 0) {
            acc.outOfStock++;
        } else if (item.remaining > 0 && item.remaining <= 10) {
            acc.low++;
        }
        return acc;
    }, { total: 0, low: 0, outOfStock: 0, negative: 0 });
  }, [enrichedItems]);

  const getStatusBadge = (remaining: number) => {
    if (remaining < 0) return <Badge variant="destructive" className="bg-red-600">Negative Stock</Badge>;
    if (remaining === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (remaining <= 10) return <Badge variant="warning">Low Stock</Badge>;
    return <Badge variant="success">In Stock</Badge>;
  };

  const isLoading = isAuthLoading || isInventoryLoading || areLeadsLoading;
  const error = inventoryError || leadsError;

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col border-none">
      <CardHeader>
          <CardTitle className="text-black">Inventory Summary</CardTitle>
           {isLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
           ) : error ? (
            <CardDescription className="text-destructive">Could not load summary data.</CardDescription>
           ) : (
             <>
                <CardDescription className="text-gray-600">
                    An overview of all product variants and their stock levels.
                </CardDescription>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-4">
                    <Card className="bg-blue-500 text-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
                            <Boxes className="h-4 w-4" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{summaryData.total}</div></CardContent>
                    </Card>
                    <Card className="bg-yellow-500 text-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                            <Shirt className="h-4 w-4" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{summaryData.low}</div></CardContent>
                    </Card>
                    <Card className="bg-red-500 text-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                            <PackageX className="h-4 w-4" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{summaryData.outOfStock}</div></CardContent>
                    </Card>
                    <Card className="bg-red-600 text-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Negative Stock</CardTitle>
                            <MinusCircle className="h-4 w-4" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{summaryData.negative}</div></CardContent>
                    </Card>
                </div>
             </>
           )}
          <div className="flex items-center gap-2 pt-4">
              <Input
                  placeholder="Search item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-100 text-black placeholder:text-gray-500 max-w-xs"
              />
              <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
                  <SelectTrigger className="w-[180px] bg-gray-100 text-black placeholder:text-gray-500">
                  <SelectValue placeholder="Item: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">Item: All</SelectItem>
                    {[...new Set(inventoryItems?.map(i => i.productType) || [])].sort().map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
              </Select>
              <Select value={colorFilter} onValueChange={setColorFilter}>
                  <SelectTrigger className="w-[180px] bg-gray-100 text-black placeholder:text-gray-500">
                  <SelectValue placeholder="Color: All" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColors.map(color => (
                        <SelectItem key={color} value={color}>{color === 'All' ? 'Color: All' : color}</SelectItem>
                    ))}
                  </SelectContent>
              </Select>
               <Select value={sizeFilter} onValueChange={setSizeFilter}>
                  <SelectTrigger className="w-[120px] bg-gray-100 text-black placeholder:text-gray-500">
                    <SelectValue placeholder="Size: All" />
                  </SelectTrigger>
                  <SelectContent>
                     {availableSizes.map(size => (
                        <SelectItem key={size} value={size}>{size === 'All' ? 'Size: All' : size}</SelectItem>
                     ))}
                  </SelectContent>
              </Select>
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
                      <TableHead className="text-white font-bold align-middle">Item</TableHead>
                      <TableHead className="text-white font-bold align-middle">Color</TableHead>
                      <TableHead className="text-white font-bold align-middle">Size</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">Stocks</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">Sold Qty</TableHead>
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
                            <TableCell className={cn("text-center font-bold text-xs align-middle py-2", item.remaining < 0 && "text-destructive")}>{item.remaining}</TableCell>
                            <TableCell className="text-center align-middle py-2">
                              {getStatusBadge(item.remaining)}
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
