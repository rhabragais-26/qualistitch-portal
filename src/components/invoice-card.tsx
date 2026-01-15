

"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as ShadTableFooter } from '@/components/ui/table';
import { Order } from './lead-form';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { getProductGroup, getUnitPrice, getProgrammingFees, type EmbroideryOption, getAddOnPrice, AddOnType, getTierLabel } from '@/lib/pricing';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose, DialogFooter, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Minus, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';


type InvoiceCardProps = {
  orders: Order[];
  orderType?: 'MTO' | 'Personalize' | 'Customize' | 'Stock Design' | 'Stock (Jacket Only)' | 'Services';
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
};

type AddOns = {
  backLogo: number;
  names: number;
  programFeeLogo: number;
  programFeeBackText: number;
  rushFee: number;
};

type Discount = {
  type: 'percentage' | 'fixed';
  value: number;
  reason?: string;
};

export function InvoiceCard({ orders, orderType }: InvoiceCardProps) {
  
  const [addOns, setAddOns] = useState<Record<string, AddOns>>({});
  const [discounts, setDiscounts] = useState<Record<string, Discount>>({});
  const [removingAddOn, setRemovingAddOn] = useState<{ groupKey: string; addOnType: keyof AddOns; } | null>(null);

  const groupedOrders = useMemo(() => {
    return orders.reduce((acc, order) => {
      const isClientOwned = order.productType === 'Client Owned';
      const isPatches = order.productType === 'Patches';
      const productGroup = getProductGroup(order.productType);
      
      if (!productGroup && !isClientOwned && order.productType !== 'Patches') return acc;

      const groupKey = `${order.productType}-${order.embroidery}`;
      if (!acc[groupKey]) {
        acc[groupKey] = {
          productType: order.productType,
          embroidery: order.embroidery,
          orders: [],
          totalQuantity: 0,
        };
      }
      acc[groupKey].orders.push(order);
      acc[groupKey].totalQuantity += order.quantity;
      return acc;
    }, {} as Record<string, { productType: string; embroidery: EmbroideryOption; orders: Order[], totalQuantity: number }>);
  }, [orders]);

  const grandTotal = useMemo(() => {
    let total = 0;
    Object.entries(groupedOrders).forEach(([groupKey, group]) => {
      const isClientOwned = group.productType === 'Client Owned';
      const isPatches = group.productType === 'Patches';
      const patchPrice = isPatches ? group.orders[0]?.pricePerPatch || 0 : 0;
      const unitPrice = getUnitPrice(group.productType, group.totalQuantity, group.embroidery, patchPrice);
      const { logoFee, backTextFee } = getProgrammingFees(group.totalQuantity, group.embroidery, isClientOwned, orderType);

      let subtotal = group.totalQuantity * unitPrice;

      
      const groupAddOns = addOns[groupKey] || { backLogo: 0, names: 0, programFeeLogo: 0, programFeeBackText: 0, rushFee: 0 };
      const groupDiscount = discounts[groupKey];
      const itemTotalQuantity = group.totalQuantity;

      if (groupAddOns.backLogo > 0) {
          const backLogoPrice = getAddOnPrice('backLogo', itemTotalQuantity);
          subtotal += groupAddOns.backLogo * backLogoPrice;
      }
      if (groupAddOns.names > 0) {
          const namesPrice = getAddOnPrice('names', itemTotalQuantity);
          subtotal += groupAddOns.names * namesPrice;
      }
      if (groupAddOns.programFeeLogo > 0) {
        subtotal += groupAddOns.programFeeLogo * getAddOnPrice('programFeeLogo', itemTotalQuantity);
      }
      if (groupAddOns.programFeeBackText > 0) {
          subtotal += groupAddOns.programFeeBackText * getAddOnPrice('programFeeBackText', itemTotalQuantity);
      }
      if (groupAddOns.rushFee > 0) {
        subtotal += groupAddOns.rushFee;
      }
      
      subtotal += logoFee + backTextFee;

      if (groupDiscount) {
        if (groupDiscount.type === 'percentage') {
          subtotal *= (1 - groupDiscount.value / 100);
        } else {
          subtotal -= groupDiscount.value;
        }
      }
      
      total += subtotal;
    });
    return total;
  }, [groupedOrders, addOns, discounts, orderType]);

  const handleConfirmRemoveAddOn = () => {
    if (!removingAddOn) return;
    const { groupKey, addOnType } = removingAddOn;
    setAddOns(prev => {
      const newGroupAddOns = {
        ...(prev[groupKey] || { backLogo: 0, names: 0, programFeeLogo: 0, programFeeBackText: 0, rushFee: 0 }),
        [addOnType]: 0,
      };
      return {
        ...prev,
        [groupKey]: newGroupAddOns,
      }
    });
    setRemovingAddOn(null);
  };
  
  const handleRemoveDiscount = (groupKey: string) => {
    setDiscounts(prev => {
      const newDiscounts = { ...prev };
      delete newDiscounts[groupKey];
      return newDiscounts;
    });
  }


  return (
    <Card className="shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="font-headline text-xl">Pricing Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-22rem)] pr-4">
          {Object.keys(groupedOrders).length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Add orders to see the price summary.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedOrders).map(([groupKey, groupData]) => {
                const isClientOwned = groupData.productType === 'Client Owned';
                const isPatches = groupData.productType === 'Patches';
                const tierLabel = getTierLabel(groupData.productType, groupData.totalQuantity, groupData.embroidery);
                const patchPrice = isPatches ? groupData.orders[0]?.pricePerPatch || 0 : 0;
                const unitPrice = getUnitPrice(groupData.productType, groupData.totalQuantity, groupData.embroidery, patchPrice);
                const { logoFee, backTextFee } = getProgrammingFees(groupData.totalQuantity, groupData.embroidery, isClientOwned, orderType);
                const itemsSubtotal = groupData.totalQuantity * unitPrice;
                
                const groupAddOns = addOns[groupKey] || { backLogo: 0, names: 0, programFeeLogo: 0, programFeeBackText: 0, rushFee: 0 };
                const groupDiscount = discounts[groupKey];
                const itemTotalQuantity = groupData.totalQuantity;

                const backLogoPrice = getAddOnPrice('backLogo', itemTotalQuantity);
                const namesPrice = getAddOnPrice('names', itemTotalQuantity);
                const programFeeLogoPrice = getAddOnPrice('programFeeLogo', itemTotalQuantity);
                const programFeeBackTextPrice = getAddOnPrice('programFeeBackText', itemTotalQuantity);

                const backLogoTotal = groupAddOns.backLogo * backLogoPrice;
                const namesTotal = groupAddOns.names * namesPrice;
                const programFeeLogoTotal = groupAddOns.programFeeLogo * programFeeLogoPrice;
                const programFeeBackTextTotal = groupAddOns.programFeeBackText * programFeeBackTextPrice;

                let subtotal = itemsSubtotal + backLogoTotal + namesTotal + programFeeLogoTotal + programFeeBackTextTotal + groupAddOns.rushFee + logoFee + backTextFee;

                let discountAmount = 0;
                if(groupDiscount) {
                    if(groupDiscount.type === 'percentage') {
                        discountAmount = subtotal * (groupDiscount.value / 100);
                    } else {
                        discountAmount = groupDiscount.value;
                    }
                    subtotal -= discountAmount;
                }
                
                return (
                  <div key={groupKey}>
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex flex-col">
                            <h3 className="font-bold text-lg text-primary leading-tight">
                                {groupData.productType}
                            </h3>
                            <span className="text-sm font-normal text-muted-foreground">({groupData.embroidery === 'logo' ? 'Logo Only' : groupData.embroidery === 'logoAndText' ? 'Logo + Back Text' : 'Name Only'})</span>
                        </div>
                        <div className="flex gap-2">
                            <DiscountDialog groupKey={groupKey} discounts={discounts} setDiscounts={setDiscounts} />
                            <AddOnsDialog groupKey={groupKey} addOns={addOns} setAddOns={setAddOns} totalQuantity={groupData.totalQuantity} />
                        </div>
                    </div>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="py-2 px-3 text-black">Details</TableHead>
                            <TableHead className="py-2 px-3 text-black text-center">Category</TableHead>
                            <TableHead className="py-2 px-3 text-black text-center">Unit Price</TableHead>
                            <TableHead className="py-2 px-3 text-black text-center">Quantity</TableHead>
                            <TableHead className="py-2 px-3 text-right text-black">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="py-2 px-3 text-xs font-medium text-black align-middle">Items Ordered</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{tierLabel}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{formatCurrency(unitPrice)}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{groupData.totalQuantity}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">{formatCurrency(itemsSubtotal)}</TableCell>
                            </TableRow>
                           {groupAddOns.backLogo > 0 && (
                            <TableRow className="group">
                                <TableCell className="py-2 px-3 text-xs text-black align-middle">
                                    <div className="flex items-center gap-2">
                                        <span>Add On: Back Logo</span>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => setRemovingAddOn({ groupKey, addOnType: 'backLogo' })}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle"></TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{formatCurrency(backLogoPrice)}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{groupAddOns.backLogo}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">
                                    {formatCurrency(backLogoTotal)}
                                </TableCell>
                            </TableRow>
                           )}
                           {groupAddOns.names > 0 && (
                            <TableRow className="group">
                                <TableCell className="py-2 px-3 text-xs text-black align-middle">
                                     <div className="flex items-center gap-2">
                                        <span>Add On: Names</span>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => setRemovingAddOn({ groupKey, addOnType: 'names' })}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle"></TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{formatCurrency(namesPrice)}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{groupAddOns.names}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">
                                     {formatCurrency(namesTotal)}
                                </TableCell>
                            </TableRow>
                           )}
                            {groupAddOns.programFeeLogo > 0 && (
                            <TableRow className="group">
                                <TableCell className="py-2 px-3 text-xs text-black align-middle">
                                    <div className="flex items-center gap-2">
                                        <span>Add On: Program Fee (Logo)</span>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => setRemovingAddOn({ groupKey, addOnType: 'programFeeLogo' })}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle"></TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{formatCurrency(programFeeLogoPrice)}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{groupAddOns.programFeeLogo}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">
                                    {formatCurrency(programFeeLogoTotal)}
                                </TableCell>
                            </TableRow>
                           )}
                            {groupAddOns.programFeeBackText > 0 && (
                            <TableRow className="group">
                                <TableCell className="py-2 px-3 text-xs text-black align-middle">
                                    <div className="flex items-center gap-2">
                                        <span>Add On: Program Fee (Back Text)</span>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => setRemovingAddOn({ groupKey, addOnType: 'programFeeBackText' })}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle"></TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{formatCurrency(programFeeBackTextPrice)}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{groupAddOns.programFeeBackText}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">
                                    {formatCurrency(programFeeBackTextTotal)}
                                </TableCell>
                            </TableRow>
                           )}
                           {groupAddOns.rushFee > 0 && (
                            <TableRow className="group">
                                <TableCell className="py-2 px-3 text-xs text-black align-middle">
                                    <div className="flex items-center gap-2">
                                        <span>Add On: Rush Fee</span>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => setRemovingAddOn({ groupKey, addOnType: 'rushFee' })}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle" colSpan={3}></TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">
                                    {formatCurrency(groupAddOns.rushFee)}
                                </TableCell>
                            </TableRow>
                           )}
                          {logoFee > 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="py-2 px-3 text-xs text-right text-black align-middle">One-time Logo Programming Fee</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">{formatCurrency(logoFee)}</TableCell>
                            </TableRow>
                          )}
                          {backTextFee > 0 && (
                             <TableRow>
                                <TableCell colSpan={4} className="py-2 px-3 text-xs text-right text-black align-middle">One-time Back Text Programming Fee</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">{formatCurrency(backTextFee)}</TableCell>
                            </TableRow>
                          )}
                          {groupDiscount && (
                            <TableRow className="group">
                              <TableCell colSpan={4} className="py-1 px-3 text-right font-medium text-destructive">
                                 <div className="flex items-center justify-end gap-2">
                                     <span>Discount ({groupDiscount.type === 'percentage' ? `${groupDiscount.value}%` : formatCurrency(groupDiscount.value)})</span>
                                     <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => handleRemoveDiscount(groupKey)}>
                                         <X className="h-3 w-3" />
                                     </Button>
                                 </div>
                              </TableCell>
                              <TableCell className="py-1 px-3 text-right font-medium text-destructive">
                                -{formatCurrency(discountAmount)}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                        <ShadTableFooter>
                            <TableRow>
                                <TableCell colSpan={4} className="py-1 px-3 text-right font-bold text-black">Subtotal</TableCell>
                                <TableCell className="py-1 px-3 text-right font-bold text-black">{formatCurrency(subtotal)}</TableCell>
                            </TableRow>
                        </ShadTableFooter>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      {grandTotal > 0 && (
         <CardFooter>
            <div className="w-full pt-4">
                <Separator />
                <div className="flex justify-end items-center mt-4">
                    <span className="text-xl font-bold text-black mr-4">Grand Total:</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
                </div>
            </div>
        </CardFooter>
      )}
       <AlertDialog open={!!removingAddOn} onOpenChange={(open) => !open && setRemovingAddOn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the "{
                removingAddOn?.addOnType === 'backLogo' ? 'Back Logo' : 
                removingAddOn?.addOnType === 'names' ? 'Names' :
                removingAddOn?.addOnType === 'programFeeLogo' ? 'Program Fee (Logo)' : 
                removingAddOn?.addOnType === 'programFeeBackText' ? 'Program Fee (Back Text)' : 'Rush Fee'
              }" add-on from this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemoveAddOn} className="bg-destructive hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function AddOnsDialog({ groupKey, addOns, setAddOns, totalQuantity }: { groupKey: string, addOns: Record<string, AddOns>, setAddOns: React.Dispatch<React.SetStateAction<Record<string, AddOns>>>, totalQuantity: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localAddOns, setLocalAddOns] = useState(addOns[groupKey] || { backLogo: 0, names: 0, programFeeLogo: 0, programFeeBackText: 0, rushFee: 0 });
  const [rushFeeInput, setRushFeeInput] = useState('');

  const handleSave = () => {
    setAddOns(prev => ({ ...prev, [groupKey]: localAddOns }));
    setIsOpen(false);
  };
  
  const handleQuantityChange = (type: keyof AddOns, change: number) => {
    setLocalAddOns(prev => ({...prev, [type]: Math.max(0, (prev[type] || 0) + change)}));
  }

  const handleInputChange = (type: keyof AddOns, value: string) => {
    setLocalAddOns(prev => ({...prev, [type]: value === '' ? 0 : parseInt(value, 10) || 0}));
  }

  const handleRushFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = parseFloat(rawValue.replace(/[^0-9.]/g, ''));

    if (!isNaN(numericValue)) {
        setLocalAddOns(prev => ({ ...prev, rushFee: numericValue }));
        setRushFeeInput(new Intl.NumberFormat('en-PH').format(numericValue));
    } else {
        setLocalAddOns(prev => ({ ...prev, rushFee: 0 }));
        setRushFeeInput('');
    }
  };

  const handleRushFeeBlur = () => {
      if (rushFeeInput) {
          setRushFeeInput(formatCurrency(localAddOns.rushFee).replace('₱', ''));
      }
  };

  useEffect(() => {
    if (isOpen) {
        const currentAddOns = addOns[groupKey] || { backLogo: 0, names: 0, programFeeLogo: 0, programFeeBackText: 0, rushFee: 0 };
        setLocalAddOns(currentAddOns);
        setRushFeeInput(currentAddOns.rushFee > 0 ? formatCurrency(currentAddOns.rushFee).replace('₱', '') : '');
    }
  }, [isOpen, addOns, groupKey]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if(!open) {
        setLocalAddOns(addOns[groupKey] || { backLogo: 0, names: 0, programFeeLogo: 0, programFeeBackText: 0, rushFee: 0 });
      }
      setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2 bg-gray-700 text-white hover:bg-gray-600 font-bold">
            <Plus/>Add Ons
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Ons</DialogTitle>
          <DialogDescription>
             Specify quantities for additional logos, names or patches.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4 flex flex-col items-center">
            <div className="flex items-center justify-between w-full max-w-sm">
                <Label htmlFor="backLogo" className="text-base">Back Logo</Label>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange('backLogo', -1)}><Minus className="h-4 w-4" /></Button>
                    <Input id="backLogo" type="text" value={localAddOns.backLogo} onChange={(e) => handleInputChange('backLogo', e.target.value)} className="w-16 text-center" />
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange('backLogo', 1)}><Plus className="h-4 w-4" /></Button>
                </div>
            </div>
            <div className="flex items-center justify-between w-full max-w-sm">
                <Label htmlFor="names" className="text-base">Names</Label>
                 <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange('names', -1)}><Minus className="h-4 w-4" /></Button>
                    <Input id="names" type="text" value={localAddOns.names} onChange={(e) => handleInputChange('names', e.target.value)} className="w-16 text-center" />
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange('names', 1)}><Plus className="h-4 w-4" /></Button>
                </div>
            </div>
            <div className="flex items-center justify-between w-full max-w-sm">
                <Label htmlFor="programFeeLogo" className="text-base">Program Fee (Logo)</Label>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange('programFeeLogo', -1)}><Minus className="h-4 w-4" /></Button>
                    <Input id="programFeeLogo" type="text" value={localAddOns.programFeeLogo} onChange={(e) => handleInputChange('programFeeLogo', e.target.value)} className="w-16 text-center" />
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange('programFeeLogo', 1)}><Plus className="h-4 w-4" /></Button>
                </div>
            </div>
             <div className="flex items-center justify-between w-full max-w-sm">
                <Label htmlFor="programFeeBackText" className="text-base">Program Fee (Back Text)</Label>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange('programFeeBackText', -1)}><Minus className="h-4 w-4" /></Button>
                    <Input id="programFeeBackText" type="text" value={localAddOns.programFeeBackText} onChange={(e) => handleInputChange('programFeeBackText', e.target.value)} className="w-16 text-center" />
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange('programFeeBackText', 1)}><Plus className="h-4 w-4" /></Button>
                </div>
            </div>
             <div className="flex items-center justify-between w-full max-w-sm">
                <Label htmlFor="rushFee" className="text-base">Rush Fee</Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                    <Input id="rushFee" type="text" value={rushFeeInput} onChange={handleRushFeeChange} onBlur={handleRushFeeBlur} className="w-40 text-right pr-3 pl-8" />
                </div>
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiscountDialog({ groupKey, discounts, setDiscounts }: { groupKey: string, discounts: Record<string, Discount>, setDiscounts: React.Dispatch<React.SetStateAction<Record<string, Discount>>> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localDiscount, setLocalDiscount] = useState<Discount>(discounts[groupKey] || { type: 'percentage', value: 0 });
  const [inputValue, setInputValue] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
        const currentDiscount = discounts[groupKey] || { type: 'percentage', value: 0, reason: '' };
        setLocalDiscount(currentDiscount);
        setInputValue(currentDiscount.value > 0 ? currentDiscount.value.toString() : '');
        setReason(currentDiscount.reason || '');
    }
  }, [isOpen, discounts, groupKey]);
  
  const handleSave = () => {
    setDiscounts(prev => ({ ...prev, [groupKey]: { ...localDiscount, reason } }));
    setIsOpen(false);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = parseFloat(rawValue.replace(/[^0-9.]/g, ''));
    if (!isNaN(numericValue)) {
      setLocalDiscount(prev => ({ ...prev, value: numericValue }));
      setInputValue(rawValue);
    } else {
      setLocalDiscount(prev => ({ ...prev, value: 0 }));
      setInputValue('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if(!open) {
        setLocalDiscount(discounts[groupKey] || { type: 'percentage', value: 0, reason: '' });
      }
      setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2 bg-teal-600 text-white hover:bg-teal-500 font-bold">
            <Plus/>Discount
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Discount</DialogTitle>
          <DialogDescription>
             Apply a discount to this order group.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <RadioGroup 
            value={localDiscount.type} 
            onValueChange={(type: 'percentage' | 'fixed') => setLocalDiscount(prev => ({ ...prev, type }))} 
            className="flex justify-center gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="percentage" id="percentage" />
              <Label htmlFor="percentage">Percentage (%)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed" id="fixed" />
              <Label htmlFor="fixed">Fixed Amount (₱)</Label>
            </div>
          </RadioGroup>
          <div className="flex justify-center">
             <div className="relative w-48">
              {localDiscount.type === 'fixed' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>}
              <Input
                type="text"
                value={inputValue}
                onChange={handleValueChange}
                className={cn(
                    "w-full text-right",
                    localDiscount.type === 'fixed' ? 'pl-8 pr-3' : 'pr-8'
                )}
              />
              {localDiscount.type === 'percentage' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="discount-reason">What is the discount for? (Optional)</Label>
            <Input
              id="discount-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Senior Citizen, PWD, Special Promo"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave} disabled={localDiscount.value <= 0}>Save Discount</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
