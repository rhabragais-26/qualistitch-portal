
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as ShadTableFooter } from '@/components/ui/table';
import { Order } from './lead-form';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { getProductGroup, getUnitPrice, getProgrammingFees, type EmbroideryOption, getAddOnPrice, getTierLabel, type PricingConfig } from '@/lib/pricing';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { AddOns, Discount, Payment } from "./invoice-dialogs";
import { AddOnsDialog, DiscountDialog, AddPaymentDialog, AddBalancePaymentDialog } from './invoice-dialogs';
import { formatCurrency } from '@/lib/utils';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { initialPricingConfig } from '@/lib/pricing-data';

type InvoiceCardProps = {
  orders: Order[];
  orderType?: 'MTO' | 'Personalize' | 'Customize' | 'Stock Design' | 'Stock (Jacket Only)' | 'Services';
  addOns: Record<string, AddOns>;
  setAddOns: React.Dispatch<React.SetStateAction<Record<string, AddOns>>>;
  discounts: Record<string, Discount>;
  setDiscounts: React.Dispatch<React.SetStateAction<Record<string, Discount>>>;
  payments: Record<string, Payment[]>;
  setPayments: React.Dispatch<React.SetStateAction<Record<string, Payment[]>>>;
  onGrandTotalChange: (total: number) => void;
  onBalanceChange: (balance: number) => void;
  isReadOnly?: boolean;
  isEditingLead?: boolean;
};

export function InvoiceCard({ orders, orderType, addOns, setAddOns, discounts, setDiscounts, payments, setPayments, onGrandTotalChange, onBalanceChange, isReadOnly, isEditingLead }: InvoiceCardProps) {
  
  const firestore = useFirestore();
  const pricingConfigRef = useMemoFirebase(
      () => (firestore ? doc(firestore, 'pricing', 'default') : null),
      [firestore]
  );
  const { data: fetchedConfig } = useDoc<PricingConfig>(pricingConfigRef);

  const pricingConfig = useMemo(() => {
      if (fetchedConfig) return fetchedConfig;
      return initialPricingConfig as PricingConfig;
  }, [fetchedConfig]);

  const [removingAddOn, setRemovingAddOn] = useState<{ groupKey: string; addOnType: keyof AddOns; } | null>(null);
  const [removedFees, setRemovedFees] = useState<Record<string, { logo?: boolean; backText?: boolean }>>({});
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const lastAddedPayment = useMemo(() => {
    // Only consider a payment editable if it was just added in this session.
    const allPayments = Object.values(payments).flat();
    return allPayments.find(p => p.isNew);
  }, [payments]);


  const groupedOrders = useMemo(() => {
    return orders.reduce((acc, order) => {
      const isClientOwned = order.productType === 'Client Owned';
      const isPatches = order.productType === 'Patches';
      const productGroup = getProductGroup(order.productType, pricingConfig);
      
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
  }, [orders, pricingConfig]);

  const grandTotal = useMemo(() => {
    let total = 0;
    Object.entries(groupedOrders).forEach(([groupKey, groupData]) => {
      const isClientOwned = groupData.productType === 'Client Owned';
      const isPatches = groupData.productType === 'Patches';
      const patchPrice = isPatches ? groupData.orders[0]?.pricePerPatch || 0 : 0;
      const unitPrice = getUnitPrice(groupData.productType, groupData.totalQuantity, groupData.embroidery, pricingConfig, patchPrice, orderType);
      const { logoFee: initialLogoFee, backTextFee: initialBackTextFee } = getProgrammingFees(groupData.totalQuantity, groupData.embroidery, isClientOwned, orderType);
      
      const isLogoFeeRemoved = removedFees[groupKey]?.logo;
      const isBackTextFeeRemoved = removedFees[groupKey]?.backText;
      
      const logoFee = !isLogoFeeRemoved ? initialLogoFee : 0;
      const backTextFee = !isBackTextFeeRemoved ? initialBackTextFee : 0;

      let subtotal = groupData.totalQuantity * unitPrice;

      
      const groupAddOns = { backLogo: 0, names: 0, plusSize: 0, rushFee: 0, shippingFee: 0, logoProgramming: 0, backDesignProgramming: 0, holdingFee: 0, ...(addOns[groupKey] || {}) };
      const groupDiscount = discounts[groupKey];
      const itemTotalQuantity = groupData.totalQuantity;

      const backLogoPrice = getAddOnPrice('backLogo', itemTotalQuantity, pricingConfig);
      const namesPrice = getAddOnPrice('names', itemTotalQuantity, pricingConfig);
      const plusSizePrice = getAddOnPrice('plusSize', itemTotalQuantity, pricingConfig);

      subtotal += (groupAddOns.backLogo || 0) * backLogoPrice;
      subtotal += (groupAddOns.names || 0) * namesPrice;
      subtotal += (groupAddOns.plusSize || 0) * plusSizePrice;
      subtotal += (groupAddOns.rushFee || 0);
      subtotal += (groupAddOns.shippingFee || 0);
      subtotal += (groupAddOns.logoProgramming || 0);
      subtotal += (groupAddOns.backDesignProgramming || 0);
      subtotal += (groupAddOns.holdingFee || 0);
      
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
  }, [groupedOrders, addOns, discounts, orderType, removedFees, pricingConfig]);
  
  const totalPaid = useMemo(() => {
    return Object.values(payments).flat().reduce((sum, payment) => sum + payment.amount, 0);
  }, [payments]);

  const balance = grandTotal - totalPaid;

  useEffect(() => {
    onGrandTotalChange(grandTotal);
  }, [grandTotal, onGrandTotalChange]);

  useEffect(() => {
      onBalanceChange(balance);
  }, [balance, onBalanceChange]);

  const handleConfirmRemoveAddOn = () => {
    if (!removingAddOn) return;
    const { groupKey, addOnType } = removingAddOn;
    setAddOns(prev => {
        const defaultAddOns = { backLogo: 0, names: 0, plusSize: 0, rushFee: 0, shippingFee: 0, logoProgramming: 0, backDesignProgramming: 0, holdingFee: 0 };
        const existingAddOns = { ...defaultAddOns, ...(prev[groupKey] || {}) };
        
        const newGroupAddOns = {
            ...existingAddOns,
            [addOnType]: 0,
        };

        return {
            ...prev,
            [groupKey]: newGroupAddOns,
        };
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

  const handleRemoveFee = (groupKey: string, feeType: 'logo' | 'backText') => {
    setRemovedFees(prev => ({
        ...prev,
        [groupKey]: {
            ...(prev[groupKey] || {}),
            [feeType]: true,
        }
    }));
  };

  return (
    <>
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
                const tierLabel = getTierLabel(groupData.productType, groupData.totalQuantity, groupData.embroidery, pricingConfig);
                const patchPrice = isPatches ? groupData.orders[0]?.pricePerPatch || 0 : 0;
                const unitPrice = getUnitPrice(groupData.productType, groupData.totalQuantity, groupData.embroidery, pricingConfig, patchPrice, orderType);
                const { logoFee, backTextFee } = getProgrammingFees(groupData.totalQuantity, groupData.embroidery, isClientOwned, orderType);
                const itemsSubtotal = groupData.totalQuantity * unitPrice;
                
                const groupAddOns = { backLogo: 0, names: 0, plusSize: 0, rushFee: 0, shippingFee: 0, logoProgramming: 0, backDesignProgramming: 0, holdingFee: 0, ...(addOns[groupKey] || {}) };
                const groupDiscount = discounts[groupKey];
                const itemTotalQuantity = groupData.totalQuantity;

                const backLogoPrice = getAddOnPrice('backLogo', itemTotalQuantity, pricingConfig);
                const namesPrice = getAddOnPrice('names', itemTotalQuantity, pricingConfig);
                const plusSizePrice = getAddOnPrice('plusSize', itemTotalQuantity, pricingConfig);

                const backLogoTotal = (groupAddOns.backLogo || 0) * backLogoPrice;
                const namesTotal = (groupAddOns.names || 0) * namesPrice;
                const plusSizeTotal = (groupAddOns.plusSize || 0) * plusSizePrice;

                const isLogoFeeRemoved = removedFees[groupKey]?.logo;
                const isBackTextFeeRemoved = removedFees[groupKey]?.backText;
                
                const finalLogoFee = !isLogoFeeRemoved ? logoFee : 0;
                const finalBackTextFee = !isBackTextFeeRemoved ? backTextFee : 0;

                let subtotal = itemsSubtotal + backLogoTotal + namesTotal + plusSizeTotal + (groupAddOns.rushFee || 0) + (groupAddOns.shippingFee || 0) + finalLogoFee + finalBackTextFee + (groupAddOns.logoProgramming || 0) + (groupAddOns.backDesignProgramming || 0) + (groupAddOns.holdingFee || 0);

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
                            <DiscountDialog groupKey={groupKey} discounts={discounts} setDiscounts={setDiscounts} isReadOnly={isReadOnly} />
                            <AddOnsDialog groupKey={groupKey} addOns={addOns} setAddOns={setAddOns} isReadOnly={isReadOnly} />
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
                                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => setRemovingAddOn({ groupKey, addOnType: 'backLogo' })}>
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
                                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => setRemovingAddOn({ groupKey, addOnType: 'names' })}>
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
                           {groupAddOns.plusSize > 0 && (
                            <TableRow className="group">
                                <TableCell className="py-2 px-3 text-xs text-black align-middle">
                                     <div className="flex items-center gap-2">
                                        <span>Add On: Plus Size</span>
                                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => setRemovingAddOn({ groupKey, addOnType: 'plusSize' })}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle"></TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{formatCurrency(plusSizePrice)}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">{groupAddOns.plusSize}</TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">
                                     {formatCurrency(plusSizeTotal)}
                                </TableCell>
                            </TableRow>
                           )}
                           {groupAddOns.rushFee > 0 && (
                            <TableRow className="group">
                                <TableCell className="py-2 px-3 text-xs text-black align-middle">
                                    <div className="flex items-center gap-2">
                                        <span>Add On: Rush Fee</span>
                                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => setRemovingAddOn({ groupKey, addOnType: 'rushFee' })}>
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
                             {groupAddOns.shippingFee > 0 && (
                                <TableRow className="group">
                                    <TableCell className="py-2 px-3 text-xs text-black align-middle">
                                        <div className="flex items-center gap-2">
                                            <span>Add On: Shipping Fee</span>
                                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => setRemovingAddOn({ groupKey, addOnType: 'shippingFee' })}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-xs text-center text-black align-middle" colSpan={3}></TableCell>
                                    <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">
                                        {formatCurrency(groupAddOns.shippingFee)}
                                    </TableCell>
                                </TableRow>
                            )}
                             {groupAddOns.logoProgramming > 0 && (
                                <TableRow className="group">
                                    <TableCell className="py-2 px-3 text-xs text-black align-middle">
                                        <div className="flex items-center gap-2">
                                            <span>Add On: Logo Programming</span>
                                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => setRemovingAddOn({ groupKey, addOnType: 'logoProgramming' })}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-xs text-center text-black align-middle" colSpan={3}></TableCell>
                                    <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">
                                        {formatCurrency(groupAddOns.logoProgramming)}
                                    </TableCell>
                                </TableRow>
                            )}
                            {groupAddOns.backDesignProgramming > 0 && (
                                <TableRow className="group">
                                    <TableCell className="py-2 px-3 text-xs text-black align-middle">
                                        <div className="flex items-center gap-2">
                                            <span>Add On: Back Design Programming</span>
                                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => setRemovingAddOn({ groupKey, addOnType: 'backDesignProgramming' })}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-xs text-center text-black align-middle" colSpan={3}></TableCell>
                                    <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">
                                        {formatCurrency(groupAddOns.backDesignProgramming)}
                                    </TableCell>
                                </TableRow>
                            )}
                            {groupAddOns.holdingFee > 0 && (
                                <TableRow className="group">
                                    <TableCell className="py-2 px-3 text-xs text-black align-middle">
                                        <div className="flex items-center gap-2">
                                            <span>Add On: Holding Fee</span>
                                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => setRemovingAddOn({ groupKey, addOnType: 'holdingFee' })}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-xs text-center text-black align-middle" colSpan={3}></TableCell>
                                    <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">
                                        {formatCurrency(groupAddOns.holdingFee)}
                                    </TableCell>
                                </TableRow>
                            )}
                          {logoFee > 0 && !isLogoFeeRemoved && (
                            <TableRow className="group">
                                <TableCell colSpan={4} className="py-2 px-3 text-xs text-right text-black align-middle">
                                    <div className="flex justify-end items-center gap-2">
                                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => handleRemoveFee(groupKey, 'logo')}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                        <span>One-time Logo Programming Fee</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">{formatCurrency(logoFee)}</TableCell>
                            </TableRow>
                          )}
                          {backTextFee > 0 && !isBackTextFeeRemoved && (
                             <TableRow className="group">
                                <TableCell colSpan={4} className="py-2 px-3 text-xs text-right text-black align-middle">
                                  <div className="flex justify-end items-center gap-2">
                                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => handleRemoveFee(groupKey, 'backText')}>
                                          <X className="h-3 w-3" />
                                      </Button>
                                      <span>One-time Back Text Programming Fee</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">{formatCurrency(backTextFee)}</TableCell>
                            </TableRow>
                          )}
                          {groupDiscount && (
                            <TableRow className="group">
                               <TableCell colSpan={4} className="py-1 px-3 text-right font-medium text-destructive">
                                  <div className="flex justify-end items-center gap-2">
                                    <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => handleRemoveDiscount(groupKey)}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                    <span>Discount ({groupDiscount.type === 'percentage' ? `${groupDiscount.value}%` : formatCurrency(groupDiscount.value)})</span>
                                  </div>
                                   {groupDiscount.reason && (
                                    <span className="text-xs text-gray-500 block text-right">({groupDiscount.reason})</span>
                                  )}
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
      <CardFooter className="py-2 mt-auto">
        <div className="w-full">
          <Separator />
          <div className="pt-2">
            <div className="w-full flex justify-between items-center">
              <div className="pt-2">
                {isEditingLead ? (
                    <>
                    {balance > 0 ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                // If a new payment was just added, edit it. Otherwise, add a new one.
                                const newPayment = Object.values(payments).flat().find(p => p.isNew);
                                setEditingPayment(newPayment || null);
                                setIsBalanceDialogOpen(true);
                            }}
                            disabled={isReadOnly}
                        >
                            {Object.values(payments).flat().some(p => p.isNew) ? 'Edit Payment' : 'Add Payment'}
                        </Button>
                    ) : null}
                    </>
                ) : (
                  <AddPaymentDialog grandTotal={grandTotal} setPayments={setPayments} payments={payments} isReadOnly={isReadOnly} disabled={orders.length === 0} />
                )}
              </div>
              <div className="text-right flex-1 text-lg">
                <span className="font-bold text-black">Grand Total: {formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {totalPaid > 0 ? (
              Object.values(payments).flat().map((payment, index) => {
                let description: string;
                switch (payment.type) {
                  case 'down':
                    description = 'Down Payment';
                    break;
                  case 'full':
                    description = 'Full Payment';
                    break;
                  case 'balance':
                    description = 'Balance Payment';
                    break;
                  case 'additional':
                    description = 'Additional Payment';
                    break;
                  case 'securityDeposit':
                    description = 'Security Deposit';
                    break;
                  default:
                    description = 'Payment';
                }

                return (
                  <div key={payment.id || index} className="flex justify-end items-center text-sm text-right w-full">
                      <span className="text-muted-foreground mr-2">
                        {description} {payment.mode && <span className="italic">(via {payment.mode})</span>}:
                      </span>
                      <span className="font-medium">{formatCurrency(payment.amount)}</span>
                  </div>
                )
              })
            ) : (
              <div className="flex justify-end items-center text-sm text-right w-full">
                  <span className="text-muted-foreground mr-2">Payment:</span>
                  <span className="font-medium">{formatCurrency(0)}</span>
              </div>
            )}

            <div className="flex justify-end items-center text-lg w-full">
                <span className="font-bold text-black">Balance:</span>
                <span className="font-bold text-destructive ml-2">{formatCurrency(balance)}</span>
            </div>
          </div>
        </div>
      </CardFooter>
      <AlertDialog open={!!removingAddOn} onOpenChange={(open) => !open && setRemovingAddOn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the "{
                removingAddOn?.addOnType === 'backLogo' ? 'Back Logo' : 
                removingAddOn?.addOnType === 'names' ? 'Names' :
                removingAddOn?.addOnType === 'plusSize' ? 'Plus Size' :
                removingAddOn?.addOnType === 'shippingFee' ? 'Shipping Fee' : 
                removingAddOn?.addOnType === 'logoProgramming' ? 'Logo Programming' : 
                removingAddOn?.addOnType === 'backDesignProgramming' ? 'Back Design Programming' : 
                removingAddOn?.addOnType === 'holdingFee' ? 'Holding Fee' : 'Rush Fee'
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
      <AddBalancePaymentDialog
        isOpen={isBalanceDialogOpen}
        onOpenChange={setIsBalanceDialogOpen}
        balance={balance}
        payments={payments}
        setPayments={setPayments}
        isReadOnly={isReadOnly}
        editingPayment={editingPayment}
    />
    </Card>
    </>
  );
}
