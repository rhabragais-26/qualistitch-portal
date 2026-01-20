'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from './ui/label';

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
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [selectedProductType, setSelectedProductType] = useState<string>('');
  const [newProduct, setNewProduct] = useState({ name: '', group: '' });
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    const dataToUse = fetchedConfig || (isLoading ? null : initialPricingConfig as PricingConfig);
    if (dataToUse) {
      setConfig(dataToUse);
      const pTypes = Object.keys(dataToUse.productGroupMapping).sort();
      setProductTypes(pTypes);
      if (pTypes.length > 0 && !pTypes.includes(selectedProductType)) {
        setSelectedProductType(pTypes[0]);
      }
      if (newProduct.group === '' && Object.keys(dataToUse.pricingTiers).length > 0) {
        setNewProduct(p => ({ ...p, group: Object.keys(dataToUse.pricingTiers)[0]}));
      }
    }
  }, [fetchedConfig, isLoading, selectedProductType, newProduct.group]);

  const isDirty = useMemo(() => {
    if (!config || !fetchedConfig) return false;
    return !isEqual(config, fetchedConfig);
  }, [config, fetchedConfig]);

  const handleTierChange = (
    group: ProductGroup,
    embroidery: 'logo' | 'logoAndText' | 'name',
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
    const newConfig = { ...config, productGroupMapping: { ...config.productGroupMapping, [newProduct.name]: newProduct.group } };
    setConfig(newConfig);

    const newProductTypes = [...productTypes, newProduct.name].sort();
    setProductTypes(newProductTypes);
    setSelectedProductType(newProduct.name);

    setNewProduct({ name: '', group: newProduct.group });
    toast({ title: 'Product Staged', description: `"${newProduct.name}" is ready to be saved.`});
  };

  const handleRemoveProduct = (productName: string) => {
      if (!config) return;
      const newMapping = { ...config.productGroupMapping };
      delete newMapping[productName];
      const newConfig = { ...config, productGroupMapping: newMapping };
      setConfig(newConfig);

      const newProductTypes = productTypes.filter(p => p !== productName);
      setProductTypes(newProductTypes);
      if (selectedProductType === productName && newProductTypes.length > 0) {
        setSelectedProductType(newProductTypes[0]);
      } else if (newProductTypes.length === 0) {
        setSelectedProductType('');
      }
  };
  
  const handleAddNewCategory = () => {
    if (!config || !newCategoryName.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Category name cannot be empty.' });
        return;
    }
    if (config.pricingTiers[newCategoryName.trim()]) {
        toast({ variant: 'destructive', title: 'Error', description: 'Category name already exists.' });
        return;
    }

    const newConfig = JSON.parse(JSON.stringify(config)); // Deep copy
    const defaultTier = { tiers: [{ min: 1, max: Infinity, price: 0 }] };
    newConfig.pricingTiers[newCategoryName.trim()] = {
        logo: defaultTier,
        name: defaultTier,
        logoAndText: defaultTier,
    };
    setConfig(newConfig);
    setNewCategoryName('');
    setIsAddCategoryOpen(false);
    toast({ title: 'Category Added', description: `"${newCategoryName.trim()}" is ready to be configured and used.`});
  };

  const handleSaveChanges = async () => {
    if (!config || !pricingConfigRef) return;
    try {
      await setDoc(pricingConfigRef, config, { merge: true });
      toast({
        title: 'Success!',
        description: 'Pricing configuration has been updated.',
      });
      refetch();
    } catch (error: any) {
      console.error('Error saving pricing config:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message || 'Could not save pricing configuration.',
      });
    }
  };
  
  const productGroups = useMemo(() => config ? Object.keys(config.pricingTiers).sort() as ProductGroup[] : [], [config]);
  const addOnTypes = useMemo(() => config ? (Object.keys(config.addOnPricing) as AddOnType[]).filter(type => type !== 'rushFee' && type !== 'shippingFee') : [], [config]);
  
  const selectedProductGroup = useMemo(() => {
    if (!config || !selectedProductType) return null;
    return config.productGroupMapping[selectedProductType] as ProductGroup | undefined;
  }, [config, selectedProductType]);

  if (isLoading || !config) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card className="w-full shadow-xl mt-8">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Product &amp; Pricing Management</CardTitle>
                <CardDescription>
                Edit product prices, add-ons, and manage product categories.
                </CardDescription>
            </div>
            <div className="flex items-center gap-4">
                <Label>Select a Product:</Label>
                 <Select value={selectedProductType} onValueChange={setSelectedProductType}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select Product to Edit" />
                    </SelectTrigger>
                    <SelectContent>
                        {productTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="bg-teal-600 hover:bg-teal-700 text-white font-bold"><PlusCircle className="mr-2"/> Add / Manage Products</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl">
                        <DialogHeader>
                            <DialogTitle>Manage Products &amp; Categories</DialogTitle>
                            <DialogDescription>
                                Add new products or re-categorize existing ones.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-8 py-4">
                            <div className="space-y-4 border-r pr-8">
                                <h3 className="text-lg font-semibold">Add New Product</h3>
                                <div>
                                    <Label htmlFor="product-name">New Product Name</Label>
                                    <Input id="product-name" value={newProduct.name} onChange={e => setNewProduct(p => ({...p, name: e.target.value}))} placeholder="e.g., New Jacket Model"/>
                                </div>
                                <div>
                                    <Label htmlFor="product-category">Assign to Category</Label>
                                    <div className="flex items-center gap-2">
                                        <Select value={newProduct.group} onValueChange={v => setNewProduct(p => ({...p, group: v as ProductGroup}))}>
                                            <SelectTrigger id="product-category" className="flex-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {productGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm"><PlusCircle className="mr-2"/> New</Button>
                                            </DialogTrigger>
                                            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
                                                <DialogHeader>
                                                    <DialogTitle>Add New Category</DialogTitle>
                                                    <DialogDescription>
                                                        Create a new pricing category for your products.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="py-4">
                                                    <Label htmlFor="category-name">Category Name</Label>
                                                    <Input
                                                        id="category-name"
                                                        value={newCategoryName}
                                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                                        placeholder="e.g., Pants"
                                                    />
                                                </div>
                                                <DialogFooter>
                                                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                                    <Button onClick={handleAddNewCategory}>Add Category</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                                <Button onClick={handleAddNewProduct} className="w-full">Add Product</Button>
                            </div>

                             <section>
                                <h3 className="text-lg font-semibold">Product Categories</h3>
                                <div className="space-y-2 max-h-96 overflow-y-auto border p-4 rounded-md mt-4">
                                {Object.entries(config.productGroupMapping).map(([name, group]) => (
                                    <div key={name} className="flex items-center justify-between">
                                        <span className="whitespace-nowrap">{name}</span>
                                        <div className="flex items-center gap-2">
                                            <Select value={group} onValueChange={(newGroup) => setConfig(c => ({...c!, productGroupMapping: {...c!.productGroupMapping, [name]: newGroup as ProductGroup}}))}>
                                                <SelectTrigger className="w-[170px] h-8 text-xs flex-shrink-0">
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
                            </section>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <section>
          <h3 className="text-lg font-semibold mb-4">Product Price Tiers</h3>
           {selectedProductGroup ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['logo', 'name', 'logoAndText'] as const).map((embroideryType, index) => {
                      const getEmbroideryLabel = (type: string) => {
                        if (type === 'logo') return 'Logo Only';
                        if (type === 'name') return 'Name Only';
                        if (type === 'logoAndText') return 'Logo + Back Text';
                        return '';
                      }
                      const colors = ['bg-sky-600', 'bg-blue-600', 'bg-indigo-600'];
                      return (
                        <div key={embroideryType} className="border rounded-lg overflow-hidden shadow">
                           <div className={`p-2 text-center ${colors[index]}`}>
                                <h4 className="font-semibold text-white">{getEmbroideryLabel(embroideryType)}</h4>
                            </div>
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead className="py-1 px-2 text-xs text-center">Min</TableHead>
                                      <TableHead className="py-1 px-2 text-xs text-center">Max</TableHead>
                                      <TableHead className="py-1 px-2 text-xs text-center">Price</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {config.pricingTiers[selectedProductGroup]?.[embroideryType]?.tiers.map((tier, tierIndex) => (
                                      <TableRow key={tierIndex}>
                                          <TableCell className="p-1 align-middle">
                                            <div className="flex justify-center">
                                                <Input type="number" value={tier.min} onChange={e => handleTierChange(selectedProductGroup!, embroideryType, tierIndex, 'min', e.target.value)} className="w-20 h-7 text-xs text-center"/>
                                            </div>
                                          </TableCell>
                                          <TableCell className="p-1 align-middle">
                                            <div className="flex justify-center">
                                                <Input type="number" value={tier.max === Infinity ? '' : tier.max} placeholder="Infinity" onChange={e => handleTierChange(selectedProductGroup!, embroideryType, tierIndex, 'max', e.target.value)} className="w-20 h-7 text-xs text-center"/>
                                            </div>
                                          </TableCell>
                                          <TableCell className="p-1 align-middle">
                                            <div className="relative flex items-center justify-center">
                                                <span className="absolute left-3 text-muted-foreground">₱</span>
                                                <Input type="number" value={tier.price} onChange={e => handleTierChange(selectedProductGroup!, embroideryType, tierIndex, 'price', e.target.value)} className="w-24 h-7 text-xs pl-6 text-center"/>
                                            </div>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                        </div>
                      )
                  })}
            </div>
           ) : <p>Select a product to see its pricing.</p>}
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-4">Add-on Pricing</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {addOnTypes.map((addOn, index) => {
              const colors = ['bg-slate-500', 'bg-gray-500', 'bg-zinc-500'];
              return (
                 <div key={addOn} className="border rounded-lg overflow-hidden shadow">
                    <div className={`p-2 text-center ${colors[index % colors.length]}`}>
                      <h4 className="font-semibold capitalize text-white">{addOn.replace(/([A-Z])/g, ' $1')}</h4>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="py-1 px-2 text-xs text-center">Min Qty</TableHead>
                                <TableHead className="py-1 px-2 text-xs text-center">Max Qty</TableHead>
                                <TableHead className="py-1 px-2 text-xs text-center">Price</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {config.addOnPricing[addOn]?.tiers.map((tier, tierIndex) => (
                                <TableRow key={tierIndex}>
                                     <TableCell className="p-1 align-middle">
                                        <div className="flex justify-center">
                                          <Input type="number" value={tier.min} onChange={e => handleAddOnTierChange(addOn, tierIndex, 'min', e.target.value)} className="w-20 h-7 text-xs text-center"/>
                                        </div>
                                     </TableCell>
                                    <TableCell className="p-1 align-middle">
                                        <div className="flex justify-center">
                                            <Input type="number" value={tier.max === Infinity ? '' : tier.max} placeholder="Infinity" onChange={e => handleAddOnTierChange(addOn, tierIndex, 'max', e.target.value)} className="w-20 h-7 text-xs text-center"/>
                                        </div>
                                    </TableCell>
                                    <TableCell className="p-1 align-middle">
                                        <div className="relative flex items-center justify-center">
                                            <span className="absolute left-2 text-muted-foreground">₱</span>
                                            <Input type="number" value={tier.price} onChange={e => handleAddOnTierChange(addOn, tierIndex, 'price', e.target.value)} className="w-24 h-7 text-xs pl-6 text-center"/>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </div>
              )
            })}
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
