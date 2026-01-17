"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter as AlertDialogFooterComponent,
    AlertDialogHeader as AlertDialogHeaderComponent,
    AlertDialogTitle as AlertDialogTitleComponent,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { LeadForm, FormValues } from './lead-form';
import { InvoiceCard } from './invoice-card';
import { Order } from './lead-form';
import { AddOns, Discount, Payment } from "./invoice-dialogs";
import type { Lead as LeadType } from './records-table';
import { toTitleCase } from '@/lib/utils';


interface EditLeadFullDialogProps {
  lead: (LeadType & { orderNumber: number, totalCustomerQuantity: number; }) | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function EditLeadFullDialog({ lead, isOpen, onClose, onUpdate }: EditLeadFullDialogProps) {
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
  const [formValues, setFormValues] = useState<FormValues | null>(null);

  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
        setFormKey(prev => prev + 1); // This will re-mount the form
    }
  }, [isOpen, lead]);


  const initialFormValues = useMemo(() => {
    if (!lead) return null;
    return {
        customerName: toTitleCase(lead.customerName || ''),
        companyName: lead.companyName && lead.companyName !== '-' ? toTitleCase(lead.companyName) : '',
        mobileNo: lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber : '',
        landlineNo: lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber : '',
        isInternational: lead.isInternational ?? false,
        houseStreet: lead.houseStreet ? toTitleCase(lead.houseStreet) : '',
        barangay: lead.barangay ? toTitleCase(lead.barangay) : '',
        city: lead.city ? toTitleCase(lead.city) : '',
        province: lead.province ? toTitleCase(lead.province) : '',
        internationalAddress: lead.isInternational ? lead.location : '',
        courier: lead.courier === '-' ? undefined : lead.courier,
        orderType: lead.orderType as any,
        priorityType: lead.priorityType as any,
        orders: lead.orders || [],
    };
  }, [lead]);

  useEffect(() => {
    if (isOpen && lead) {
      setStagedOrders(lead.orders || []);
      
      const paymentsObject: Record<string, Payment[]> = {};
      if (lead.payments && Array.isArray(lead.payments) && lead.payments.length > 0) {
        paymentsObject['main'] = lead.payments as Payment[];
      } else if (lead.paidAmount) {
          paymentsObject['main'] = [{
              type: lead.balance === 0 && lead.paidAmount === lead.grandTotal ? 'full' : 'down',
              amount: lead.paidAmount,
              mode: lead.modeOfPayment || 'Unknown',
          }];
      }
      setPayments(paymentsObject);
      
      setAddOns(lead.addOns || {});
      setDiscounts(lead.discounts || {});
      setGrandTotal(lead.grandTotal || 0);
      setBalance(lead.balance || 0);
      setOrderType(lead.orderType as any);
    } else if (!isOpen) {
        setStagedOrders([]);
        setOrderType(undefined);
        setAddOns({});
        setDiscounts({});
        setPayments({});
        setGrandTotal(0);
        setBalance(0);
        setFormValues(null);
    }
  }, [isOpen, lead]);
  
  const handleFormSubmit = useCallback((values: FormValues) => {
    setFormValues(values);
    setIsConfirmSaveOpen(true);
  }, []);

  const handleEditLeadSubmit = useCallback(async () => {
    if (!firestore || !lead || !formValues) return;
    
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
            ...formValues,
            customerName: toTitleCase(formValues.customerName),
            companyName: formValues.companyName ? toTitleCase(formValues.companyName) : '-',
            contactNumber: formValues.mobileNo || '-',
            landlineNumber: formValues.landlineNo || '-',
            location: formValues.isInternational ? formValues.internationalAddress : [formValues.houseStreet, formValues.barangay, formValues.city, formValues.province].filter(Boolean).map(toTitleCase).join(', '),
            houseStreet: toTitleCase(formValues.houseStreet || ''),
            barangay: toTitleCase(formValues.barangay || ''),
            city: toTitleCase(formValues.city || ''),
            province: toTitleCase(formValues.province || ''),
            isInternational: formValues.isInternational,
            orders: stagedOrders,
            productType: [...new Set(stagedOrders.map(o => o.productType))].join(', '),
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
        onUpdate();
        onClose();
    } catch (e: any) {
        console.error("Error updating lead: ", e);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: e.message || "Could not update the lead.",
        });
    }
  }, [firestore, lead, formValues, stagedOrders, payments, addOns, discounts, grandTotal, balance, onUpdate, onClose, toast]);

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-[90vw] w-full h-[95vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 pt-6 px-6">
             <DialogTitle className="text-xl">Edit Customer Details and Orders</DialogTitle>
             <DialogDescription className="sr-only">Edit Lead</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start flex-1 overflow-y-auto px-6 pt-0">
              <div className="xl:col-span-3">
                  {isOpen && lead && initialFormValues && (
                    <LeadForm 
                        key={formKey}
                        stagedOrders={stagedOrders}
                        setStagedOrders={setStagedOrders}
                        onOrderTypeChange={setOrderType}
                        onSubmit={handleFormSubmit}
                        isEditing={true}
                        initialLeadData={lead}
                        initialFormValues={initialFormValues}
                    />
                  )}
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
            <Button type="submit" form="lead-form">Save Changes</Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={isConfirmSaveOpen} onOpenChange={setIsConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeaderComponent>
            <AlertDialogTitleComponent>Are you absolutely sure?</AlertDialogTitleComponent>
            <AlertDialogDescription>
              This action will update the lead record with your changes.
            </AlertDialogDescription>
          </AlertDialogHeaderComponent>
          <AlertDialogFooterComponent>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditLeadSubmit}>Save</AlertDialogAction>
          </AlertDialogFooterComponent>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
    