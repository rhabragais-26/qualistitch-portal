
'use client';

import { Header } from '@/components/header';
import { AddItemForm } from '@/components/add-item-form';
import { StagedItemsList } from '@/components/staged-items-list';
import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, runTransaction, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { usePathname } from 'next/navigation';
import { hasEditPermission } from '@/lib/permissions';
import { v4 as uuidv4 } from 'uuid';

export type StagedItem = {
  id: string; // A temporary client-side ID
  productType: string;
  color: string;
  size: string;
  stock: number;
};

export default function AddItemsPage() {
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userProfile } = useUser();
  const pathname = usePathname();
  const canEdit = hasEditPermission(userProfile?.position as any, pathname);


  const handleAddItem = (item: Omit<StagedItem, 'id'>) => {
    setStagedItems((prevItems) => [
      ...prevItems,
      { ...item, id: new Date().toISOString() + Math.random() }, // simple unique id
    ]);
  };

  const handleUpdateItem = (updatedItem: StagedItem) => {
    setStagedItems((prevItems) =>
      prevItems.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setStagedItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };
  
  const handleSaveAll = async () => {
    if (!firestore || !userProfile || stagedItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No items to save',
        description: 'Please add at least one item to the list before saving.',
      });
      return;
    }

    const replenishmentBatch = writeBatch(firestore);
    const now = new Date().toISOString();

    stagedItems.forEach(item => {
        const replenishmentId = uuidv4();
        const replenishmentRef = doc(firestore, 'inventory_replenishments', replenishmentId);
        replenishmentBatch.set(replenishmentRef, {
            id: replenishmentId,
            date: now,
            productType: item.productType,
            color: item.color,
            size: item.size,
            quantity: item.stock,
            submittedBy: userProfile.nickname,
            timestamp: now,
        });
    });
    
    // Group items by their unique Firestore document ID
    const itemsByDocId = stagedItems.reduce((acc, item) => {
      const itemId = `${item.productType}-${item.color}-${item.size}`.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-');
      if (!acc[itemId]) {
        acc[itemId] = { ...item, stock: 0 };
      }
      acc[itemId].stock += item.stock;
      return acc;
    }, {} as Record<string, StagedItem>);

    const inventoryRef = collection(firestore, 'inventory');
    let successCount = 0;

    const transactionPromises = Object.entries(itemsByDocId).map(async ([itemId, itemData]) => {
      const itemDocRef = doc(inventoryRef, itemId);
      
      try {
        await runTransaction(firestore, async (transaction) => {
          const itemDoc = await transaction.get(itemDocRef);
          
          if (!itemDoc.exists()) {
            transaction.set(itemDocRef, {
              id: itemId,
              productType: itemData.productType,
              color: itemData.color,
              size: itemData.size,
              stock: itemData.stock,
            });
          } else {
            const currentStock = itemDoc.data().stock || 0;
            const newStock = currentStock + itemData.stock;
            transaction.update(itemDocRef, { stock: newStock });
          }
        });
        successCount += 1;
      } catch (e) {
        console.error(`Transaction failed for ${itemId}: `, e);
        throw e;
      }
    });

    try {
      await replenishmentBatch.commit();
      await Promise.all(transactionPromises);
      toast({
        title: 'Success!',
        description: `${stagedItems.length} item(s) across ${successCount} unique product variant(s) have been saved. Replenishment has been recorded.`,
      });
      setStagedItems([]);
    } catch (e: any) {
      console.error('Error saving items to inventory: ', e);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: e.message || 'One or more items could not be saved to the inventory.',
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full items-start">
          <div className="lg:col-span-1 flex justify-end">
            <AddItemForm onAddItem={handleAddItem} isReadOnly={!canEdit} />
          </div>
          <div className="lg:col-span-1 flex justify-start">
            <StagedItemsList
              items={stagedItems}
              onUpdateItem={handleUpdateItem}
              onRemoveItem={handleRemoveItem}
              onSaveAll={handleSaveAll}
              isReadOnly={!canEdit}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
