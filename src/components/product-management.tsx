
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
import { Save, PlusCircle, Trash2, Edit, X } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from './ui/label';
import { cn } from '@/lib/utils';

// New types to allow empty strings for editing
type EditableTier = { min: number | ''; max: number | ''; price: number | '' };
type EditableEmbroideryPricing = { tiers: EditableTier[] };
type EditablePricingConfig = Omit<PricingConfig, 'pricingTiers' | 'addOnPricing'> & {
  pricingTiers: {
    [key in ProductGroup]: {
      [key in 'logo' | 'logoAndText' | 'name']: EditableEmbroideryPricing;
    };
  };
  addOnPricing: {
    [key in AddOnType]: { tiers: EditableTier[] };
  };
};

export function ProductManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const pricingConfigRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'pricing', 'default') : null),
    [firestore]
  );

  const { data: fetchedConfig, isLoading, refetch } = useDoc<PricingConfig>(pricingConfigRef);

  const [config, setConfig] = useState<EditablePricingConfig | null>(null);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [selectedProductType, setSelectedProductType] = useState<string>('');
  const [newProduct, setNewProduct] = useState({ name: '', group: '' });
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // State to manage edit mode for each table
  const [editModes, setEditModes] = useState<Record<string, boolean>>({});
  
  const [editingCategory, setEditingCategory] = useState<{ oldName: string; newName: string } | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  useEffect(() => {
    const dataToUse = fetchedConfig || (isLoading ? null : initialPricingConfig as PricingConfig);
    if (dataToUse) {
      setConfig(dataToUse as unknown as EditablePricingConfig);
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

  const toggleEditMode = (key: string) => {
    const isCurrentlyEditing = editModes[key];

    if (isCurrentlyEditing && config) {
      let tiers: EditableTier[];

      if (key.includes('-addon')) {
        const addOn = key.replace('-addon', '') as AddOnType;
        tiers = config.addOnPricing[addOn].tiers;
      } else {
        const [group, embroidery] = key.split('-') as [ProductGroup, 'logo' | 'logoAndText' | 'name'];
        tiers = config.pricingTiers[group]?.[embroidery]?.tiers || [];
      }

      // 1. Check for blank fields
      for (const tier of tiers) {
        if (tier.min === '' || tier.price === '') {
          toast({
            variant: 'destructive',
            title: 'Invalid Tier',
            description: 'Min Qty and Price fields cannot be blank. Please fill all fields or remove the empty tier.',
          });
          return; // Don't exit edit mode
        }
      }
      
      const numericTiers = tiers
        .map(t => ({...t, min: Number(t.min)}))
        .sort((a, b) => a.min - b.min);

      // 2. Check for correct sequence
      for (let i = 1; i < numericTiers.length; i++) {
        if (numericTiers[i].min <= numericTiers[i - 1].min) {
           toast({
            variant: 'destructive',
            title: 'Invalid Tier Order',
            description: `A tier with Min Qty ${numericTiers[i].min} cannot be less than or equal to the previous tier's Min Qty ${numericTiers[i - 1].min}.`,
          });
          return; // Don't exit edit mode
        }
      }
      
      const newConfig = JSON.parse(JSON.stringify(config));
      
      const nonEmptyTiers = tiers.filter(t => t.min !== '' && t.price !== '');
      
      if (key.includes('-addon')) {
        const addOn = key.replace('-addon', '') as AddOnType;
        newConfig.addOnPricing[addOn].tiers = nonEmptyTiers;
      } else {
        const [group, embroidery] = key.split('-') as [ProductGroup, 'logo' | 'logoAndText' | 'name'];
        newConfig.pricingTiers[group][embroidery].tiers = nonEmptyTiers;
      }
      
      setConfig(newConfig);
    }

    setEditModes(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const handleTierChange = (
    group: ProductGroup,
    embroidery: 'logo' | 'logoAndText' | 'name',
    tierIndex: number,
    field: 'min' | 'price',
    value: string
  ) => {
    if (!config) return;

    const newConfig = JSON.parse(JSON.stringify(config));
    const tiers: EditableTier[] = newConfig.pricingTiers[group][embroidery].tiers;
    
    if (value === '') {
        tiers[tierIndex][field] = '';
    } else {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            tiers[tierIndex][field] = numValue;
        }
    }
    
    setConfig(newConfig);
  };

  const handleAddOnTierChange = (
    addOn: AddOnType,
    tierIndex: number,
    field: 'min' | 'price',
    value: string
  ) => {
    if (!config) return;
    const newConfig = JSON.parse(JSON.stringify(config));
    const tiers: EditableTier[] = newConfig.addOnPricing[addOn].tiers;
    
    if (value === '') {
        tiers[tierIndex][field] = '';
    } else {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            tiers[tierIndex][field] = numValue;
        }
    }

    setConfig(newConfig);
  };
  
  const handleAddTier = (group: ProductGroup, embroidery: 'logo' | 'logoAndText' | 'name') => {
    if (!config) return;
    const newConfig = JSON.parse(JSON.stringify(config));
    const tiers = newConfig.pricingTiers[group][embroidery].tiers;
    tiers.push({ min: '', max: Infinity, price: '' });
    setConfig(newConfig);
  };

  const handleRemoveTier = (group: ProductGroup, embroidery: 'logo' | 'logoAndText' | 'name', tierIndex: number) => {
    if (!config) return;
    const newConfig = JSON.parse(JSON.stringify(config));
    const tiers = newConfig.pricingTiers[group][embroidery].tiers;
    tiers.splice(tierIndex, 1);
    setConfig(newConfig);
  };
  
  const handleAddOnAddTier = (addOn: AddOnType) => {
    if (!config) return;
    const newConfig = JSON.parse(JSON.stringify(config));
    const tiers = newConfig.addOnPricing[addOn].tiers;
    tiers.push({ min: '', max: Infinity, price: '' });
    setConfig(newConfig);
  };

  const handleAddOnRemoveTier = (addOn: AddOnType, tierIndex: number) => {
    if (!config) return;
    const newConfig = JSON.parse(JSON.stringify(config));
    const tiers = newConfig.addOnPricing[addOn].tiers;
    tiers.splice(tierIndex, 1);
    setConfig(newConfig);
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

  const handleSaveCategoryName = () => {
    if (!editingCategory || !config) return;
    const { oldName, newName } = editingCategory;

    if (!newName.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Category name cannot be empty.' });
        return;
    }
    if (newName.trim() !== oldName && config.pricingTiers[newName.trim()]) {
        toast({ variant: 'destructive', title: 'Error', description: 'Category name already exists.' });
        return;
    }

    const newConfig = JSON.parse(JSON.stringify(config));

    // Rename in pricingTiers
    newConfig.pricingTiers[newName.trim()] = newConfig.pricingTiers[oldName];
    delete newConfig.pricingTiers[oldName];

    // Update productGroupMapping
    for (const product in newConfig.productGroupMapping) {
        if (newConfig.productGroupMapping[product] === oldName) {
            newConfig.productGroupMapping[product] = newName.trim();
        }
    }
    
    setConfig(newConfig);
    setEditingCategory(null);
    toast({ title: 'Category Renamed', description: `"${oldName}" was renamed to "${newName.trim()}".`});
  };

  const handleConfirmDeleteCategory = () => {
    if (!deletingCategory || !config) return;

    const isCategoryInUse = Object.values(config.productGroupMapping).some(group => group === deletingCategory);

    if (isCategoryInUse) {
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: `Cannot delete category "${deletingCategory}" as it is still assigned to one or more products. Please re-assign them first.`,
            duration: 5000,
        });
        setDeletingCategory(null);
        return;
    }

    const newConfig = JSON.parse(JSON.stringify(config));
    delete newConfig.pricingTiers[deletingCategory];
    setConfig(newConfig);
    setDeletingCategory(null);
    toast({ title: 'Category Deleted', description: `Category "${deletingCategory}" has been deleted.`});
  };


  const handleSaveChanges = async () => {
    if (!config || !pricingConfigRef) return;
  
    const validateTiers = (tiers: EditableTier[], context: string) => {
      const numericTiers: { min: number; price: number }[] = [];
  
      for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i];
        if (tier.min === '' || tier.price === '') {
          toast({ variant: 'destructive', title: `Invalid Pricing in ${context}`, description: `Tier ${i + 1} has an empty minimum quantity or price. Please fill all fields.` });
          return null;
        }
        numericTiers.push({ min: Number(tier.min), price: Number(tier.price) });
      }
  
      numericTiers.sort((a, b) => a.min - b.min);
  
      for (let i = 1; i < numericTiers.length; i++) {
        if (numericTiers[i].min <= numericTiers[i-1].min) {
          toast({ variant: 'destructive', title: `Invalid Pricing in ${context}`, description: `Tier minimum quantities must be in increasing order and not have duplicates.` });
          return null;
        }
      }
      return numericTiers;
    };
  
    const validatedConfig = JSON.parse(JSON.stringify(config));
    let isValid = true;
  
    for (const group of Object.keys(validatedConfig.pricingTiers)) {
      for (const embroidery of ['logo', 'name', 'logoAndText']) {
        const tiers = validatedConfig.pricingTiers[group][embroidery].tiers;
        if (tiers.length === 0) {
          toast({ variant: 'destructive', title: `Invalid Pricing`, description: `The category "${group}" under "${embroidery}" must have at least one pricing tier.` });
          isValid = false;
          break;
        }
        const context = `${group} - ${embroidery}`;
        const validated = validateTiers(tiers, context);
        if (!validated) {
          isValid = false;
          break;
        }
        validatedConfig.pricingTiers[group][embroidery].tiers = validated.map((t, index) => ({
            ...t,
            max: index === validated.length - 1 ? Infinity : validated[index + 1].min - 1
        }));
      }
      if (!isValid) break;
    }
    if (!isValid) return;
  
    for (const addOn of Object.keys(validatedConfig.addOnPricing)) {
      if (addOn === 'rushFee' || addOn === 'shippingFee') continue;
      const tiers = validatedConfig.addOnPricing[addOn].tiers;
      if (tiers.length === 0) {
        toast({ variant: 'destructive', title: `Invalid Pricing`, description: `The add-on "${addOn}" must have at least one pricing tier.` });
        isValid = false;
        break;
      }
      const validated = validateTiers(tiers, addOn);
      if (!validated) {
        isValid = false;
        break;
      }
      validatedConfig.addOnPricing[addOn].tiers = validated.map((t, index) => ({
        ...t,
        max: index === validated.length - 1 ? Infinity : validated[index + 1].min - 1
      }));
    }
    if (!isValid) return;
  
    try {
      await setDoc(pricingConfigRef, validatedConfig, { merge: true });
      toast({
        title: 'Success!',
        description: 'Pricing configuration has been updated.',
      });
      refetch();
      setEditModes({});
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
    <>
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
                    <DialogContent className="max-w-7xl px-0">
                        <DialogHeader className="px-6">
                            <DialogTitle>Manage Products &amp; Categories</DialogTitle>
                            <DialogDescription>
                                Add new products or re-categorize existing ones.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-12 gap-8 py-4 px-6">
                            <div className="col-span-2 space-y-4 border-r pr-8">
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

                             <section className="col-span-6 border-r pr-8">
                                <h3 className="text-lg font-semibold">Product Categories</h3>
                                <div className="space-y-2 max-h-96 overflow-y-auto border p-4 rounded-md mt-4">
                                {Object.entries(config.productGroupMapping).map(([name, group]) => (
                                    <div key={name} className="flex items-center justify-between gap-4">
                                        <span className="whitespace-nowrap flex-1">{name}</span>
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
                            
                             <section className="col-span-4">
                                <h3 className="text-lg font-semibold">Manage Pricing Categories</h3>
                                <div className="space-y-2 max-h-96 overflow-y-auto border p-4 rounded-md mt-4">
                                  {productGroups.map((group) => (
                                    <div key={group} className="flex items-center justify-between gap-4">
                                      {editingCategory?.oldName === group ? (
                                        <div className="flex items-center gap-2 flex-1">
                                          <Input 
                                            value={editingCategory.newName} 
                                            onChange={(e) => setEditingCategory({ ...editingCategory, newName: e.target.value })}
                                            className="h-8"
                                          />
                                          <Button size="icon" className="h-8 w-8" onClick={handleSaveCategoryName}><Save className="h-4 w-4" /></Button>
                                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingCategory(null)}><X className="h-4 w-4" /></Button>
                                        </div>
                                      ) : (
                                        <>
                                          <span className="whitespace-nowrap flex-1">{group}</span>
                                          <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCategory({ oldName: group, newName: group })}>
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingCategory(group)}>
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </section>
                        </div>
                        <DialogFooter className="px-6">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  {(['logo', 'name', 'logoAndText'] as const).map((embroideryType, index) => {
                      const getEmbroideryLabel = (type: string) => {
                        if (type === 'logo') return 'Logo Only';
                        if (type === 'name') return 'Name Only';
                        if (type === 'logoAndText') return 'Logo + Back Text';
                        return '';
                      }
                      const colors = ['bg-sky-600', 'bg-blue-600', 'bg-indigo-600'];
                      const key = `${selectedProductGroup}-${embroideryType}`;
                      const isEditing = !!editModes[key];
                      const tiers = config.pricingTiers[selectedProductGroup]?.[embroideryType]?.tiers || [];
                      return (
                        <div key={embroideryType} className="border rounded-lg overflow-hidden shadow flex flex-col">
                           <div className={`p-2 text-center ${colors[index]}`}>
                                <h4 className="font-semibold text-white">{getEmbroideryLabel(embroideryType)}</h4>
                            </div>
                          <div className="flex-grow">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="py-1 px-2 text-xs text-center">Min Qty</TableHead>
                                        <TableHead className="py-1 px-2 text-xs text-center">Max Qty</TableHead>
                                        <TableHead className="py-1 px-2 text-xs text-center">Price</TableHead>
                                        <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tiers.map((tier, tierIndex) => {
                                        const nextTier = tiers[tierIndex + 1];
                                        const maxQty = nextTier ? (typeof nextTier.min === 'number' ? nextTier.min - 1 : '...') : Infinity;
                                        return (
                                            <TableRow key={tierIndex}>
                                                <TableCell className="p-1 align-middle">
                                                  <div className="flex justify-center">
                                                      <Input type="text" value={tier.min} onChange={e => handleTierChange(selectedProductGroup!, embroideryType, tierIndex, 'min', e.target.value)} className="w-20 h-7 text-xs text-center" readOnly={!isEditing}/>
                                                  </div>
                                                </TableCell>
                                                <TableCell className="p-1 align-middle">
                                                  <div className="flex justify-center">
                                                      <Input type="text" value={maxQty === Infinity ? '' : maxQty} placeholder="Infinity" readOnly className="w-20 h-7 text-xs text-center bg-muted"/>
                                                  </div>
                                                </TableCell>
                                                <TableCell className="p-1 align-middle">
                                                  <div className="relative flex items-center justify-center">
                                                      <span className="absolute left-3 text-muted-foreground">₱</span>
                                                      <Input type="text" value={tier.price} onChange={e => handleTierChange(selectedProductGroup!, embroideryType, tierIndex, 'price', e.target.value)} className="w-24 h-7 text-xs pl-6 text-center" readOnly={!isEditing}/>
                                                  </div>
                                                </TableCell>
                                                <TableCell className="p-1 align-middle">
                                                  {isEditing && <Button variant="ghost" size="icon" onClick={() => handleRemoveTier(selectedProductGroup!, embroideryType, tierIndex)} className="h-7 w-7 text-destructive">
                                                      <Trash2 className="h-4 w-4" />
                                                  </Button>}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                          </div>
                           <div className={`p-2 flex justify-center items-center gap-2 ${colors[index]}`}>
                            {isEditing && (
                                <Button variant="outline" size="sm" onClick={() => handleAddTier(selectedProductGroup!, embroideryType)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Tier
                                </Button>
                            )}
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => toggleEditMode(key)}
                                className={cn(isEditing && "bg-teal-600 hover:bg-teal-700 text-white")}
                            >
                                {isEditing ? 'Done' : <><Edit className="mr-2 h-4 w-4"/> Edit</>}
                            </Button>
                          </div>
                        </div>
                      )
                  })}
            </div>
           ) : <p>Select a product to see its pricing.</p>}
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-4">Add-on Pricing</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
            {addOnTypes.map((addOn, index) => {
              const colors = ['bg-slate-500', 'bg-gray-500', 'bg-zinc-500'];
              const key = `${addOn}-addon`;
              const isEditing = !!editModes[key];
              const tiers = config.addOnPricing[addOn]?.tiers || [];
              return (
                 <div key={addOn} className="border rounded-lg overflow-hidden shadow flex flex-col">
                    <div className={`p-2 text-center ${colors[index % colors.length]}`}>
                      <h4 className="font-semibold capitalize text-white">{addOn.replace(/([A-Z])/g, ' $1')}</h4>
                    </div>
                    <div className="flex-grow">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead className="py-1 px-2 text-xs text-center">Min Qty</TableHead>
                                  <TableHead className="py-1 px-2 text-xs text-center">Max Qty</TableHead>
                                  <TableHead className="py-1 px-2 text-xs text-center">Price</TableHead>
                                  <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {tiers.map((tier, tierIndex) => {
                                  const nextTier = tiers[tierIndex + 1];
                                  const maxQty = nextTier ? (typeof nextTier.min === 'number' ? nextTier.min - 1 : '...') : Infinity;
                                  return (
                                      <TableRow key={tierIndex}>
                                          <TableCell className="p-1 align-middle">
                                              <div className="flex justify-center">
                                              <Input type="text" value={tier.min} onChange={e => handleAddOnTierChange(addOn, tierIndex, 'min', e.target.value)} className="w-20 h-7 text-xs text-center" readOnly={!isEditing}/>
                                              </div>
                                          </TableCell>
                                          <TableCell className="p-1 align-middle">
                                              <div className="flex justify-center">
                                                  <Input type="text" value={maxQty === Infinity ? '' : maxQty} placeholder="Infinity" readOnly className="w-20 h-7 text-xs text-center bg-muted"/>
                                              </div>
                                          </TableCell>
                                          <TableCell className="p-1 align-middle">
                                              <div className="relative flex items-center justify-center">
                                                  <span className="absolute left-3 text-muted-foreground">₱</span>
                                                  <Input type="text" value={tier.price} onChange={e => handleAddOnTierChange(addOn, tierIndex, 'price', e.target.value)} className="w-24 h-7 text-xs pl-6 text-center" readOnly={!isEditing}/>
                                              </div>
                                          </TableCell>
                                          <TableCell className="p-1 align-middle">
                                          {isEditing && <Button variant="ghost" size="icon" onClick={() => handleAddOnRemoveTier(addOn, tierIndex)} className="h-7 w-7 text-destructive">
                                              <Trash2 className="h-4 w-4" />
                                          </Button>}
                                          </TableCell>
                                      </TableRow>
                                  )}
                              )}
                          </TableBody>
                      </Table>
                    </div>
                     <div className={`p-2 flex justify-center items-center gap-2 ${colors[index % colors.length]}`}>
                        {isEditing && (
                            <Button variant="outline" size="sm" onClick={() => handleAddOnAddTier(addOn)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Tier
                            </Button>
                        )}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => toggleEditMode(key)}
                            className={cn(isEditing && "bg-teal-600 hover:bg-teal-700 text-white")}
                        >
                            {isEditing ? 'Done' : <><Edit className="mr-2 h-4 w-4"/> Edit</>}
                        </Button>
                    </div>
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
    <AlertDialog open={!!deletingCategory} onOpenChange={(isOpen) => !isOpen && setDeletingCategory(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete this category?</AlertDialogTitle>
                <AlertDialogDescription>
                    You can only delete a category if no products are assigned to it. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeleteCategory} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
