'use client';

import { Header } from '@/components/header';
import { AddItemForm } from '@/components/add-item-form';
import { StagedItemsList } from '@/components/staged-items-list';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export type StagedItem = {
  id: string; // A temporary client-side ID
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

const productSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

export default function AddItemsPage() {
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);

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

  const handleSeedData = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Firestore not available',
        description: 'Please try again later.',
      });
      return;
    }
    setIsSeeding(true);
    toast({
      title: 'Seeding database...',
      description: 'This may take a moment. Please do not navigate away.',
    });

    try {
      const batch = writeBatch(firestore);
      let count = 0;

      for (const productType of productTypes) {
        for (const color of productColors) {
          for (const size of productSizes) {
            const stock = 10;
            const itemId = `${productType}-${color}-${size}`.toLowerCase().replace(/\s+/g, '-');
            const itemDocRef = doc(firestore, 'inventory', itemId);
            batch.set(itemDocRef, {
              id: itemId,
              productType,
              color,
              size,
              stock,
            }, { merge: true });
            count++;
            // Firestore batches can handle up to 500 operations.
            // Commit and start a new batch if we're near the limit.
            if (count % 499 === 0) {
              await batch.commit();
            }
          }
        }
      }
      // Commit any remaining operations in the last batch.
      if (count % 499 !== 0) {
        await batch.commit();
      }
      
      toast({
        title: 'Database Seeded!',
        description: `Successfully added/updated ${count} inventory items with a stock of 10.`,
      });
    } catch (e: any) {
      console.error('Error seeding database: ', e);
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: e.message || 'Could not seed the database.',
      });
    } finally {
      setIsSeeding(false);
    }
  };


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="flex justify-end mb-4">
            <Button onClick={handleSeedData} disabled={isSeeding}>
              {isSeeding ? 'Seeding...' : 'Seed Data'}
            </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full items-start">
          <div className="lg:col-span-1">
            <AddItemForm onAddItem={handleAddItem} />
          </div>
          <div className="lg:col-span-1">
            <StagedItemsList
              items={stagedItems}
              onUpdateItem={handleUpdateItem}
              onRemoveItem={handleRemoveItem}
              onSaveAll={onSaveAll}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
