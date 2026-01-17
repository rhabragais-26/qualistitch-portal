"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogClose,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { LeadForm, FormValues } from './lead-form';
import { InvoiceCard } from './invoice-card';
import { Order } from './lead-form';
import { AddOns, Discount, Payment } from "./invoice-dialogs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogFooter } from './ui/alert-dialog';
import type { Lead as LeadType } from './records-table';
import { isEqual } from 'lodash';
import { toTitleCase } from '@/lib/utils';


interface EditLeadFullDialogProps {
  lead: LeadType | null;
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
  const [isAnythingDirty, setIsAnythingDirty] = useState(false);

  useEffect(() => {
    if (lead) {
      setStagedOrders(lead.orders || []);
      const paymentsObject: Record<string, Payment[]> = {};
      if (lead.payments && lead.payments.length > 0) {
        paymentsObject['main'] = lead.payments as Payment[];
      }
      setPayments(paymentsObject);
      setAddOns(lead.addOns || {});
      setDiscounts(lead.discounts || {});
      setGrandTotal(lead.grandTotal || 0);
      setBalance(lead.balance || 0);
      setOrderType(lead.orderType as any);
    }
  }, [lead]);

  useEffect(() => {
    if (!lead || !isOpen) {
        setIsAnythingDirty(false);
        return;
    }

    const ordersDirty = !isEqual(stagedOrders, lead.orders || []);
    const addOnsDirty = !isEqual(addOns, lead.addOns || {});
    const discountsDirty = !isEqual(discounts, lead.discounts || {});
    
    const leadPayments = lead.payments || [];
    const currentPayments = Object.values(payments).flat();
    const paymentsDirty = !isEqual(currentPayments, leadPayments);

    setIsAnythingDirty(isFormDirty || ordersDirty || addOnsDirty || discountsDirty || paymentsDirty);
  }, [stagedOrders, addOns, discounts, payments, lead, isFormDirty, isOpen]);

  const handleEditLeadSubmit = async (formValues: FormValues) => {
    if (!firestore || !lead) return;

    const paidAmount = Object.values(payments).flat().reduce((sum, p) => sum + p.amount, 0);
    const modeOfPayment = Object.values(payments).flat().map(p => p.mode).join(', ');

    let paymentType: 'Partially Paid' | 'Fully Paid' | 'COD';
    if (paidAmount > 0) {
      paymentType = balance > 0 ? 'Partially Paid' : 'Fully Paid';
    } else {
      paymentType = 'COD';
    }
    
    const dataToUpdate: Partial<LeadType> = {
        customerName: toTitleCase(formValues.customerName),
        companyName: formValues.companyName ? toTitleCase(formValues.companyName) : '-',
        contactNumber: formValues.mobileNo || '-',
        landlineNumber: formValues.landlineNo || '-',
        isInternational: formValues.isInternational,
        houseStreet: formValues.isInternational ? '' : toTitleCase(formValues.houseStreet || ''),
        barangay: formValues.isInternational ? '' : toTitleCase(formValues.barangay || ''),
        city: formValues.isInternational ? '' : toTitleCase(formValues.city || ''),
        province: formValues.isInternational ? '' : toTitleCase(formValues.province || ''),
        location: formValues.isInternational ? formValues.internationalAddress : [formValues.houseStreet, formValues.barangay, formValues.city, formValues.province].filter(Boolean).map(toTitleCase).join(', '),
        courier: formValues.courier || '-',
        orderType: formValues.orderType,
        priorityType: formValues.priorityType,
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
        await updateDoc(leadDocRef, dataToUpdate as any);
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
          <DialogHeader className="sr-only">
            <DialogTitle>Edit Lead: {lead?.customerName}</DialogTitle>
            <DialogDescription>
              Make changes to the lead information and order details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start flex-1 overflow-y-auto px-6 pt-0">
              <div className="xl:col-span-3">
                  <h3 className="font-headline text-xl font-bold mb-4">Edit Customer Details and Orders</h3>
                  <LeadForm 
                      onDirtyChange={setIsFormDirty} 
                      stagedOrders={stagedOrders}
                      setStagedOrders={setStagedOrders}
                      resetFormTrigger={resetFormTrigger}
                      onOrderTypeChange={setOrderType}
                      onSubmit={handleEditLeadSubmit}
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
          <Button type="button" onClick={() => setIsConfirmSaveOpen(true)} disabled={!isAnythingDirty}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={isConfirmSaveOpen} onOpenChange={setIsConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitleComponent>Are you absolutely sure?</AlertDialogTitleComponent>
            <AlertDialogDescription>
              This action will update the lead record with your changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              document.getElementById('lead-form-edit')?.requestSubmit();
            }}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
