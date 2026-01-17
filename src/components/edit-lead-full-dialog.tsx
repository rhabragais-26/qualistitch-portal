
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription as AlertDialogDescriptionComponent,
    AlertDialogHeader as AlertDialogHeaderComponent,
    AlertDialogTitle as AlertDialogTitleComponent,
    AlertDialogFooter,
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
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';


interface EditLeadFullDialogProps {
  lead: (LeadType & { orderNumber: number, totalCustomerQuantity: number; }) | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

type LeadUpdateData = FormValues & {
    stagedOrders: Order[];
    addOns: Record<string, AddOns>;
    discounts: Record<string, Discount>;
    payments: Record<string, Payment[]>;
    grandTotal: number;
    balance: number;
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
  const [dataToSave, setDataToSave] = useState<LeadUpdateData | null>(null);

  const [formKey, setFormKey] = useState(0);
  const formId = useMemo(() => `edit-lead-form-${lead?.id || 'new'}`, [lead]);

  useEffect(() => {
    if (isOpen && lead) {
      setFormKey(prev => prev + 1); // This will force re-mounting of the LeadForm
      setStagedOrders(lead.orders || []);
      
      const paymentsObject: Record<string, Payment[]> = {};
      const leadPayments = lead.payments as any;
      if (leadPayments && Array.isArray(leadPayments) && leadPayments.length > 0) {
        paymentsObject['main'] = leadPayments as Payment[];
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
        setDataToSave(null);
    }
  }, [isOpen, lead]);


  const initialFormValues = useMemo(() => {
    if (!lead) return null;
    let courierValue = lead.courier;
    if (courierValue === '-') {
        courierValue = undefined;
    }
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
        courier: courierValue,
        orderType: lead.orderType as any,
        priorityType: lead.priorityType as any,
        orders: lead.orders || [],
    };
  }, [lead]);

  
  const handleEditLeadSubmit = useCallback((values: FormValues) => {
    setDataToSave({
        ...values,
        stagedOrders,
        addOns,
        discounts,
        payments,
        grandTotal,
        balance,
    });
    setIsConfirmSaveOpen(true);
  }, [stagedOrders, addOns, discounts, payments, grandTotal, balance]);

  const handleConfirmSave = useCallback(async () => {
    if (!firestore || !lead || !dataToSave) return;

    const {
        stagedOrders: ordersToSave,
        addOns: addOnsToSave,
        discounts: discountsToSave,
        payments: paymentsToSave,
        grandTotal: totalToSave,
        balance: balanceToSave,
        ...formValuesToSave
    } = dataToSave;

    try {
        const paidAmount = Object.values(paymentsToSave).flat().reduce((sum, p) => sum + p.amount, 0);
        const modeOfPayment = Object.values(paymentsToSave).flat().map(p => p.mode).join(', ');

        let paymentType: string;
        if (paidAmount > 0) {
            paymentType = balanceToSave > 0 ? 'Partially Paid' : 'Fully Paid';
        } else {
            paymentType = 'COD';
        }
        
        const dataToUpdate = {
            ...formValuesToSave,
            customerName: toTitleCase(formValuesToSave.customerName),
            companyName: formValuesToSave.companyName ? toTitleCase(formValuesToSave.companyName) : '-',
            contactNumber: formValuesToSave.mobileNo || '-',
            landlineNumber: formValuesToSave.landlineNo || '-',
            location: formValuesToSave.isInternational ? formValuesToSave.internationalAddress : [formValuesToSave.houseStreet, formValuesToSave.barangay, formValuesToSave.city, formValuesToSave.province].filter(Boolean).map(toTitleCase).join(', '),
            houseStreet: toTitleCase(formValuesToSave.houseStreet || ''),
            barangay: toTitleCase(formValuesToSave.barangay || ''),
            city: toTitleCase(formValuesToSave.city || ''),
            province: toTitleCase(formValuesToSave.province || ''),
            orders: ordersToSave,
            productType: [...new Set(ordersToSave.map(o => o.productType))].join(', '),
            addOns: addOnsToSave,
            discounts: discountsToSave,
            payments: Object.values(paymentsToSave).flat(),
            grandTotal: totalToSave,
            balance: balanceToSave,
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
    } finally {
        setDataToSave(null);
        setIsConfirmSaveOpen(false);
    }
  }, [firestore, lead, dataToSave, onUpdate, onClose, toast]);

  const handleClose = () => {
    onClose();
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-[90vw] w-full h-[95vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 pt-6 px-6">
            <DialogTitle className="text-xl font-bold">Edit Customer Details and Orders</DialogTitle>
             <DialogDescription>
                Please change necessary details for update and make sure the data inputs are correct before saving
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start flex-1 overflow-y-auto px-6 pt-0">
              <div className="xl:col-span-3">
                  {isOpen && lead && initialFormValues && (
                    <LeadForm 
                        key={formKey}
                        formId={formId}
                        stagedOrders={stagedOrders}
                        setStagedOrders={setStagedOrders}
                        onOrderTypeChange={setOrderType}
                        onSubmit={handleEditLeadSubmit}
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
            <Button type="submit" form={formId}>Save Changes</Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={isConfirmSaveOpen} onOpenChange={setIsConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeaderComponent>
            <AlertDialogTitleComponent>Are you absolutely sure?</AlertDialogTitleComponent>
            <AlertDialogDescriptionComponent>
              This action will update the lead record with your changes.
            </AlertDialogDescriptionComponent>
          </AlertDialogHeaderComponent>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    