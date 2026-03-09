

'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, runTransaction, getDoc, writeBatch, getDocs } from 'firebase/firestore';
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
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Boxes, Shirt, PackageX, MinusCircle, Edit, Save, X } from 'lucide-react';
import { cn, generateSku } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
};

type Lead = {
  orders: Order[];
  isSentToProduction?: boolean;
  isEndorsedToLogistics?: boolean;
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
};

type InventoryItem = {
  id: string;
  productType: string;
  color: string;
  size: string;
  stock: number;
};

type EnrichedInventoryItem = InventoryItem & {
  sku: string;
  soldQty: number;
  onProcess: number;
  dispatched: number;
  remaining: number;
  sellThroughRate: number;
};

const jacketColors = [
    'Army Green',
    'Black',
    'Black/Gray',
    'Black/Khaki',
    'Black/Navy Blue',
    'Brown',
    'Dark Gray',
    'Dark Khaki',
    'Khaki',
    'Light Gray',
    'Light Khaki',
    'Maroon/Gray',
    'Navy Blue',
    'Navy Blue/Gray',
    'Olive Green',
];

const poloShirtColors = [
    'White', 'Black', 'Light Gray', 'Dark Gray', 'Red', 'Maroon', 'Navy Blue', 'Royal Blue', 'Aqua Blue', 'Emerald Green', 'Golden Yellow', 'Slate Blue', 'Yellow', 'Orange', 'Dark Green', 'Green', 'Light Green', 'Pink', 'Fuchsia', 'Sky Blue', 'Oatmeal', 'Cream', 'Purple', 'Gold', 'Brown'
];

const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

const statusOptions = ['All Statuses', 'In Stock', 'Low Stock', 'Out of Stock', 'Negative Stock'];

export function InventorySummaryTable() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading, isAdmin } = useUser();
  const { toast } = useToast();

  const [productTypeFilter, setProductTypeFilter] = React.useState('All');
  const [colorFilter, setColorFilter] = React.useState('All');
  const [statusFilter, setStatusFilter] = React.useState('All Statuses');
  const [searchTerm, setSearchTerm] = useState('');
  const [sizeFilter, setSizeFilter] = useState('All');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedStocks, setEditedStocks] = useState<Record<string, number>>({});
  const [editedColors, setEditedColors] = useState<Record<string, string>>({});

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user || isAuthLoading) return null;
    return query(collection(firestore, 'inventory'), orderBy('productType', 'asc'));
  }, [firestore, user, isAuthLoading]);
  
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user || isAuthLoading) return null;
    return query(collection(firestore, 'leads'));
  }, [firestore, user, isAuthLoading]);

  const { data: inventoryItems, isLoading: isInventoryLoading, error: inventoryError, refetch } = useCollection<InventoryItem>(inventoryQuery);
  const { data: leads, isLoading: areLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery, undefined, { listen: false });


  const handleStockChange = (itemId: string, value: string) => {
    const newStock = parseInt(value, 10);
    if (!isNaN(newStock)) {
      setEditedStocks(prev => ({
        ...prev,
        [itemId]: newStock,
      }));
    }
  };

  const handleColorChange = (itemId: string, value: string) => {
    setEditedColors(prev => ({
        ...prev,
        [itemId]: value,
    }));
  };

  const handleSave = async () => {
    if (!firestore) return;
    setIsEditMode(false);

    const uniqueItemIds = [...new Set([...Object.keys(editedStocks), ...Object.keys(editedColors)])];
    if (uniqueItemIds.length === 0) return;

    let successCount = 0;
    let errorCount = 0;
    const batch = writeBatch(firestore);

    for (const itemId of uniqueItemIds) {
      const originalItem = inventoryItems?.find(i => i.id === itemId);
      if (!originalItem) continue;

      const newStock = editedStocks[itemId] ?? originalItem.stock;
      const newColor = editedColors[itemId] ?? originalItem.color;

      // If only stock is changed, just update
      if (newColor === originalItem.color) {
        batch.update(doc(firestore, 'inventory', itemId), { stock: newStock });
        successCount++;
        continue;
      }

      // Color has changed: Delete old and create/update new
      const oldDocRef = doc(firestore, 'inventory', itemId);
      const newItemId = `${originalItem.productType}-${newColor}-${originalItem.size}`.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-');
      const newDocRef = doc(firestore, 'inventory', newItemId);

      try {
        await runTransaction(firestore, async (transaction) => {
          const newDocSnap = await transaction.get(newDocRef);
          
          if (newDocSnap.exists()) {
            const existingStock = newDocSnap.data().stock || 0;
            transaction.update(newDocRef, { stock: existingStock + newStock });
          } else {
            transaction.set(newDocRef, {
              id: newItemId,
              productType: originalItem.productType,
              color: newColor,
              size: originalItem.size,
              stock: newStock,
            });
          }
          transaction.delete(oldDocRef);
        });
        successCount++;
      } catch (e) {
        errorCount++;
        console.error(`Error moving item ${itemId} to ${newItemId}:`, e);
      }
    }
    
    try {
        await batch.commit();
        if (errorCount > 0) {
            toast({ variant: "destructive", title: "Partial Failure", description: `${errorCount} item(s) could not be updated.` });
        }
        if (successCount > 0) {
            toast({ title: "Inventory Updated", description: `${successCount} item(s) have been saved successfully.` });
        }
        refetch();
    } catch (error: any) {
        console.error("Error committing batch:", error);
        toast({ variant: "destructive", title: "Save Failed", description: error.message || "Could not save all changes." });
    } finally {
        setEditedStocks({});
        setEditedColors({});
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedStocks({});
    setEditedColors({});
  };

  const availableColors = React.useMemo(() => {
    if (!inventoryItems) {
      return ['All'];
    }

    let itemsToConsider = inventoryItems;
    if (productTypeFilter !== 'All') {
      itemsToConsider = inventoryItems.filter(
        (item) => item.productType === productTypeFilter
      );
    }

    const uniqueColors = [...new Set(itemsToConsider.map((item) => item.color))].sort();
    return ['All', ...uniqueColors];
  }, [inventoryItems, productTypeFilter]);
  
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
    const onProcessQuantities = new Map<string, number>();
    const dispatchedQuantities = new Map<string, number>();
    
    leads.forEach(lead => {
        const createKey = (order: Order) => `${order.productType}-${order.color}-${order.size}`;

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

    return inventoryItems.map(item => {
        const key = `${item.productType}-${item.color}-${item.size}`;
        const onProcess = onProcessQuantities.get(key) || 0;
        const dispatched = dispatchedQuantities.get(key) || 0;
        const soldQty = soldQuantities.get(key) || 0;
        const onHand = item.stock;

        const sellThroughRate = (onHand + soldQty) > 0 ? (soldQty / (onHand + soldQty)) * 100 : 0;
        
        const remaining = (onHand + onProcess + dispatched) - soldQty;
        const sku = generateSku(item);

        return {
            ...item,
            sku,
            soldQty,
            onProcess,
            dispatched,
            remaining: remaining,
            sellThroughRate,
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
      const matchesSearch = searchTerm ? 
        (item.productType.toLowerCase().includes(lowercasedSearchTerm) ||
         item.sku.toLowerCase().includes(lowercasedSearchTerm)) 
        : true;
      
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
                  <Card
                      onClick={() => setStatusFilter('All Statuses')}
                      className={cn(
                          "bg-blue-500 text-white cursor-pointer transition-transform hover:scale-105",
                          statusFilter === 'All Statuses' && "ring-2 ring-offset-2 ring-blue-300"
                      )}
                  >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
                          <Boxes className="h-4 w-4" />
                      </CardHeader>
                      <CardContent><div className="text-2xl font-bold">{summaryData.total}</div></CardContent>
                  </Card>
                  <Card
                      onClick={() => setStatusFilter('Low Stock')}
                      className={cn(
                          "bg-yellow-500 text-white cursor-pointer transition-transform hover:scale-105",
                          statusFilter === 'Low Stock' && "ring-2 ring-offset-2 ring-yellow-300"
                      )}
                  >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                          <Shirt className="h-4 w-4" />
                      </CardHeader>
                      <CardContent><div className="text-2xl font-bold">{summaryData.low}</div></CardContent>
                  </Card>
                  <Card
                      onClick={() => setStatusFilter('Out of Stock')}
                      className={cn(
                          "bg-red-500 text-white cursor-pointer transition-transform hover:scale-105",
                          statusFilter === 'Out of Stock' && "ring-2 ring-offset-2 ring-red-300"
                      )}
                  >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                          <PackageX className="h-4 w-4" />
                      </CardHeader>
                      <CardContent><div className="text-2xl font-bold">{summaryData.outOfStock}</div></CardContent>
                  </Card>
                  <Card
                      onClick={() => setStatusFilter('Negative Stock')}
                      className={cn(
                          "bg-red-600 text-white cursor-pointer transition-transform hover:scale-105",
                          statusFilter === 'Negative Stock' && "ring-2 ring-offset-2 ring-red-400"
                      )}
                  >
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
                  placeholder="Search SKU or Item..."
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
              {isAdmin && (
                <div className="flex items-center gap-2 ml-auto">
                {isEditMode ? (
                    <>
                    <Button onClick={handleSave} className="h-9">
                        <Save className="mr-2 h-4 w-4" /> Save
                    </Button>
                    <Button onClick={handleCancelEdit} variant="outline" className="h-9">
                        <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    </>
                ) : (
                    <Button onClick={() => setIsEditMode(true)} className="h-9">
                    <Edit className="mr-2 h-4 w-4" /> Edit Stocks
                    </Button>
                )}
                </div>
              )}
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
                      <TableHead className="text-white font-bold align-middle">SKU</TableHead>
                      <TableHead className="text-white font-bold align-middle">Item</TableHead>
                      <TableHead className="text-white font-bold align-middle">Color</TableHead>
                      <TableHead className="text-white font-bold align-middle">Size</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">On-Hand</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">Sold QTY</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">Sell-Through Rate</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">On-Process</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">Dispatched</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">Remaining Stocks</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                    <TableBody>
                    {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium text-xs align-middle py-2 text-black">{item.sku}</TableCell>
                            <TableCell className="font-medium text-xs align-middle py-2 text-black">{item.productType}</TableCell>
                            <TableCell className="text-xs align-middle py-2 text-black">
                                {isEditMode ? (
                                    <Select
                                        value={editedColors[item.id] ?? item.color}
                                        onValueChange={(value) => handleColorChange(item.id, value)}
                                    >
                                        <SelectTrigger className="w-[150px] h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(item.productType.includes('Polo Shirt') ? poloShirtColors : jacketColors).map(c => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    item.color
                                )}
                            </TableCell>
                            <TableCell className="text-xs align-middle py-2 text-black">{item.size}</TableCell>
                            <TableCell className="text-center font-medium text-xs align-middle py-2 text-black">
                                {isEditMode ? (
                                    <Input 
                                        type="number"
                                        value={editedStocks[item.id] ?? item.stock}
                                        onChange={(e) => handleStockChange(item.id, e.target.value)}
                                        className="w-20 h-8 text-center mx-auto"
                                    />
                                ) : (
                                    item.stock
                                )}
                            </TableCell>
                            <TableCell className="text-center font-medium text-xs align-middle py-2 text-black">{item.soldQty}</TableCell>
                            <TableCell className={cn(
                                "text-center font-bold text-xs align-middle py-2",
                                item.sellThroughRate >= 70 ? "text-green-600" :
                                item.sellThroughRate >= 40 ? "text-yellow-600" :
                                "text-red-600"
                            )}>
                                {item.sellThroughRate.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-center font-medium text-xs align-middle py-2 text-black">{item.onProcess}</TableCell>
                            <TableCell className="text-center font-medium text-xs align-middle py-2 text-black">{item.dispatched}</TableCell>
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
