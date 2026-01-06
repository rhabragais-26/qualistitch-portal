'use client';

import { Header } from '@/components/header';
import { AddItemForm } from '@/components/add-item-form';
import { StagedItemsList } from '@/components/staged-items-list';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

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
    if (!firestore || stagedItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No items to save',
        description: 'Please add at least one item to the list before saving.',
      });
      return;
    }

    const inventoryRef = collection(firestore, 'inventory');
    let successCount = 0;

    const savePromises = stagedItems.map(item => {
      const { id: tempId, ...itemData } = item;
      const itemId = `${itemData.productType}-${itemData.color}-${itemData.size}`.toLowerCase().replace(/\s+/g, '-');
      const itemDocRef = doc(inventoryRef, itemId);

      const submissionData = {
        id: itemId,
        ...itemData,
      };

      return setDoc(itemDocRef, submissionData, { merge: true }).then(() => {
        successCount++;
      });
    });

    try {
      await Promise.all(savePromises);
      toast({
        title: 'Success!',
        description: `${successCount} items have been saved to the inventory.`,
      });
      setStagedItems([]);
    } catch (e: any) {
      console.error('Error saving items to inventory: ', e);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: e.message || 'Could not save all items to the inventory.',
      });
    }
  };


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full items-start">
          <div>
            <AddItemForm onAddItem={handleAddItem} />
          </div>
          <div className="flex flex-col gap-4">
            <StagedItemsList
              items={stagedItems}
              onUpdateItem={handleUpdateItem}
              onRemoveItem={handleRemoveItem}
            />
            <div className="flex justify-end">
               <Button onClick={handleSaveAll} disabled={stagedItems.length === 0} className="font-bold text-white">
                 <Save className="mr-2 h-4 w-4" />
                 Save All Items
               </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
