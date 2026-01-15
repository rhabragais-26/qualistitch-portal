

"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
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
import { Minus, Plus, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';


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
  shippingFee: number;
};

type Discount = {
  type: 'percentage' | 'fixed';
  value: number;
  reason?: string;
};

type Payment = {
  type: 'down' | 'full';
  amount: number;
  mode: string;
};


export function InvoiceCard({ orders, orderType }: InvoiceCardProps) {
  
  const [addOns, setAddOns] = useState<Record<string, AddOns>>({});
  const [discounts, setDiscounts] = useState<Record<string, Discount>>({});
  const [removingAddOn, setRemovingAddOn] = useState<{ groupKey: string; addOnType: keyof AddOns; } | null>(null);
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});

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

      
      const groupAddOns = addOns[groupKey] || { backLogo: 0, names: 0, programFeeLogo: 0, programFeeBackText: 0, rushFee: 0, shippingFee: 0 };
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
      if (groupAddOns.shippingFee > 0) {
          subtotal += groupAddOns.shippingFee;
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
  
  const totalPaid = useMemo(() => {
    return Object.values(payments).flat().reduce((sum, payment) => sum + payment.amount, 0);
  }, [payments]);

  const balance = grandTotal - totalPaid;

  const handleConfirmRemoveAddOn = () => {
    if (!removingAddOn) return;
    const { groupKey, addOnType } = removingAddOn;
    setAddOns(prev => {
      const newGroupAddOns = {
        ...(prev[groupKey] || { backLogo: 0, names: 0, programFeeLogo: 0, programFeeBackText: 0, rushFee: 0, shippingFee: 0 }),
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
                
                const groupAddOns = addOns[groupKey] || { backLogo: 0, names: 0, programFeeLogo: 0, programFeeBackText: 0, rushFee: 0, shippingFee: 0 };
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

                let subtotal = itemsSubtotal + backLogoTotal + namesTotal + programFeeLogoTotal + programFeeBackTextTotal + groupAddOns.rushFee + groupAddOns.shippingFee + logoFee + backTextFee;

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
                             {groupAddOns.shippingFee > 0 && (
                                <TableRow className="group">
                                    <TableCell className="py-2 px-3 text-xs text-black align-middle">
                                        <div className="flex items-center gap-2">
                                            <span>Add On: Shipping Fee</span>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => setRemovingAddOn({ groupKey, addOnType: 'shippingFee' })}>
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
                                  <div className="flex justify-end items-center gap-2">
                                    <span>Discount ({groupDiscount.type === 'percentage' ? `${groupDiscount.value}%` : formatCurrency(groupDiscount.value)})</span>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-transparent text-transparent group-hover:text-red-500 hover:bg-red-100" onClick={() => handleRemoveDiscount(groupKey)}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                   {groupDiscount.reason && (
                                    <span className="text-xs text-gray-500 block text-right pr-7">({groupDiscount.reason})</span>
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
      {grandTotal > 0 && (
         <CardFooter>
            <div className="w-full pt-4">
                <Separator />
                 <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center text-lg">
                      <AddPaymentDialog grandTotal={grandTotal} setPayments={setPayments} />
                      <div className="text-right">
                        <span className="font-bold text-black">Grand Total: {formatCurrency(grandTotal)}</span>
                      </div>
                    </div>
                     {totalPaid > 0 && (
                       <>
                        {Object.values(payments).flat().map((payment, index) => (
                            <div key={index} className="flex justify-end items-center text-sm">
                                <div className="text-right">
                                    <span className="text-muted-foreground mr-2">
                                        Paid ({payment.type === 'down' ? 'Down Payment' : 'Full Payment'}):
                                    </span>
                                    <span className="font-medium">{formatCurrency(payment.amount)}</span>
                                    <p className="text-xs text-muted-foreground italic">via {payment.mode}</p>
                                </div>
                            </div>
                        ))}

                        <div className="flex justify-end items-center text-lg mt-2">
                            <span className="font-bold text-black mr-2">Balance:</span>
                            <span className="font-bold text-destructive">{formatCurrency(balance)}</span>
                        </div>
                       </>
                    )}
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
                removingAddOn?.addOnType === 'programFeeBackText' ? 'Program Fee (Back Text)' :
                removingAddOn?.addOnType === 'shippingFee' ? 'Shipping Fee' : 'Rush Fee'
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
  const [localAddOns, setLocalAddOns] = useState(addOns[groupKey] || { backLogo: 0, names: 0, programFeeLogo: 0, programFeeBackText: 0, rushFee: 0, shippingFee: 0 });
  const [rushFeeInput, setRushFeeInput] = useState('');
  const [shippingFeeInput, setShippingFeeInput] = useState('');

  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen && cardRef.current) {
      const { offsetWidth, offsetHeight } = cardRef.current;
      const centerX = window.innerWidth / 2 - offsetWidth / 2;
      const centerY = window.innerHeight / 2 - offsetHeight / 2;
      setPosition({ x: centerX, y: centerY });
    }
  }, [isOpen]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (headerRef.current?.contains(e.target as Node)) {
        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
    }
  }, [position.x, position.y]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
      });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);


  const handleSave = () => {
    setAddOns(prev => ({ ...prev, [groupKey]: localAddOns }));
    setIsOpen(false);
  };
  
  const handleQuantityChange = (type: keyof Omit<AddOns, 'rushFee' | 'shippingFee'>, change: number) => {
    setLocalAddOns(prev => ({...prev, [type]: Math.max(0, (prev[type] || 0) + change)}));
  }

  const handleInputChange = (type: keyof Omit<AddOns, 'rushFee' | 'shippingFee'>, value: string) => {
    setLocalAddOns(prev => ({...prev, [type]: value === '' ? 0 : parseInt(value, 10) || 0}));
  }
  
  const handleCurrencyInputChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    setter: React.Dispatch<React.SetStateAction<string>>, 
    addOnType: 'rushFee' | 'shippingFee'
  ) => {
    const rawValue = e.target.value;
    setter(rawValue);
    const numericValue = parseFloat(rawValue.replace(/[^0-9.]/g, ''));
    if (!isNaN(numericValue)) {
        setLocalAddOns(prev => ({ ...prev, [addOnType]: numericValue }));
    } else {
        setLocalAddOns(prev => ({ ...prev, [addOnType]: 0 }));
    }
  };

  const handleCurrencyBlur = (
      value: string, 
      setter: React.Dispatch<React.SetStateAction<string>>, 
      numericValue: number
  ) => {
      if (value) {
          setter(new Intl.NumberFormat('en-PH').format(numericValue));
      }
  };


  useEffect(() => {
    if (isOpen) {
        const currentAddOns = addOns[groupKey] || { backLogo: 0, names: 0, programFeeLogo: 0, programFeeBackText: 0, rushFee: 0, shippingFee: 0 };
        setLocalAddOns(currentAddOns);
        setRushFeeInput(currentAddOns.rushFee > 0 ? new Intl.NumberFormat('en-PH').format(currentAddOns.rushFee) : '');
        setShippingFeeInput(currentAddOns.shippingFee > 0 ? new Intl.NumberFormat('en-PH').format(currentAddOns.shippingFee) : '');
    }
  }, [isOpen, addOns, groupKey]);

  const addOnFields: { id: keyof Omit<AddOns, 'rushFee' | 'shippingFee'>, label: string }[] = [
    { id: 'backLogo', label: 'Back Logo' },
    { id: 'names', label: 'Names' },
    { id: 'programFeeLogo', label: 'Program Fee (Logo)' },
    { id: 'programFeeBackText', label: 'Program Fee (Back Text)' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if(!open) {
        setLocalAddOns(addOns[groupKey] || { backLogo: 0, names: 0, programFeeLogo: 0, programFeeBackText: 0, rushFee: 0, shippingFee: 0 });
      }
      setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2 bg-gray-700 text-white hover:bg-gray-600 font-bold">
            <Plus/>Add Ons
        </Button>
      </DialogTrigger>
       <DialogContent className="sm:max-w-md p-0" ref={cardRef} style={{ left: `${position.x}px`, top: `${position.y}px`, transform: 'none', position: 'fixed' }}>
        <div onMouseDown={handleMouseDown} ref={headerRef} className={cn("flex items-center justify-between p-2 cursor-move", isDragging && "cursor-grabbing")}>
            <div className="flex items-center">
                <GripVertical className="h-5 w-5 text-gray-500"/>
                <DialogTitle>Add Ons</DialogTitle>
            </div>
            <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7"><X className="h-4 w-4" /></Button>
            </DialogClose>
        </div>
        <div className="px-6 pb-6">
          <DialogDescription>
            Specify quantities for additional logos, names or patches.
          </DialogDescription>
        
            <div className="space-y-3 py-4 flex flex-col items-center">
                {addOnFields.map(field => (
                    <div key={field.id} className="flex items-center justify-between w-full max-w-sm">
                        <Label htmlFor={field.id} className="text-xs">{field.label}</Label>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQuantityChange(field.id, -1)}><Minus className="h-3 w-3" /></Button>
                            <Input id={field.id} type="text" value={localAddOns[field.id]} onChange={(e) => handleInputChange(field.id, e.target.value)} className="w-12 h-6 text-center text-xs" />
                            <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQuantityChange(field.id, 1)}><Plus className="h-3 w-3" /></Button>
                        </div>
                    </div>
                ))}
                <div className="flex items-center justify-between w-full max-w-sm">
                    <Label htmlFor="rushFee" className="text-xs">Rush Fee</Label>
                    <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₱</span>
                        <Input id="rushFee" type="text" value={rushFeeInput} onChange={(e) => handleCurrencyInputChange(e, setRushFeeInput, 'rushFee')} onBlur={() => handleCurrencyBlur(rushFeeInput, setRushFeeInput, localAddOns.rushFee)} className="w-28 h-6 text-right pr-2 pl-6 text-xs" />
                    </div>
                </div>
                <div className="flex items-center justify-between w-full max-w-sm">
                    <Label htmlFor="shippingFee" className="text-xs">Shipping Fee</Label>
                    <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₱</span>
                        <Input id="shippingFee" type="text" value={shippingFeeInput} onChange={(e) => handleCurrencyInputChange(e, setShippingFeeInput, 'shippingFee')} onBlur={() => handleCurrencyBlur(shippingFeeInput, setShippingFeeInput, localAddOns.shippingFee)} className="w-28 h-6 text-right pr-2 pl-6 text-xs" />
                    </div>
                </div>
            </div>
            <DialogFooter className="sm:justify-end">
                <Button onClick={handleSave}>Save</Button>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DiscountDialog({ groupKey, discounts, setDiscounts }: { groupKey: string, discounts: Record<string, Discount>, setDiscounts: React.Dispatch<React.SetStateAction<Record<string, Discount>>> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localDiscount, setLocalDiscount] = useState<Discount>(discounts[groupKey] || { type: 'percentage', value: 0, reason: '' });
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
            +Discount
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
                    "w-full text-right pr-8",
                    localDiscount.type === 'fixed' && 'pl-8'
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

function AddPaymentDialog({ grandTotal, setPayments }: { grandTotal: number; setPayments: React.Dispatch<React.SetStateAction<Record<string, Payment[]>>> }) {
  const [paymentType, setPaymentType] = useState<'down' | 'full'>('down');
  const [amount, setAmount] = useState(0);
  const [formattedAmount, setFormattedAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const isSaveDisabled = amount <= 0 || !paymentMode;


  useEffect(() => {
    if (paymentType === 'full') {
      setAmount(grandTotal);
      setFormattedAmount(new Intl.NumberFormat('en-PH').format(grandTotal));
    } else if (isOpen) { // Reset only when dialog is open and type changes to 'down'
      setAmount(0);
      setFormattedAmount('');
    }
  }, [paymentType, grandTotal, isOpen]);
  
  useEffect(() => {
    // Reset state when dialog opens
    if (isOpen) {
      setPaymentType('down');
      setAmount(0);
      setFormattedAmount('');
      setPaymentMode('');
    }
  }, [isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d.]/g, ''); // Allow dots for decimals
    const numericValue = parseFloat(rawValue);

    if (!isNaN(numericValue)) {
      setAmount(numericValue);
      setFormattedAmount(new Intl.NumberFormat('en-PH').format(numericValue));
    } else {
      setAmount(0);
      setFormattedAmount('');
    }
  };
  
  const handleSave = () => {
    const newPayment: Payment = {
        type: paymentType,
        amount: amount,
        mode: paymentMode,
    };
    const paymentKey = new Date().toISOString(); // Simple unique key for this payment
    setPayments(prev => ({...prev, [paymentKey]: [newPayment]}));
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add Payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <RadioGroup value={paymentType} onValueChange={(v: 'full' | 'down') => setPaymentType(v)} className="flex justify-center gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="down" id="down" />
              <Label htmlFor="down">Down Payment</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="full" id="full" />
              <Label htmlFor="full">Full Payment</Label>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
              <Input
                type="text"
                value={formattedAmount}
                onChange={handleAmountChange}
                className="pl-8"
                placeholder="0.00"
                readOnly={paymentType === 'full'}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Mode of Payment</Label>
            <Select onValueChange={setPaymentMode} value={paymentMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select mode of payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gcash">Gcash</SelectItem>
                <SelectItem value="Paymaya">Paymaya</SelectItem>
                <SelectItem value="Bank Transfer to BDO">Bank Transfer to BDO</SelectItem>
                <SelectItem value="Bank Transfer to BPI">Bank Transfer to BPI</SelectItem>
                <SelectItem value="Bank Transfer to ChinaBank">Bank Transfer to ChinaBank</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaveDisabled}>Save Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}





    