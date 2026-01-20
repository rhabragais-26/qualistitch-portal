'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { initialPricingConfig } from '@/lib/pricing-data';
import type { PricingConfig, ProductGroup, AddOnType } from '@/lib/pricing';
import { Save, PlusCircle, Trash2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { isEqual } from 'lodash';

// Define types locally as they might not be exported from pricing.ts
type Tier = { min: number; max: number; price: number };
type EmbroideryPricing = { tiers: Tier[] };

export function ProductManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const pricingConfigRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'pricing', 'default') : null),
    [firestore]
  );

  const { data: fetchedConfig, isLoading, refetch } = useDoc<PricingConfig>(pricingConfigRef);

  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [selectedProductGroup, setSelectedProductGroup] = useState<ProductGroup>('GroupA');
  const [newProduct, setNewProduct] = useState({ name: '', group: 'GroupA' as ProductGroup });

  useEffect(() => {
    if (fetchedConfig) {
      setConfig(fetchedConfig);
    } else if (!isLoading) {
      // If no config exists in Firestore, use the initial one from code
      setConfig(initialPricingConfig as PricingConfig);
    }
  }, [fetchedConfig, isLoading]);

  const isDirty = useMemo(() => {
    if (!config || !fetchedConfig) return false;
    return !isEqual(config, fetchedConfig);
  }, [config, fetchedConfig]);

  const handleTierChange = (
    group: ProductGroup,
    embroidery: 'logo' | 'logoAndText',
    tierIndex: number,
    field: 'min' | 'max' | 'price',
    value: string
  ) => {
    if (!config) return;
    const newConfig = { ...config };
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      (newConfig.pricingTiers[group][embroidery].tiers[tierIndex] as any)[field] = numValue;
      setConfig(newConfig);
    }
  };

  const handleAddOnTierChange = (
    addOn: AddOnType,
    tierIndex: number,
    field: 'min' | 'max' | 'price',
    value: string
  ) => {
    if (!config) return;
    const newConfig = { ...config };
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
        if (newConfig.addOnPricing[addOn] && newConfig.addOnPricing[addOn].tiers[tierIndex]) {
            (newConfig.addOnPricing[addOn].tiers[tierIndex] as any)[field] = numValue;
            setConfig(newConfig);
        }
    }
  };
  
  const handleAddNewProduct = () => {
    if (!config || !newProduct.name) {
      toast({ variant: 'destructive', title: 'Error', description: 'Product name cannot be empty.' });
      return;
    }
    const newConfig = { ...config };
    newConfig.productGroupMapping[newProduct.name] = newProduct.group;
    setConfig(newConfig);
    setNewProduct({ name: '', group: 'GroupA' });
    toast({ title: 'Product Staged', description: `"${newProduct.name}" is ready to be saved.`});
  };

  const handleRemoveProduct = (productName: string) => {
      if (!config) return;
      const newConfig = { ...config };
      delete newConfig.productGroupMapping[productName];
      setConfig(newConfig);
  };

  const handleSaveChanges = async () => {
    if (!config || !pricingConfigRef) return;
    try {
      await setDoc(pricingConfigRef, config, { merge: true });
      toast({
        title: 'Success!',
        description: 'Pricing configuration has been updated.',
      });
      refetch(); // Refetch data to reset dirty state
    } catch (error: any) {
      console.error('Error saving pricing config:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message || 'Could not save pricing configuration.',
      });
    }
  };
  
  const productGroups = useMemo(() => config ? Object.keys(config.pricingTiers) as ProductGroup[] : [], [config]);
  const addOnTypes = useMemo(() => config ? Object.keys(config.addOnPricing) as AddOnType[] : [], [config]);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }
  
  if (!config) {
      return <div>Loading pricing configuration...</div>
  }

  return (
    <Card className="w-full shadow-xl mt-8">
      <CardHeader>
        <CardTitle>Product & Pricing Management</CardTitle>
        <CardDescription>
          Edit product prices, add-ons, and manage product groups.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Product Tiers */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Product Price Tiers</h3>
            <Select value={selectedProductGroup} onValueChange={(v) => setSelectedProductGroup(v as ProductGroup)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Product Group" />
                </SelectTrigger>
                <SelectContent>
                    {productGroups.map(group => <SelectItem key={group} value={group}>{group}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {['logo', 'logoAndText'].map((embroideryType) => (
                    <div key={embroideryType}>
                        <h4 className="font-medium mb-2">{embroideryType === 'logo' ? 'Logo Only / Name Only' : 'Logo + Back Text'}</h4>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Min</TableHead>
                                    <TableHead>Max</TableHead>
                                    <TableHead>Price</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {config.pricingTiers[selectedProductGroup][embroideryType as 'logo' | 'logoAndText'].tiers.map((tier, index) => (
                                    <TableRow key={index}>
                                        <TableCell><Input type="number" value={tier.min} onChange={e => handleTierChange(selectedProductGroup, embroideryType as 'logo' | 'logoAndText', index, 'min', e.target.value)} className="w-24"/></TableCell>
                                        <TableCell><Input type="number" value={tier.max === Infinity ? '' : tier.max} placeholder="Infinity" onChange={e => handleTierChange(selectedProductGroup, embroideryType as 'logo' | 'logoAndText', index, 'max', e.target.value)} className="w-24"/></TableCell>
                                        <TableCell><Input type="number" value={tier.price} onChange={e => handleTierChange(selectedProductGroup, embroideryType as 'logo' | 'logoAndText', index, 'price', e.target.value)} className="w-24"/></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ))}
           </div>
        </section>

        {/* Add-ons */}
        <section>
          <h3 className="text-lg font-semibold mb-4">Add-on Pricing</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {addOnTypes.map(addOn => (
                 <div key={addOn}>
                    <h4 className="font-medium mb-2 capitalize">{addOn.replace(/([A-Z])/g, ' $1')}</h4>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Min Qty</TableHead>
                                <TableHead>Max Qty</TableHead>
                                <TableHead>Price</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {config.addOnPricing[addOn]?.tiers.map((tier, index) => (
                                <TableRow key={index}>
                                    <TableCell><Input type="number" value={tier.min} onChange={e => handleAddOnTierChange(addOn, index, 'min', e.target.value)} className="w-24"/></TableCell>
                                    <TableCell><Input type="number" value={tier.max === Infinity ? '' : tier.max} placeholder="Infinity" onChange={e => handleAddOnTierChange(addOn, index, 'max', e.target.value)} className="w-24"/></TableCell>
                                    <TableCell><Input type="number" value={tier.price} onChange={e => handleAddOnTierChange(addOn, index, 'price', e.target.value)} className="w-24"/></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </div>
            ))}
           </div>
        </section>

        {/* Product Group Mapping */}
        <section>
          <h3 className="text-lg font-semibold mb-4">Product Groups</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto border p-4 rounded-md">
            {Object.entries(config.productGroupMapping).map(([name, group]) => (
                <div key={name} className="flex items-center justify-between">
                    <span>{name}</span>
                    <div className="flex items-center gap-2">
                        <Select value={group} onValueChange={(newGroup) => setConfig(c => ({...c!, productGroupMapping: {...c!.productGroupMapping, [name]: newGroup as ProductGroup}}))}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {productGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveProduct(name)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ))}
          </div>
           <div className="mt-4 flex items-end gap-2 border-t pt-4">
              <div className="flex-1">
                 <label className="text-sm font-medium">New Product Name</label>
                 <Input value={newProduct.name} onChange={e => setNewProduct(p => ({...p, name: e.target.value}))} placeholder="e.g., New Jacket Model"/>
              </div>
              <div>
                  <label className="text-sm font-medium">Group</label>
                 <Select value={newProduct.group} onValueChange={v => setNewProduct(p => ({...p, group: v as ProductGroup}))}>
                     <SelectTrigger className="w-[150px]">
                         <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        {productGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                     </SelectContent>
                 </Select>
              </div>
              <Button onClick={handleAddNewProduct}><PlusCircle className="mr-2"/> Add Product</Button>
           </div>
        </section>

        <div className="flex justify-end pt-4">
            <Button onClick={handleSaveChanges} disabled={!isDirty}>
                <Save className="mr-2" /> Save All Changes
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
