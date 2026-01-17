
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose, DialogFooter, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Minus, Plus, TicketPercent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export type AddOns = {
  backLogo: number;
  names: number;
  plusSize: number;
  programFeeLogo: number;
  programFeeBackText: number;
  rushFee: number;
  shippingFee: number;
};

export type Discount = {
  type: 'percentage' | 'fixed';
  value: number;
  reason?: string;
};

export type Payment = {
  type: 'down' | 'full';
  amount: number;
  mode: string;
};

export const AddOnsDialog = React.memo(function AddOnsDialog({
  groupKey,
  addOns,
  setAddOns,
}: {
  groupKey: string;
  addOns: Record<string, AddOns>;
  setAddOns: React.Dispatch<React.SetStateAction<Record<string, AddOns>>>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const currentAddOns = addOns[groupKey] || { backLogo: 0, names: 0, plusSize: 0, programFeeLogo: 0, programFeeBackText: 0, rushFee: 0, shippingFee: 0 };
  const [localAddOns, setLocalAddOns] = useState<AddOns>(currentAddOns);

  useEffect(() => {
    if (isOpen) {
      setLocalAddOns(addOns[groupKey] || { backLogo: 0, names: 0, plusSize: 0, programFeeLogo: 0, programFeeBackText: 0, rushFee: 0, shippingFee: 0 });
    }
  }, [isOpen, addOns, groupKey]);

  const handleSave = () => {
    setAddOns(prev => ({ ...prev, [groupKey]: localAddOns }));
    setIsOpen(false);
  };

  const handleNumericChange = (field: keyof AddOns, value: string) => {
    const numericValue = parseInt(value.replace(/[^0-9]/g, ''), 10);
    setLocalAddOns(prev => ({
        ...prev,
        [field]: isNaN(numericValue) ? 0 : numericValue
    }));
  };

  const isSaveDisabled = Object.values(localAddOns).every(val => val === 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2 bg-blue-500 text-white hover:bg-blue-600 font-bold">
          <Plus className="mr-1 h-3 w-3" />
          Add Ons
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Ons</DialogTitle>
          <DialogDescription>
            Specify quantities for additional logos, names, or fees.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="backLogo" className="text-base">Back Logo</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleNumericChange('backLogo', String(Math.max(0, localAddOns.backLogo - 1)))}><Minus className="h-4 w-4" /></Button>
              <Input id="backLogo" type="number" value={localAddOns.backLogo} onChange={(e) => handleNumericChange('backLogo', e.target.value)} className="w-16 text-center" />
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleNumericChange('backLogo', String(localAddOns.backLogo + 1))}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="names" className="text-base">Names</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleNumericChange('names', String(Math.max(0, localAddOns.names - 1)))}><Minus className="h-4 w-4" /></Button>
              <Input id="names" type="number" value={localAddOns.names} onChange={(e) => handleNumericChange('names', e.target.value)} className="w-16 text-center" />
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleNumericChange('names', String(localAddOns.names + 1))}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="plusSize" className="text-base">Plus Size</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleNumericChange('plusSize', String(Math.max(0, localAddOns.plusSize - 1)))}><Minus className="h-4 w-4" /></Button>
              <Input id="plusSize" type="number" value={localAddOns.plusSize} onChange={(e) => handleNumericChange('plusSize', e.target.value)} className="w-16 text-center" />
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleNumericChange('plusSize', String(localAddOns.plusSize + 1))}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="programFeeLogo" className="text-base">Program Fee (Logo)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black">₱</span>
              <Input id="programFeeLogo" value={localAddOns.programFeeLogo || ''} onChange={(e) => handleNumericChange('programFeeLogo', e.target.value)} className="w-32 pl-7" placeholder="0" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="programFeeBackText" className="text-base">Program Fee (Back Text)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black">₱</span>
              <Input id="programFeeBackText" value={localAddOns.programFeeBackText || ''} onChange={(e) => handleNumericChange('programFeeBackText', e.target.value)} className="w-32 pl-7" placeholder="0" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="rushFee" className="text-base">Rush Fee</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black">₱</span>
              <Input id="rushFee" value={localAddOns.rushFee || ''} onChange={(e) => handleNumericChange('rushFee', e.target.value)} className="w-32 pl-7" placeholder="0" />
            </div>
          </div>
           <div className="flex items-center justify-between">
            <Label htmlFor="shippingFee" className="text-base">Shipping Fee</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black">₱</span>
              <Input id="shippingFee" value={localAddOns.shippingFee || ''} onChange={(e) => handleNumericChange('shippingFee', e.target.value)} className="w-32 pl-7" placeholder="0" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
          <Button onClick={handleSave} disabled={isSaveDisabled}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export const DiscountDialog = React.memo(function DiscountDialog({ groupKey, discounts, setDiscounts }: { groupKey: string, discounts: Record<string, Discount>, setDiscounts: React.Dispatch<React.SetStateAction<Record<string, Discount>>> }) {
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
        <Button variant="outline" size="sm" className="h-7 px-2 bg-amber-500 text-white hover:bg-amber-600 font-bold">
            <TicketPercent className="mr-1 h-3 w-3" />
            Discount
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
});

export const AddPaymentDialog = React.memo(function AddPaymentDialog({ grandTotal, setPayments, payments }: { grandTotal: number; setPayments: React.Dispatch<React.SetStateAction<Record<string, Payment[]>>>, payments: Record<string, Payment[]> }) {
  const [paymentType, setPaymentType] = useState<'down' | 'full'>('down');
  const [amount, setAmount] = useState(0);
  const [formattedAmount, setFormattedAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const isSaveDisabled = amount <= 0 || !paymentMode;

  const hasPayments = useMemo(() => Object.keys(payments).length > 0, [payments]);
  const firstPayment = useMemo(() => hasPayments ? Object.values(payments)[0][0] : null, [hasPayments, payments]);

  useEffect(() => {
    if (isOpen) {
      if (hasPayments && firstPayment) {
        setPaymentType(firstPayment.type);
        setAmount(firstPayment.amount);
        setFormattedAmount(new Intl.NumberFormat('en-PH').format(firstPayment.amount));
        setPaymentMode(firstPayment.mode);
      } else {
        setPaymentType('down');
        setAmount(0);
        setFormattedAmount('');
        setPaymentMode('');
      }
    }
  }, [isOpen, hasPayments, firstPayment]);

  useEffect(() => {
    if (paymentType === 'full') {
      setAmount(grandTotal);
      setFormattedAmount(new Intl.NumberFormat('en-PH').format(grandTotal));
    } else if (isOpen && !hasPayments) { 
      setAmount(0);
      setFormattedAmount('');
    }
  }, [paymentType, grandTotal, isOpen, hasPayments]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^d.]/g, ''); // Allow dots for decimals
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
    const paymentKey = hasPayments ? Object.keys(payments)[0] : new Date().toISOString(); 
    setPayments({[paymentKey]: [newPayment]});
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{hasPayments ? 'Edit Payment' : 'Add Payment'}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hasPayments ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
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
                <SelectItem value="CASH">CASH</SelectItem>
                <SelectItem value="GCash (Jam)">GCash (Jam)</SelectItem>
                <SelectItem value="GCash (Jonathan)">GCash (Jonathan)</SelectItem>
                <SelectItem value="GCash (Jhun)">GCash (Jhun)</SelectItem>
                <SelectItem value="GCash (Jays)">GCash (Jays)</SelectItem>
                <SelectItem value="GCash (Tantan)">GCash (Tantan)</SelectItem>
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
});
