
'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import React, { useMemo, useState, useEffect } from 'react';
import { generateSku, formatCurrency } from '@/lib/utils';
import Barcode from 'react-barcode';
import { getUnitPrice, type PricingConfig } from '@/lib/pricing';
import { initialPricingConfig } from '@/lib/pricing-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type InventoryItem = {
  id: string;
  productType: string;
  color: string;
  size: string;
  stock: number;
};

const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

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
  
  const productTypes = Object.keys(groupedSkus);
  
  const [activeTab, setActiveTab] = useState(productTypes.length > 0 ? productTypes[0] : '');
  const [colorFilter, setColorFilter] = useState('All');
  const [sizeFilter, setSizeFilter] = useState('All');

  useEffect(() => {
    if (productTypes.length > 0 && !activeTab) {
      setActiveTab(productTypes[0]);
    }
  }, [productTypes, activeTab]);

  useEffect(() => {
    setColorFilter('All');
    setSizeFilter('All');
  }, [activeTab]);

  const availableColors = useMemo(() => {
    if (!inventoryItems || !activeTab) return ['All'];
    const colors = [...new Set(inventoryItems
        .filter(item => item.productType === activeTab)
        .map(item => item.color))].sort();
    return ['All', ...colors];
  }, [inventoryItems, activeTab]);

  const availableSizes = useMemo(() => {
      if (!inventoryItems || !activeTab) return ['All'];
      const sizes = [...new Set(inventoryItems
          .filter(item => item.productType === activeTab)
          .map(item => item.size))].sort((a, b) => {
              const indexA = sizeOrder.indexOf(a);
              const indexB = sizeOrder.indexOf(b);
              if (indexA !== -1 && indexB !== -1) return indexA - indexB;
              if (indexA !== -1) return -1;
              if (indexB !== -1) return 1;
              return a.localeCompare(b);
          });
      return ['All', ...sizes];
  }, [inventoryItems, activeTab]);


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
  
  if (productTypes.length === 0) {
    return <p className="text-muted-foreground">No inventory items found to generate SKUs and barcodes.</p>
  }

  return (
    <Tabs defaultValue={productTypes[0]} value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex justify-start items-center mb-4 gap-4">
        <TabsList className="flex flex-wrap h-auto justify-start">
          {productTypes.map(productType => (
              <TabsTrigger key={productType} value={productType}>{productType}</TabsTrigger>
          ))}
        </TabsList>
        <div className="flex items-center gap-2">
            <Select value={colorFilter} onValueChange={setColorFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Color" />
              </SelectTrigger>
              <SelectContent>
                {availableColors.map(color => (
                  <SelectItem key={color} value={color}>{color === 'All' ? 'All Colors' : color}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Size" />
              </SelectTrigger>
              <SelectContent>
                {availableSizes.map(size => (
                  <SelectItem key={size} value={size}>{size === 'All' ? 'All Sizes' : size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
      </div>

      {Object.entries(groupedSkus).map(([productType, items]) => {
        const filteredItems = items.filter(item => 
          (colorFilter === 'All' || item.color === colorFilter) &&
          (sizeFilter === 'All' || item.size === sizeFilter)
        );

        return (
          <TabsContent key={productType} value={productType} className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredItems.length > 0 ? filteredItems.map(item => (
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
                  )) : (
                    <div className="col-span-full text-center text-muted-foreground py-10">
                      No items match the selected filters.
                    </div>
                  )}
              </div>
          </TabsContent>
        )
      })}
    </Tabs>
  );
}
