"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { LeadForm } from './lead-form';
import { InvoiceCard } from './invoice-card';
import { Order } from './lead-form';
import { AddOns, Discount, Payment } from './invoice-dialogs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import type { Lead as LeadType } from './records-table';

interface EditLeadFullDialogProps {
  lead: LeadType;
  isOpen: boolean;
  onClose: () => void;
}

export function EditLeadFullDialog({ lead, isOpen, onClose }: EditLeadFullDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [stagedOrders, setStagedOrders] = useState<Order[]>([]);
  const [orderType, setOrderType] = useState<'MTO' | 'Personalize' | 'Customize' | 'Stock Design' | 'Stock (Jacket Only)' | 'Services' | undefined>(undefined);
  const [addOns, setAddOns] = useState<Record<string, AddOns>>({});
  const [discounts, setDiscounts] = useState<Record<string, Discount>>({});
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [grandTotal, setGrandTotal] = useState(0);
  const [balance, setBalance] = useState(0);
  const [resetFormTrigger, setResetFormTrigger] = useState(0);
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
  const [leadData, setLeadData] = useState<Partial<LeadType>>({});

  useEffect(() => {
    if (lead) {
      setStagedOrders(lead.orders || []);
      setOrderType(lead.orderType as any);
      setAddOns(lead.addOns || {});
      setDiscounts(lead.discounts || {});
      const paymentsObject: Record<string, Payment[]> = {};
      if (lead.payments && lead.payments.length > 0) {
        paymentsObject['main'] = lead.payments as Payment[];
      }
      setPayments(paymentsObject);
      setGrandTotal(lead.grandTotal || 0);
      setBalance(lead.balance || 0);
      setLeadData(lead);
    }
  }, [lead]);

  const handleSave = async () => {
    if (!firestore || !lead) return;

    const form = document.getElementById('lead-form-edit') as HTMLFormElement;
    
    const formData = new FormData(form);
    const formValues: any = {};
    formData.forEach((value, key) => {
        formValues[key] = value;
    });

    const paidAmount = Object.values(payments).flat().reduce((sum, p) => sum + p.amount, 0);
    const modeOfPayment = Object.values(payments).flat().map(p => p.mode).join(', ');

    let paymentType: 'Partially Paid' | 'Fully Paid' | 'COD';
    if (paidAmount > 0) {
      paymentType = balance > 0 ? 'Partially Paid' : 'Fully Paid';
    } else {
      paymentType = 'COD';
    }

    const dataToUpdate: Partial<LeadType> = {
        ...formValues,
        orders: stagedOrders,
        addOns,
        discounts,
        payments: Object.values(payments).flat(),
        grandTotal,
        balance,
        paidAmount,
        modeOfPayment,
        paymentType,
        lastModified: new Date().toISOString()
    };
    
    const leadDocRef = doc(firestore, 'leads', lead.id);

    try {
        await updateDoc(leadDocRef, dataToUpdate);
        toast({
            title: "Lead Updated!",
            description: "The lead details have been successfully updated.",
        });
        onClose();
    } catch (e: any) {
        console.error("Error updating lead: ", e);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: e.message || "Could not update the lead.",
        });
    } finally {
        setIsConfirmSaveOpen(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-full h-[95vh] flex flex-col">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start flex-1 overflow-y-auto px-6 pt-6">
          <div className="xl:col-span-3">
             <LeadForm 
                onDirtyChange={setIsFormDirty} 
                stagedOrders={stagedOrders}
                setStagedOrders={setStagedOrders}
                resetFormTrigger={resetFormTrigger}
                onOrderTypeChange={setOrderType}
                addOns={addOns}
                discounts={discounts}
                payments={payments}
                grandTotal={grandTotal}
                balance={balance}
                isEditing={true}
                initialLeadData={lead}
            />
          </div>
          <div className="xl:col-span-2 space-y-4">
            <InvoiceCard 
                orders={stagedOrders} 
                orderType={orderType} 
                addOns={addOns}
                setAddOns={setAddOns}
                discounts={discounts}
                setDiscounts={setDiscounts}
                payments={payments}
                setPayments={setPayments}
                onGrandTotalChange={setGrandTotal}
                onBalanceChange={setBalance}
            />
          </div>
        </div>
        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button type="button" onClick={() => setIsConfirmSaveOpen(true)} disabled={!isFormDirty}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={isConfirmSaveOpen} onOpenChange={setIsConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will update the lead record with your changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
