
'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import React, { useMemo } from 'react';
import { generateSku, formatCurrency } from '@/lib/utils';
import Barcode from 'react-barcode';
import { getUnitPrice, type PricingConfig } from '@/lib/pricing';
import { initialPricingConfig } from '@/lib/pricing-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type InventoryItem = {
  id: string;
  productType: string;
  color: string;
  size: string;
  stock: number;
};

export function SkuBarcodeList() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return query(
      collection(firestore, 'inventory'),
      orderBy('productType', 'asc'),
      orderBy('color', 'asc')
    );
  }, [firestore, user, isUserLoading]);

  const { data: inventoryItems, isLoading: isInventoryLoading, error: inventoryError } = useCollection<InventoryItem>(inventoryQuery);

  const pricingConfigRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'pricing', 'default') : null),
    [firestore]
  );
  const { data: fetchedConfig, isLoading: isPricingLoading } = useDoc<PricingConfig>(pricingConfigRef);

  const pricingConfig = useMemo(() => {
    if (fetchedConfig) return fetchedConfig;
    return initialPricingConfig as PricingConfig;
  }, [fetchedConfig]);

  const groupedSkus = useMemo(() => {
    if (!inventoryItems || !pricingConfig) return {};

    return inventoryItems.reduce((acc, item) => {
      const sku = generateSku(item);
      const unitPrice = getUnitPrice(item.productType, 1, 'logo', pricingConfig);
      if (!acc[item.productType]) {
        acc[item.productType] = [];
      }
      acc[item.productType].push({ ...item, sku, unitPrice });
      return acc;
    }, {} as Record<string, (InventoryItem & { sku: string; unitPrice: number })[]>);
  }, [inventoryItems, pricingConfig]);

  const isLoading = isInventoryLoading || isPricingLoading;
  const error = inventoryError;

  if (isLoading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
        </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading inventory: {error.message}</p>;
  }
  
  const productTypes = Object.keys(groupedSkus);

  if (productTypes.length === 0) {
    return <p className="text-muted-foreground">No inventory items found to generate SKUs and barcodes.</p>
  }

  return (
    <Tabs defaultValue={productTypes[0]} className="w-full">
      <TabsList className="flex flex-wrap h-auto justify-evenly w-full">
        {productTypes.map(productType => (
            <TabsTrigger key={productType} value={productType}>{productType}</TabsTrigger>
        ))}
      </TabsList>
      {Object.entries(groupedSkus).map(([productType, items]) => (
        <TabsContent key={productType} value={productType} className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(item => (
                <Card key={item.id} className="flex flex-col items-center p-4">
                    <CardContent className="flex flex-col items-center text-center p-0">
                    <div className="font-bold">{item.productType}</div>
                    <div className="text-sm text-muted-foreground">{item.color} - {item.size}</div>
                    <div className="text-lg font-bold mt-1">{formatCurrency(item.unitPrice)}</div>
                    <div className="mt-2">
                        <Barcode value={item.sku} width={1.5} height={50} fontSize={12} />
                    </div>
                    </CardContent>
                </Card>
                ))}
            </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
