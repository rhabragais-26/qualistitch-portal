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
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@/firebase';

export type AddOns = {
  backLogo: number;
  names: number;
  plusSize: number;
  rushFee: number;
  shippingFee: number;
};

export type Discount = {
  type: 'percentage' | 'fixed';
  value: number;
  reason?: string;
};

export type Payment = {
  id?: string;
  type: 'down' | 'full' | 'balance' | 'additional';
  amount: number;
  mode: string;
  processedBy?: string;
  timestamp?: string;
  verified?: boolean;
  verifiedBy?: string;
  verifiedTimestamp?: string;
};

export const AddOnsDialog = React.memo(function AddOnsDialog({
  groupKey,
  addOns,
  setAddOns,
  isReadOnly,
}: {
  groupKey: string;
  addOns: Record<string, AddOns>;
  setAddOns: React.Dispatch<React.SetStateAction<Record<string, AddOns>>>;
  isReadOnly?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [localAddOns, setLocalAddOns] = useState<AddOns>({ backLogo: 0, names: 0, plusSize: 0, rushFee: 0, shippingFee: 0 });

  useEffect(() => {
    if (isOpen) {
      setLocalAddOns({ backLogo: 0, names: 0, plusSize: 0, rushFee: 0, shippingFee: 0 });
    }
  }, [isOpen]);

  const handleSave = () => {
    setAddOns(prev => {
      const existingAddOns = prev[groupKey] || { backLogo: 0, names: 0, plusSize: 0, rushFee: 0, shippingFee: 0 };
      
      const newAddOns: AddOns = {
        backLogo: existingAddOns.backLogo + localAddOns.backLogo,
        names: existingAddOns.names + localAddOns.names,
        plusSize: existingAddOns.plusSize + localAddOns.plusSize,
        rushFee: localAddOns.rushFee > 0 ? localAddOns.rushFee : existingAddOns.rushFee,
        shippingFee: localAddOns.shippingFee > 0 ? localAddOns.shippingFee : existingAddOns.shippingFee,
      };

      return { ...prev, [groupKey]: newAddOns };
    });
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
        <Button variant="outline" size="sm" className="h-7 px-2 bg-blue-500 text-white hover:bg-blue-600 font-bold" disabled={isReadOnly}>
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

export const DiscountDialog = React.memo(function DiscountDialog({ groupKey, discounts, setDiscounts, isReadOnly }: { groupKey: string, discounts: Record<string, Discount>, setDiscounts: React.Dispatch<React.SetStateAction<Record<string, Discount>>>, isReadOnly?: boolean }) {
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
    const sanitizedValue = rawValue.replace(/[^0-9.]/g, '');

    const parts = sanitizedValue.split('.');
    if (parts.length > 2) return;

    setInputValue(sanitizedValue);
    setLocalDiscount(prev => ({ ...prev, value: parseFloat(sanitizedValue) || 0 }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if(!open) {
        setLocalDiscount(discounts[groupKey] || { type: 'percentage', value: 0, reason: '' });
      }
      setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2 bg-amber-500 text-white hover:bg-amber-600 font-bold" disabled={isReadOnly}>
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

export const AddPaymentDialog = React.memo(function AddPaymentDialog({ grandTotal, setPayments, payments, isReadOnly, disabled }: { grandTotal: number; setPayments: React.Dispatch<React.SetStateAction<Record<string, Payment[]>>>, payments: Record<string, Payment[]>, isReadOnly?: boolean, disabled?: boolean }) {
  const [paymentType, setPaymentType] = useState<'down' | 'full'>('down');
  const [amount, setAmount] = useState(0);
  const [formattedAmount, setFormattedAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const { toast } = useToast();

  const isSaveDisabled = amount <= 0 || !paymentMode || !!amountError;

  const hasPayments = useMemo(() => Object.keys(payments).length > 0 && Object.values(payments)[0].length > 0, [payments]);
  const firstPayment = useMemo(() => hasPayments ? Object.values(payments)[0][0] : null, [hasPayments, payments]);

  useEffect(() => {
    if (isOpen) {
      if (hasPayments && firstPayment) {
        setPaymentType(firstPayment.type as 'down' | 'full');
        setAmount(firstPayment.amount);
        setFormattedAmount(new Intl.NumberFormat('en-PH').format(firstPayment.amount));
        setPaymentMode(firstPayment.mode);
      } else {
        setPaymentType('down');
        setAmount(0);
        setFormattedAmount('');
        setPaymentMode('');
      }
      setAmountError(null);
    }
  }, [isOpen, hasPayments, firstPayment]);

  useEffect(() => {
    if (paymentType === 'full') {
      setAmount(grandTotal);
      setFormattedAmount(new Intl.NumberFormat('en-PH').format(grandTotal));
      setAmountError(null);
    } else if (isOpen && !hasPayments) { 
      setAmount(0);
      setFormattedAmount('');
      setAmountError(null);
    }
  }, [paymentType, grandTotal, isOpen, hasPayments]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const sanitizedValue = rawValue.replace(/[^0-9.]/g, '');
    const parts = sanitizedValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    setFormattedAmount(sanitizedValue);
    const numericValue = parseFloat(sanitizedValue);
    setAmount(isNaN(numericValue) ? 0 : numericValue);
    
    if (grandTotal > 0 && !isNaN(numericValue) && numericValue > grandTotal) {
      setAmountError(`Amount cannot exceed the total of ${formatCurrency(grandTotal)}.`);
    } else {
      setAmountError(null);
    }
  };
  
  const handleSave = () => {
    const newPayment: Payment = {
        id: uuidv4(),
        type: paymentType,
        amount: amount,
        mode: paymentMode,
    };
    const paymentKey = hasPayments ? Object.keys(payments)[0] : new Date().toISOString(); 
    setPayments({[paymentKey]: [newPayment]});
    toast({
        title: 'Payment Details Updated',
        description: `The payment of ${formatCurrency(amount)} is set.`
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={isReadOnly || disabled}>{hasPayments ? 'Edit Initial Payment' : 'Add Payment'}</Button>
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

          <div className="space-y-1">
            <Label>Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
              <Input
                type="text"
                value={formattedAmount}
                onChange={handleAmountChange}
                className={cn("pl-8", amountError && "border-destructive")}
                placeholder="0.00"
                readOnly={paymentType === 'full'}
              />
            </div>
             {amountError && <p className="text-sm text-destructive mt-1">{amountError}</p>}
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
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaveDisabled}>Save Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export const AddBalancePaymentDialog = React.memo(function AddBalancePaymentDialog({
  isOpen,
  onOpenChange,
  balance,
  payments,
  setPayments,
  isReadOnly,
}: {
  balance: number;
  payments: Record<string, Payment[]>;
  setPayments: React.Dispatch<React.SetStateAction<Record<string, Payment[]>>>;
  isReadOnly?: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const { userProfile } = useUser();
  const [paymentType, setPaymentType] = useState<'additional' | 'balance'>('additional');
  const [amount, setAmount] = useState(0);
  const [formattedAmount, setFormattedAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setPaymentType('additional');
      setAmount(0);
      setFormattedAmount('');
      setPaymentMode('');
    }
  }, [isOpen]);

  const maxAmount = balance;
  const amountError = amount > maxAmount ? `Amount cannot exceed balance of ${formatCurrency(maxAmount)}` : null;
  const isSaveDisabled = amount <= 0 || !paymentMode || !!amountError || !userProfile;

  useEffect(() => {
    if (paymentType === 'balance') {
      setAmount(balance);
      setFormattedAmount(new Intl.NumberFormat('en-PH').format(balance));
    }
  }, [paymentType, balance]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const sanitizedValue = rawValue.replace(/[^0-9.]/g, '');
    const parts = sanitizedValue.split('.');
    if (parts.length > 2) return;
    setFormattedAmount(sanitizedValue);
    const numericValue = parseFloat(sanitizedValue) || 0;
    setAmount(numericValue);
  };

  const handleSave = () => {
    if (!userProfile) {
        toast({
            variant: "destructive",
            title: "Cannot Save Payment",
            description: "User information is still loading. Please wait a moment and try again.",
        });
        return;
    }

    const newPayment: Payment = {
      id: uuidv4(),
      type: paymentType,
      amount: amount,
      mode: paymentMode,
    };
    
    setPayments(prev => {
      const newPayments = JSON.parse(JSON.stringify(prev)); // deep copy
      const paymentKey = Object.keys(newPayments)[0] || new Date().toISOString();
      if (!newPayments[paymentKey]) {
        newPayments[paymentKey] = [];
      }
      newPayments[paymentKey].push({
        ...(newPayment as any),
        processedBy: userProfile.nickname,
        timestamp: new Date().toISOString(),
      });
      return newPayments;
    });
    
    toast({
        title: "Payment Added",
        description: `${formatCurrency(amount)} via ${paymentMode} has been added.`
    });

    setPaymentType('additional');
    setAmount(0);
    setFormattedAmount('');
    setPaymentMode('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <RadioGroup value={paymentType} onValueChange={(v: 'additional' | 'balance') => setPaymentType(v)} className="flex justify-center gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="additional" id="additional" />
              <Label htmlFor="additional">Additional Payment</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="balance" id="balance" />
              <Label htmlFor="balance">Balance Payment</Label>
            </div>
          </RadioGroup>

          <div className="space-y-1">
            <Label>Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
              <Input
                type="text"
                value={formattedAmount}
                onChange={handleAmountChange}
                className={cn("pl-8", amountError && "border-destructive")}
                placeholder="0.00"
                readOnly={paymentType === 'balance'}
              />
            </div>
            {amountError && <p className="text-sm text-destructive mt-1">{amountError}</p>}
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
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaveDisabled}>Save Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
