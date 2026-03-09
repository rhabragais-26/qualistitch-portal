'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import React, { useMemo } from 'react';
import { generateSku } from '@/lib/utils';
import Barcode from 'react-barcode';

type InventoryItem = {
  id: string;
  productType: string;
  color: string;
  size: string;
  stock: number;
};

export function SkuBarcodeList() {
  const firestore = useFirestore();

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'inventory'), orderBy('productType', 'asc'), orderBy('color', 'asc'));
  }, [firestore]);

  const { data: inventoryItems, isLoading, error } = useCollection<InventoryItem>(inventoryQuery);

  const groupedSkus = useMemo(() => {
    if (!inventoryItems) return {};

    return inventoryItems.reduce((acc, item) => {
      const sku = generateSku(item);
      if (!acc[item.productType]) {
        acc[item.productType] = [];
      }
      acc[item.productType].push({ ...item, sku });
      return acc;
    }, {} as Record<string, (InventoryItem & { sku: string })[]>);
  }, [inventoryItems]);

  if (isLoading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
        </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading inventory: {error.message}</p>;
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedSkus).map(([productType, items]) => (
        <div key={productType}>
          <h2 className="text-2xl font-bold mb-4">{productType}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map(item => (
              <Card key={item.id} className="flex flex-col items-center p-4">
                <CardContent className="flex flex-col items-center text-center p-0">
                  <div className="font-bold">{item.sku}</div>
                  <div className="text-sm text-muted-foreground">{item.color} - {item.size}</div>
                  <div className="mt-2">
                    <Barcode value={item.sku} width={1.5} height={50} fontSize={12} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
