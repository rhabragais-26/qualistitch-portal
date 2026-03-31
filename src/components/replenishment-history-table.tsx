
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, writeBatch, doc } from 'firebase/firestore';
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});

  const consolidatedReplenishments = useMemo(() => {
    if (!replenishments) return [];

    let itemsToProcess = replenishments;

    if (date) {
        const formattedDate = format(date, 'yyyy-MM-dd');
        itemsToProcess = replenishments.filter(item => {
            try {
                return format(new Date(item.date), 'yyyy-MM-dd') === formattedDate;
            } catch (e) {
                return false;
            }
        });
    }

    const grouped = itemsToProcess.reduce((acc, item) => {
        const itemDate = format(new Date(item.date), 'yyyy-MM-dd');
        const key = `${itemDate}-${item.productType}-${item.color}-${item.size}`;

        if (!acc[key]) {
            acc[key] = {
                ...item,
                date: itemDate,
                quantity: 0,
                items: [],
                submittedBySet: new Set()
            };
        }
        acc[key].quantity += item.quantity;
        acc[key].items.push(item);
        acc[key].submittedBySet.add(item.submittedBy);
        return acc;
    }, {} as Record<string, InventoryReplenishment & { items: InventoryReplenishment[], submittedBySet: Set<string> }>);

    return Object.values(grouped).map(group => {
        const sortedItems = group.items.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return {
            ...group,
            id: group.items.map(i => i.id).join(','),
            submittedBy: Array.from(group.submittedBySet).join(', '),
            timestamp: sortedItems[0]?.timestamp || group.timestamp,
            items: sortedItems,
        };
    }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [replenishments, date]);

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
      toast({ title: 'No Changes', description: 'You did not change any quantities.' });
      return;
    }

    const batch = writeBatch(firestore);
    let updatedCount = 0;

    for (const [compositeId, newTotalQuantity] of updates) {
      const consolidatedItem = consolidatedReplenishments.find(item => item.id === compositeId);
      if (!consolidatedItem) continue;

      const originalTotalQuantity = consolidatedItem.items.reduce((sum, i) => sum + i.quantity, 0);
      if (newTotalQuantity === originalTotalQuantity) continue;

      const delta = newTotalQuantity - originalTotalQuantity;
      const latestItem = consolidatedItem.items[0];

      if (latestItem) {
        const docRef = doc(firestore, 'inventory_replenishments', latestItem.id);
        const newQuantityForItem = latestItem.quantity + delta;

        if (newQuantityForItem < 0) {
          toast({ variant: 'destructive', title: 'Invalid Quantity', description: `Cannot reduce quantity for ${latestItem.productType} below zero.` });
          continue;
        }

        batch.update(docRef, { quantity: newQuantityForItem });
        updatedCount++;
      }
    }

    if (updatedCount === 0) {
        setIsEditMode(false);
        setEditedQuantities({});
        toast({ title: 'No Effective Changes', description: 'The changes resulted in no updates.' });
        return;
    }

    try {
      await batch.commit();
      toast({ title: 'Success!', description: `${updatedCount} replenishment record(s) updated.` });
      refetch();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
      setIsEditMode(false);
      setEditedQuantities({});
    }
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
            <Input
              id="date"
              type="date"
              value={date ? format(date, 'yyyy-MM-dd') : ''}
              onChange={(e) => setDate(e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined)}
              className="w-[180px]"
            />
            {isEditMode ? (
              <>
                <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Save</Button>
                <Button variant="outline" onClick={handleCancel}><X className="mr-2 h-4 w-4" /> Cancel</Button>
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
                      No replenishments found for the selected period.
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
