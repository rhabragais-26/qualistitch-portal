
"use client";

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as ShadTableFooter } from '@/components/ui/table';
import { getProductGroup, getUnitPrice, getProgrammingFees, type EmbroideryOption, getAddOnPrice, type PricingConfig, getTierLabel } from '@/lib/pricing';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { AddOns, Discount, Payment } from "./invoice-dialogs";
import { AddOnsDialog, DiscountDialog, AddPaymentDialog, AddBalancePaymentDialog } from './invoice-dialogs';
import { formatCurrency } from '@/lib/utils';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { initialPricingConfig } from '@/lib/pricing-data';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/form-schemas';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';


type InvoiceCardProps = {
  orders: Order[];
  orderType?: 'MTO' | 'Personalize' | 'Customize' | 'Stock Design' | 'Stock (Jacket Only)' | 'Services' | 'Item Sample';
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
  isQuotationMode?: boolean;
  removedFees?: Record<string, { logo?: boolean; backText?: boolean }>;
  setRemovedFees?: React.Dispatch<React.SetStateAction<Record<string, { logo?: boolean; backText?: boolean }>>>;
};

export function InvoiceCard({ orders, orderType, addOns, setAddOns, discounts, setDiscounts, payments, setPayments, onGrandTotalChange, onBalanceChange, isReadOnly, isEditingLead, isQuotationMode = false, removedFees: removedFeesProp, setRemovedFees: setRemovedFeesProp }: InvoiceCardProps) {
  
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
  
  const [internalRemovedFees, setInternalRemovedFees] = useState<Record<string, { logo?: boolean; backText?: boolean }>>({});
  const removedFees = removedFeesProp !== undefined ? removedFeesProp : internalRemovedFees;
  const setRemovedFees = setRemovedFeesProp !== undefined ? setRemovedFeesProp : setInternalRemovedFees;

  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const [editedUnitPrices, setEditedUnitPrices] = useState<Record<string, number>>({});
  const [editingUnitPriceKey, setEditingUnitPriceKey] = useState<string | null>(null);
  
  const [editedAddOnPrices, setEditedAddOnPrices] = useState<Record<string, number>>({});
  const [editingAddOnPriceKey, setEditingAddOnPriceKey] = useState<string | null>(null);

  // New state for editing programming fees
  const [editedProgrammingFees, setEditedProgrammingFees] = useState<Record<string, { logoFee?: number; backTextFee?: number }>>({});
  const [editingFeeKey, setEditingFeeKey] = useState<string | null>(null);


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

      const embroidery = order.embroidery || 'logo';
      const groupKey = `${order.productType}-${embroidery}`;
      if (!acc[groupKey]) {
        acc[groupKey] = {
          productType: order.productType,
          embroidery: embroidery,
          orders: [],
          totalQuantity: 0,
        };
      }
      acc[groupKey].orders.push(order);
      acc[groupKey].totalQuantity += order.quantity;
      return acc;
    }, {} as Record<string, { productType: string; embroidery: EmbroideryOption; orders: Order[], totalQuantity: number }>);
  }, [orders, pricingConfig]);

  const handleUnitPriceChange = (groupKey: string, newPrice: number) => {
    setEditedUnitPrices(prev => ({
      ...prev,
      [groupKey]: newPrice,
    }));
  };

  const handleEditUnitPrice = (groupKey: string) => {
    if (!isReadOnly) {
        setEditingUnitPriceKey(groupKey);
    }
  };

  const handleStopEditingUnitPrice = (groupKey: string, e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
    const rawValue = (e.target as HTMLInputElement).value;
    const sanitizedValue = rawValue.replace(/[₱,]/g, '');
    const numericValue = parseFloat(sanitizedValue);
    if (!isNaN(numericValue)) {
      handleUnitPriceChange(groupKey, numericValue);
    }
    setEditingUnitPriceKey(null);
  };
  
  const handleAddOnPriceChange = (key: string, newPrice: number) => {
    setEditedAddOnPrices(prev => ({
        ...prev,
        [key]: newPrice,
    }));
  };

  const handleEditAddOnPrice = (key: string) => {
      if (!isReadOnly) {
          setEditingAddOnPriceKey(key);
      }
  };

  const handleStopEditingAddOnPrice = (key: string, e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
      const rawValue = (e.target as HTMLInputElement).value;
      const sanitizedValue = rawValue.replace(/[₱,]/g, '');
      const numericValue = parseFloat(sanitizedValue);
      if (!isNaN(numericValue)) {
        handleAddOnPriceChange(key, numericValue);
      }
      setEditingAddOnPriceKey(null);
  };

  // Handlers for programming fees
  const handleFeeChange = (groupKey: string, feeType: 'logoFee' | 'backTextFee', newPrice: number) => {
    setEditedProgrammingFees(prev => ({
        ...prev,
        [groupKey]: {
            ...(prev[groupKey] || {}),
            [feeType]: newPrice,
        },
    }));
  };

  const handleEditFee = (key: string) => {
      if (!isReadOnly) {
          setEditingFeeKey(key);
      }
  };

  const handleStopEditingFee = (groupKey: string, feeType: 'logoFee' | 'backTextFee', e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
      const rawValue = (e.target as HTMLInputElement).value;
      const sanitizedValue = rawValue.replace(/[₱,]/g, '');
      const numericValue = parseFloat(sanitizedValue);
      if (!isNaN(numericValue)) {
        handleFeeChange(groupKey, feeType, numericValue);
      }
      setEditingFeeKey(null);
  };


  const grandTotal = useMemo(() => {
    let total = 0;
    Object.entries(groupedOrders).forEach(([groupKey, groupData]) => {
      const isClientOwned = groupData.productType === 'Client Owned';
      const isPatches = groupData.productType === 'Patches';
      const embroidery = groupData.embroidery || 'logo';
      
      const calculatedUnitPrice = getUnitPrice(groupData.productType, groupData.totalQuantity, embroidery, pricingConfig, isPatches ? groupData.orders[0]?.pricePerPatch || 0 : 0, orderType);
      const unitPrice = orderType === 'Item Sample' ? 0 : (editedUnitPrices[groupKey] ?? calculatedUnitPrice);

      const { logoFee: initialLogoFee, backTextFee: initialBackTextFee } = getProgrammingFees(groupData.totalQuantity, embroidery, isClientOwned, orderType);
      const itemsSubtotal = groupData.totalQuantity * unitPrice;
      
      const groupAddOns = { backLogo: 0, names: 0, plusSize: 0, rushFee: 0, shippingFee: 0, logoProgramming: 0, backDesignProgramming: 0, holdingFee: 0, ...(addOns[groupKey] || {}) };
      const groupDiscount = discounts[groupKey];
      const itemTotalQuantity = groupData.totalQuantity;

      const backLogoPriceKey = `${groupKey}-backLogo`;
      const namesPriceKey = `${groupKey}-names`;
      const plusSizePriceKey = `${groupKey}-plusSize`;

      const backLogoPrice = orderType === 'Item Sample' ? 0 : (editedAddOnPrices[backLogoPriceKey] ?? getAddOnPrice('backLogo', itemTotalQuantity, pricingConfig));
      const namesPrice = orderType === 'Item Sample' ? 0 : (editedAddOnPrices[namesPriceKey] ?? getAddOnPrice('names', itemTotalQuantity, pricingConfig));
      const plusSizePrice = orderType === 'Item Sample' ? 0 : (editedAddOnPrices[plusSizePriceKey] ?? getAddOnPrice('plusSize', itemTotalQuantity, pricingConfig));

      const backLogoTotal = (groupAddOns.backLogo || 0) * backLogoPrice;
      const namesTotal = (groupAddOns.names || 0) * namesPrice;
      const plusSizeTotal = (groupAddOns.plusSize || 0) * plusSizePrice;

      const isLogoFeeRemoved = removedFees[groupKey]?.logo;
      const isBackTextFeeRemoved = removedFees[groupKey]?.backText;
      
      const editedFees = editedProgrammingFees[groupKey];
      const finalLogoFee = orderType === 'Item Sample' ? 0 : (editedFees?.logoFee !== undefined ? editedFees.logoFee : (!isLogoFeeRemoved ? initialLogoFee : 0));
      const finalBackTextFee = orderType === 'Item Sample' ? 0 : (editedFees?.backTextFee !== undefined ? editedFees.backTextFee : (!isBackTextFeeRemoved ? initialBackTextFee : 0));

      let subtotal = itemsSubtotal + backLogoTotal + namesTotal + plusSizeTotal + finalLogoFee + finalBackTextFee;
      
      subtotal += orderType === 'Item Sample' ? 0 : (groupAddOns.rushFee || 0);
      subtotal += orderType === 'Item Sample' ? 0 : (groupAddOns.shippingFee || 0);
      subtotal += orderType === 'Item Sample' ? 0 : (groupAddOns.logoProgramming || 0);
      subtotal += orderType === 'Item Sample' ? 0 : (groupAddOns.backDesignProgramming || 0);
      subtotal += orderType === 'Item Sample' ? 0 : (groupAddOns.holdingFee || 0);

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
  }, [groupedOrders, addOns, discounts, orderType, removedFees, pricingConfig, editedUnitPrices, editedAddOnPrices, editedProgrammingFees]);
  
  const totalPaid = useMemo(() => {
    return Object.values(payments).flat().reduce((sum, payment) => sum + payment.amount, 0);
  }, [payments]);

  const balance = useMemo(() => {
    const calculatedBalance = grandTotal - totalPaid;
    const isSecurityDepositPresent = Object.values(payments).flat().some(p => p.type === 'securityDeposit');

    if (orderType === 'Item Sample' && isSecurityDepositPresent && calculatedBalance < 0) {
      return 0;
    }
    return calculatedBalance;
  }, [grandTotal, totalPaid, payments, orderType]);

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
    <Card className={cn("shadow-xl animate-in fade-in-50 duration-500 bg-white text-black", !isQuotationMode && "h-full flex flex-col")}>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="font-headline text-xl">Pricing Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className={cn(isQuotationMode ? 'max-h-[50vh]' : 'h-[calc(100vh-32rem)]', 'pr-4')}>
          {Object.keys(groupedOrders).length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Add orders to see the price summary.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedOrders).map(([groupKey, groupData]) => {
                const isClientOwned = groupData.productType === 'Client Owned';
                const isPatches = groupData.productType === 'Patches';
                const embroidery = groupData.embroidery || 'logo';
                const tierLabel = getTierLabel(groupData.productType, groupData.totalQuantity, embroidery, pricingConfig);
                
                const calculatedUnitPrice = getUnitPrice(groupData.productType, groupData.totalQuantity, embroidery, pricingConfig, isPatches ? groupData.orders[0]?.pricePerPatch || 0 : 0, orderType);
                const unitPrice = editedUnitPrices[groupKey] ?? calculatedUnitPrice;
                
                const { logoFee: initialLogoFee, backTextFee: initialBackTextFee } = getProgrammingFees(groupData.totalQuantity, embroidery, isClientOwned, orderType);
                const itemsSubtotal = groupData.totalQuantity * unitPrice;
                
                const groupAddOns = { backLogo: 0, names: 0, plusSize: 0, rushFee: 0, shippingFee: 0, logoProgramming: 0, backDesignProgramming: 0, holdingFee: 0, ...(addOns[groupKey] || {}) };
                const groupDiscount = discounts[groupKey];
                const itemTotalQuantity = groupData.totalQuantity;

                const backLogoPriceKey = `${groupKey}-backLogo`;
                const namesPriceKey = `${groupKey}-names`;
                const plusSizePriceKey = `${groupKey}-plusSize`;

                const backLogoPrice = orderType === 'Item Sample' ? 0 : (editedAddOnPrices[backLogoPriceKey] ?? getAddOnPrice('backLogo', itemTotalQuantity, pricingConfig));
                const namesPrice = orderType === 'Item Sample' ? 0 : (editedAddOnPrices[namesPriceKey] ?? getAddOnPrice('names', itemTotalQuantity, pricingConfig));
                const plusSizePrice = orderType === 'Item Sample' ? 0 : (editedAddOnPrices[plusSizePriceKey] ?? getAddOnPrice('plusSize', itemTotalQuantity, pricingConfig));

                const backLogoTotal = (groupAddOns.backLogo || 0) * backLogoPrice;
                const namesTotal = (groupAddOns.names || 0) * namesPrice;
                const plusSizeTotal = (groupAddOns.plusSize || 0) * plusSizePrice;

                const isLogoFeeRemoved = removedFees[groupKey]?.logo;
                const isBackTextFeeRemoved = removedFees[groupKey]?.backText;
                
                const editedFees = editedProgrammingFees[groupKey];
                const finalLogoFee = orderType === 'Item Sample' ? 0 : (editedFees?.logoFee !== undefined ? editedFees.logoFee : (!isLogoFeeRemoved ? initialLogoFee : 0));
                const finalBackTextFee = orderType === 'Item Sample' ? 0 : (editedFees?.backTextFee !== undefined ? editedFees.backTextFee : (!isBackTextFeeRemoved ? initialBackTextFee : 0));

                let subtotal = itemsSubtotal + backLogoTotal + namesTotal + plusSizeTotal + finalLogoFee + finalBackTextFee;

                subtotal += orderType === 'Item Sample' ? 0 : (groupAddOns.rushFee || 0);
                subtotal += orderType === 'Item Sample' ? 0 : (groupAddOns.shippingFee || 0);
                subtotal += orderType === 'Item Sample' ? 0 : (groupAddOns.logoProgramming || 0);
                subtotal += orderType === 'Item Sample' ? 0 : (groupAddOns.backDesignProgramming || 0);
                subtotal += orderType === 'Item Sample' ? 0 : (groupAddOns.holdingFee || 0);

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
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">
                                    {editingUnitPriceKey === groupKey ? (
                                      <div className="relative flex items-center justify-center">
                                        <span className="absolute left-3 text-muted-foreground">₱</span>
                                        <Input
                                          type="text"
                                          defaultValue={unitPrice ? new Intl.NumberFormat('en-US').format(unitPrice) : ''}
                                          autoFocus
                                          onBlur={(e) => handleStopEditingUnitPrice(groupKey, e)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleStopEditingUnitPrice(groupKey, e);
                                            }
                                            if (e.key === 'Escape') {
                                                setEditingUnitPriceKey(null);
                                            }
                                          }}
                                          className="w-24 h-7 text-xs pl-6 text-center"
                                        />
                                      </div>
                                    ) : (
                                      <div onDoubleClick={() => handleEditUnitPrice(groupKey)} className="cursor-pointer p-1 rounded-md hover:bg-gray-200">
                                        {formatCurrency(unitPrice || 0)}
                                      </div>
                                    )}
                                </TableCell>
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
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">
                                    {editingAddOnPriceKey === backLogoPriceKey ? (
                                        <div className="relative flex items-center justify-center">
                                            <span className="absolute left-3 text-muted-foreground">₱</span>
                                            <Input
                                                type="text"
                                                defaultValue={backLogoPrice ? new Intl.NumberFormat('en-US').format(backLogoPrice) : ''}
                                                autoFocus
                                                onBlur={(e) => handleStopEditingAddOnPrice(backLogoPriceKey, e)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleStopEditingAddOnPrice(backLogoPriceKey, e);
                                                    if (e.key === 'Escape') setEditingAddOnPriceKey(null);
                                                }}
                                                className="w-24 h-7 text-xs pl-6 text-center"
                                            />
                                        </div>
                                    ) : (
                                        <div onDoubleClick={() => handleEditAddOnPrice(backLogoPriceKey)} className="cursor-pointer p-1 rounded-md hover:bg-gray-200">
                                            {formatCurrency(backLogoPrice || 0)}
                                        </div>
                                    )}
                                </TableCell>
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
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">
                                    {editingAddOnPriceKey === namesPriceKey ? (
                                        <div className="relative flex items-center justify-center">
                                            <span className="absolute left-3 text-muted-foreground">₱</span>
                                            <Input
                                                type="text"
                                                defaultValue={namesPrice ? new Intl.NumberFormat('en-US').format(namesPrice) : ''}
                                                autoFocus
                                                onBlur={(e) => handleStopEditingAddOnPrice(namesPriceKey, e)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleStopEditingAddOnPrice(namesPriceKey, e);
                                                    if (e.key === 'Escape') setEditingAddOnPriceKey(null);
                                                }}
                                                className="w-24 h-7 text-xs pl-6 text-center"
                                            />
                                        </div>
                                    ) : (
                                        <div onDoubleClick={() => handleEditAddOnPrice(namesPriceKey)} className="cursor-pointer p-1 rounded-md hover:bg-gray-200">
                                            {formatCurrency(namesPrice || 0)}
                                        </div>
                                    )}
                                </TableCell>
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
                                <TableCell className="py-2 px-3 text-xs text-center text-black align-middle">
                                    {editingAddOnPriceKey === plusSizePriceKey ? (
                                        <div className="relative flex items-center justify-center">
                                            <span className="absolute left-3 text-muted-foreground">₱</span>
                                            <Input
                                                type="text"
                                                defaultValue={plusSizePrice ? new Intl.NumberFormat('en-US').format(plusSizePrice) : ''}
                                                autoFocus
                                                onBlur={(e) => handleStopEditingAddOnPrice(plusSizePriceKey, e)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleStopEditingAddOnPrice(plusSizePriceKey, e);
                                                    if (e.key === 'Escape') setEditingAddOnPriceKey(null);
                                                }}
                                                className="w-24 h-7 text-xs pl-6 text-center"
                                            />
                                        </div>
                                    ) : (
                                        <div onDoubleClick={() => handleEditAddOnPrice(plusSizePriceKey)} className="cursor-pointer p-1 rounded-md hover:bg-gray-200">
                                            {formatCurrency(plusSizePrice || 0)}
                                        </div>
                                    )}
                                </TableCell>
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
                                    {formatCurrency(orderType === 'Item Sample' ? 0 : groupAddOns.rushFee)}
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
                                        {formatCurrency(orderType === 'Item Sample' ? 0 : groupAddOns.shippingFee)}
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
                                        {formatCurrency(orderType === 'Item Sample' ? 0 : groupAddOns.logoProgramming)}
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
                                        {formatCurrency(orderType === 'Item Sample' ? 0 : groupAddOns.backDesignProgramming)}
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
                                        {formatCurrency(orderType === 'Item Sample' ? 0 : groupAddOns.holdingFee)}
                                    </TableCell>
                                </TableRow>
                            )}
                          {initialLogoFee > 0 && !isLogoFeeRemoved && (
                            <TableRow className="group">
                                <TableCell colSpan={4} className="py-2 px-3 text-xs text-right text-black align-middle">
                                    <div className="flex justify-end items-center gap-2">
                                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => handleRemoveFee(groupKey, 'logo')}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                        <span>One-time Logo Programming Fee</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">
                                    {editingFeeKey === `${groupKey}-logoFee` ? (
                                        <div className="relative flex items-center justify-end">
                                            <span className="absolute left-3 text-muted-foreground">₱</span>
                                            <Input
                                                type="text"
                                                defaultValue={finalLogoFee ? new Intl.NumberFormat('en-US').format(finalLogoFee) : ''}
                                                autoFocus
                                                onBlur={(e) => handleStopEditingFee(groupKey, 'logoFee', e)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleStopEditingFee(groupKey, 'logoFee', e);
                                                    if (e.key === 'Escape') setEditingFeeKey(null);
                                                }}
                                                className="w-24 h-7 text-xs pl-6 text-right"
                                            />
                                        </div>
                                    ) : (
                                        <div onDoubleClick={() => handleEditFee(`${groupKey}-logoFee`)} className="cursor-pointer p-1 rounded-md hover:bg-gray-200">
                                            {formatCurrency(finalLogoFee)}
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                          )}
                          {initialBackTextFee > 0 && !isBackTextFeeRemoved && (
                             <TableRow className="group">
                                <TableCell colSpan={4} className="py-2 px-3 text-xs text-right text-black align-middle">
                                  <div className="flex justify-end items-center gap-2">
                                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => handleRemoveFee(groupKey, 'backText')}>
                                          <X className="h-3 w-3" />
                                      </Button>
                                      <span>One-time Back Text Programming Fee</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right text-black align-middle">
                                    {editingFeeKey === `${groupKey}-backTextFee` ? (
                                        <div className="relative flex items-center justify-end">
                                            <span className="absolute left-3 text-muted-foreground">₱</span>
                                            <Input
                                                type="text"
                                                defaultValue={finalBackTextFee ? new Intl.NumberFormat('en-US').format(finalBackTextFee) : ''}
                                                autoFocus
                                                onBlur={(e) => handleStopEditingFee(groupKey, 'backTextFee', e)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleStopEditingFee(groupKey, 'backTextFee', e);
                                                    if (e.key === 'Escape') setEditingFeeKey(null);
                                                }}
                                                className="w-24 h-7 text-xs pl-6 text-right"
                                            />
                                        </div>
                                    ) : (
                                        <div onDoubleClick={() => handleEditFee(`${groupKey}-backTextFee`)} className="cursor-pointer p-1 rounded-md hover:bg-gray-200">
                                            {formatCurrency(finalBackTextFee)}
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                          )}
                          {groupDiscount && (
                            <TableRow className="group">
                               <TableCell colSpan={4} className="py-1 px-3 text-right font-medium text-destructive">
                                  <div className="flex justify-end items-center gap-2">
                                    <Button type="button" variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => handleRemoveDiscount(groupKey)}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                    <span>Discount {groupDiscount.reason ? `(${groupDiscount.reason})` : ''} ({groupDiscount.type === 'percentage' ? `${groupDiscount.value}%` : formatCurrency(groupDiscount.value)})</span>
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
            {isQuotationMode ? (
              <div className="w-full flex justify-end items-center text-lg">
                <span className="font-bold text-black">Grand Total: {formatCurrency(grandTotal)}</span>
              </div>
            ) : (
              <>
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
              </>
            )}
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
