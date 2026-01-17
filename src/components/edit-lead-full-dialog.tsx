
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogClose,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { LeadForm, FormValues } from './lead-form';
import { InvoiceCard } from './invoice-card';
import { Order } from './lead-form';
import { AddOns, Discount, Payment } from "./invoice-dialogs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogTitle as AlertDialogTitleComponent } from './ui/alert-dialog';
import type { Lead as LeadType } from './records-table';
import { toTitleCase } from '@/lib/utils';


interface EditLeadFullDialogProps {
  lead: (LeadType & { orderNumber: number, totalCustomerQuantity: number }) | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditLeadFullDialog({ lead, isOpen, onClose }: EditLeadFullDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [stagedOrders, setStagedOrders] = useState<Order[]>([]);
  const [orderType, setOrderType] = useState<'MTO' | 'Personalize' | 'Customize' | 'Stock Design' | 'Stock (Jacket Only)' | 'Services' | undefined>(undefined);
  const [addOns, setAddOns] = useState<Record<string, AddOns>>({});
  const [discounts, setDiscounts] = useState<Record<string, Discount>>({});
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [grandTotal, setGrandTotal] = useState(0);
  const [balance, setBalance] = useState(0);
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);

  useEffect(() => {
    if (lead) {
      setStagedOrders(lead.orders || []);
      const paymentsObject: Record<string, Payment[]> = {};
      if (lead.payments && lead.payments.length > 0) {
        paymentsObject['main'] = lead.payments as Payment[];
      } else {
        // Compatibility for old data structure
        if (lead.paidAmount && lead.modeOfPayment) {
            paymentsObject['main'] = [{
                type: lead.balance === 0 && lead.paidAmount === lead.grandTotal ? 'full' : 'down',
                amount: lead.paidAmount,
                mode: lead.modeOfPayment,
            }];
        }
      }
      setPayments(paymentsObject);
      setAddOns(lead.addOns || {});
      setDiscounts(lead.discounts || {});
      setGrandTotal(lead.grandTotal || 0);
      setBalance(lead.balance || 0);
      setOrderType(lead.orderType as any);
    }
  }, [lead]);

  const handleEditLeadSubmit = useCallback(async (formValues: FormValues) => {
    if (!firestore || !lead) return;
    setIsConfirmSaveOpen(false);
    
    try {
        const paidAmount = Object.values(payments).flat().reduce((sum, p) => sum + p.amount, 0);
        const modeOfPayment = Object.values(payments).flat().map(p => p.mode).join(', ');

        let paymentType: string;
        if (paidAmount > 0) {
            paymentType = balance > 0 ? 'Partially Paid' : 'Fully Paid';
        } else {
            paymentType = 'COD';
        }
        
        const dataToUpdate = {
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
            orders: formValues.orders,
            productType: [...new Set(formValues.orders.map(o => o.productType))].join(', '),
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
    }
  }, [firestore, lead, payments, addOns, discounts, grandTotal, balance, onClose, toast]);

  const handleSave = () => {
    // This will trigger the form's submit handler, which is now memoized with useCallback
    document.getElementById('lead-form-edit')?.requestSubmit();
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-full h-[95vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 pt-6 px-6">
            <DialogTitle className="sr-only">Edit Lead: {lead?.customerName}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start flex-1 overflow-y-auto px-6 pt-0">
              <div className="xl:col-span-3">
                  <LeadForm 
                      stagedOrders={stagedOrders}
                      setStagedOrders={setStagedOrders}
                      onOrderTypeChange={setOrderType}
                      onSubmit={handleEditLeadSubmit}
                      isEditing={true}
                      initialLeadData={lead}
                      onDirtyChange={() => {}} // No longer needed
                      resetFormTrigger={0} // No longer needed
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
          <DialogFooter className="mt-auto pt-4 border-t px-6 pb-6">
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={() => setIsConfirmSaveOpen(true)}>Save Changes</Button>
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
          <AlertDialogFooterComponent>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave}>Save</AlertDialogAction>
          </AlertDialogFooterComponent>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
    