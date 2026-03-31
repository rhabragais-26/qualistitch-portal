
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, runTransaction } from 'firebase/firestore';
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
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Edit, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type InventoryReplenishment = {
  id: string;
  date: string;
  productType: string;
  color: string;
  size: string;
  quantity: number;
  submittedBy: string;
  timestamp: string;
};

export function ReplenishmentHistoryTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const replenishmentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'inventory_replenishments'), orderBy('timestamp', 'desc')) : null, [firestore]);
  const { data: replenishments, isLoading, error, refetch } = useCollection<InventoryReplenishment>(replenishmentsQuery, undefined, { listen: false });

  const [date, setDate] = useState<Date | undefined>();
  const [productTypeFilter, setProductTypeFilter] = useState('All Product Types');
  const [colorFilter, setColorFilter] = useState('All');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});

  const productTypes = useMemo(() => {
    if (!replenishments) return [];
    const uniqueTypes = [...new Set(replenishments.map(item => item.productType))];
    return ['All Product Types', ...uniqueTypes.sort()];
  }, [replenishments]);

  const availableColors = useMemo(() => {
    if (!replenishments) return ['All'];
    let itemsToConsider = replenishments;
    if (productTypeFilter !== 'All Product Types') {
      itemsToConsider = replenishments.filter(item => item.productType === productTypeFilter);
    }
    const uniqueColors = [...new Set(itemsToConsider.map(item => item.color))].sort();
    return ['All', ...uniqueColors];
  }, [replenishments, productTypeFilter]);

  useEffect(() => {
    if (productTypeFilter === 'All Product Types') {
      setColorFilter('All');
    }
  }, [productTypeFilter]);

  const consolidatedReplenishments = useMemo(() => {
    if (!replenishments) return [];

    let itemsToProcess = replenishments;
    
    if (productTypeFilter !== 'All Product Types') {
        itemsToProcess = itemsToProcess.filter(item => item.productType === productTypeFilter);
    }
    
    if (colorFilter !== 'All') {
        itemsToProcess = itemsToProcess.filter(item => item.color === colorFilter);
    }

    if (date) {
        const formattedDate = format(date, 'yyyy-MM-dd');
        itemsToProcess = itemsToProcess.filter(item => {
            try {
                return format(new Date(item.date), 'yyyy-MM-dd') === formattedDate;
            } catch (e) {
                return false;
            }
        });
    }

    const grouped = itemsToProcess.reduce((acc, item) => {
        try {
            const itemDate = format(new Date(item.date), 'yyyy-MM-dd');
            const key = `${itemDate}-${item.productType}-${item.color}-${item.size}`;

            if (!acc[key]) {
                acc[key] = {
                    ...item,
                    date: itemDate,
                    quantity: 0,
                    items: [], // this will hold the original items
                    submittedBySet: new Set()
                };
            }
            acc[key].quantity += item.quantity;
            acc[key].items.push(item);
            acc[key].submittedBySet.add(item.submittedBy);
        } catch (e) {
            console.warn("Skipping replenishment item with invalid date:", item);
        }
        return acc;
    }, {} as Record<string, InventoryReplenishment & { items: InventoryReplenishment[], submittedBySet: Set<string> }>);

    return Object.values(grouped).map(group => {
        const sortedItems = group.items.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return {
            ...group,
            id: group.items.map(i => i.id).join(','), // Composite ID
            submittedBy: Array.from(group.submittedBySet).join(', '),
            timestamp: sortedItems[0]?.timestamp || group.timestamp,
            items: sortedItems,
        };
    }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [replenishments, date, productTypeFilter, colorFilter]);

  const handleQuantityChange = (compositeId: string, value: string) => {
    const newQuantity = parseInt(value, 10);
    if (!isNaN(newQuantity)) {
      setEditedQuantities(prev => ({
        ...prev,
        [compositeId]: newQuantity,
      }));
    }
  };

  const handleSave = async () => {
    if (!firestore) return;

    const updates = Object.entries(editedQuantities);
    if (updates.length === 0) {
      setIsEditMode(false);
      setEditedQuantities({});
      toast({ title: 'No Changes', description: 'You did not change any quantities.' });
      return;
    }
    setIsSaving(true);

    let successCount = 0;
    let errorCount = 0;

    for (const [compositeId, newTotalQuantity] of updates) {
      const consolidatedItem = consolidatedReplenishments.find(item => item.id === compositeId);
      if (!consolidatedItem) {
        errorCount++;
        continue;
      }

      const originalTotalQuantity = consolidatedItem.items.reduce((sum, i) => sum + i.quantity, 0);
      const delta = newTotalQuantity - originalTotalQuantity;
      
      if (delta === 0) continue;

      const inventoryItemId = `${consolidatedItem.productType}-${consolidatedItem.color}-${consolidatedItem.size}`
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/\//g, '-');
      
      const inventoryDocRef = doc(firestore, 'inventory', inventoryItemId);
      const latestReplenishmentItem = consolidatedItem.items[0];

      if (!latestReplenishmentItem) {
        errorCount++;
        continue;
      }
      const replenishmentDocRef = doc(firestore, 'inventory_replenishments', latestReplenishmentItem.id);

      try {
        await runTransaction(firestore, async (transaction) => {
          const inventoryDoc = await transaction.get(inventoryDocRef);
          
          if (inventoryDoc.exists()) {
            const currentStock = inventoryDoc.data().stock || 0;
            transaction.update(inventoryDocRef, { stock: currentStock + delta });
          } else {
             transaction.set(inventoryDocRef, {
              id: inventoryItemId,
              productType: consolidatedItem.productType,
              color: consolidatedItem.color,
              size: consolidatedItem.size,
              stock: delta
            });
          }

          const newReplenishmentQuantity = latestReplenishmentItem.quantity + delta;
          if (newReplenishmentQuantity < 0) {
            throw new Error(`Cannot reduce quantity for ${latestReplenishmentItem.productType} below zero.`);
          }
          transaction.update(replenishmentDocRef, { quantity: newReplenishmentQuantity });
        });
        successCount++;
      } catch (e: any) {
        errorCount++;
        console.error(`Transaction failed for item ${compositeId}:`, e);
        toast({ variant: 'destructive', title: `Update Failed for ${consolidatedItem.productType}`, description: e.message });
      }
    }
    
    if (errorCount > 0) {
      toast({ variant: "destructive", title: "Partial Failure", description: `${errorCount} item(s) could not be updated.` });
    }
    if (successCount > 0) {
      toast({ title: "Inventory Updated", description: `${successCount} item(s) have been saved successfully.` });
    }
    
    refetch();
    setEditedQuantities({});
    setIsEditMode(false);
    setIsSaving(false);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setEditedQuantities({});
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Replenishment History</CardTitle>
            <CardDescription>History of all inventory replenishments.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Product Type" />
              </SelectTrigger>
              <SelectContent>
                {productTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={colorFilter} onValueChange={setColorFilter} disabled={productTypeFilter === 'All Product Types'}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Color" />
                </SelectTrigger>
                <SelectContent>
                    {availableColors.map(color => (
                        <SelectItem key={color} value={color}>{color === 'All' ? 'All Colors' : color}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Input
              id="date"
              type="date"
              value={date ? format(date, 'yyyy-MM-dd') : ''}
              onChange={(e) => setDate(e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined)}
              className="w-[180px]"
            />
            {isEditMode ? (
              <>
                <Button onClick={handleSave} disabled={isSaving}><Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save'}</Button>
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}><X className="mr-2 h-4 w-4" /> Cancel</Button>
              </>
            ) : (
              <Button onClick={() => setIsEditMode(true)}><Edit className="mr-2 h-4 w-4" /> Edit Quantities</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product Type</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead>Submitted By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Skeleton className="h-20 w-full" />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-destructive">Error: {error.message}</TableCell>
                  </TableRow>
                ) : consolidatedReplenishments.length > 0 ? (
                  consolidatedReplenishments.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{format(new Date(item.date), 'MM-dd-yyyy')}</TableCell>
                      <TableCell>{item.productType}</TableCell>
                      <TableCell>{item.color}</TableCell>
                      <TableCell>{item.size}</TableCell>
                      <TableCell className="text-center">
                        {isEditMode ? (
                          <Input
                            type="number"
                            value={editedQuantities[item.id] ?? item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className="w-24 mx-auto h-8 text-center"
                          />
                        ) : (
                          item.quantity
                        )}
                      </TableCell>
                      <TableCell>{item.submittedBy}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No replenishments found for the selected filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
