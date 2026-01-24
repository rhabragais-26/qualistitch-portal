
// edit-lead-full-dialog.tsx (WITHOUT ALERTDIALOG)
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, FormProvider, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, collection } from 'firebase/firestore';
import { useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { LeadForm, FormValues, formSchema } from './lead-form';
import { InvoiceCard } from './invoice-card';
import { Order } from './lead-form';
import { AddOns, Discount, Payment } from "./invoice-dialogs";
import type { Lead as LeadType } from './records-table';
import { toTitleCase, formatJoNumber } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';


interface EditLeadFullDialogProps {
  lead: (LeadType & { orderNumber: number, totalCustomerQuantity: number; }) | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  isReadOnly?: boolean;
}

export function EditLeadFullDialog({ lead, isOpen, onClose, onUpdate, isReadOnly }: EditLeadFullDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, userProfile, isUserLoading, userError } = useUser();
  
  const [stagedOrders, setStagedOrders] = useState<Order[]>([]);
  const [orderType, setOrderType] = useState<'MTO' | 'Personalize' | 'Customize' | 'Stock Design' | 'Stock (Jacket Only)' | 'Services' | undefined>(undefined);
  const [addOns, setAddOns] = useState<Record<string, AddOns>>({});
  const [discounts, setDiscounts] = useState<Record<string, Discount>>({});
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [grandTotal, setGrandTotal] = useState(0);
  const [balance, setBalance] = useState(0);
  
  const formMethods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit',
  });
  
  const { reset, handleSubmit } = formMethods;

  const handleUpdate = useCallback(() => {
    onUpdate();
  }, [onUpdate]);

  useEffect(() => {
    if (isOpen && lead) {
      let courierValue: string | undefined = lead.courier;
      if (courierValue === '-') {
          courierValue = undefined;
      }
      const initializedOrders = (lead.orders || []).map((order: any) => ({
        ...order,
        embroidery: order.embroidery || 'logo',
      }));

      const initialFormValues = {
        customerName: toTitleCase(lead.customerName || ''),
        companyName: lead.companyName && lead.companyName !== '-' ? toTitleCase(lead.companyName) : '',
        mobileNo: lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber : '',
        mobileNo2: lead.contactNumber2 && lead.contactNumber2 !== '-' ? lead.contactNumber2 : '',
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
        orders: initializedOrders,
      };
      reset(initialFormValues);

      setStagedOrders(initializedOrders);
      
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
        reset();
        setStagedOrders([]);
        setOrderType(undefined);
        setAddOns({});
        setDiscounts({});
        setPayments({});
        setGrandTotal(0);
        setBalance(0);
    }
  }, [isOpen, lead, reset]);
  
  const onValidSubmit = () => {
    handleConfirmSave();
  };

  const onInvalidSubmit = (errors: FieldErrors<FormValues>) => {
    console.warn("Form has validation errors:", errors);
    toast({
      variant: "destructive",
      title: "Invalid Input",
      description: "Please correct the errors in the form before saving.",
    });
  };

  const handleConfirmSave = useCallback(async () => {
    if (!firestore || !lead || !userProfile) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Firebase services not ready.",
        });
        return;
    }

    const formValuesToSave = formMethods.getValues();

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
            ...formValuesToSave,
            customerName: toTitleCase(formValuesToSave.customerName),
            companyName: formValuesToSave.companyName ? toTitleCase(formValuesToSave.companyName) : '-',
            contactNumber: formValuesToSave.mobileNo || '-',
            contactNumber2: formValuesToSave.mobileNo2 || '-',
            landlineNumber: formValuesToSave.landlineNo || '-',
            location: formValuesToSave.isInternational ? formValuesToSave.internationalAddress : [[formValuesToSave.houseStreet, formValuesToSave.barangay].filter(v => !!v).map(toTitleCase).join(' '), [formValuesToSave.city, formValuesToSave.province].filter(v => !!v).map(toTitleCase).join(' ')].filter(p => !!p).join(', '),
            houseStreet: formValuesToSave.houseStreet ? toTitleCase(formValuesToSave.houseStreet) : '',
            barangay: formValuesToSave.barangay ? toTitleCase(formValuesToSave.barangay) : '', 
            city: formValuesToSave.city ? toTitleCase(formValuesToSave.city) : '',
            province: formValuesToSave.province ? toTitleCase(formValuesToSave.province) : '',
            courier: formValuesToSave.courier || '-',
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
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile?.nickname,
        };
        
        const leadDocRef = doc(firestore, 'leads', lead.id);
        await updateDoc(leadDocRef, dataToUpdate);

        const originalPaymentIds = new Set((lead.payments || []).map(p => p.id).filter(Boolean));
        const currentPayments = Object.values(payments).flat();
        const newPayments = currentPayments.filter(p => !p.id || !originalPaymentIds.has(p.id));

        if (newPayments.length > 0) {
            const cashInflowsRef = collection(firestore, 'other_cash_inflows');
            for (const payment of newPayments) {
                const docId = uuidv4();
                const inflowData = {
                    id: docId,
                    date: payment.timestamp || new Date().toISOString(),
                    customerName: lead.customerName,
                    description: `Payment for J.O. ${formatJoNumber(lead.joNumber)} (${payment.type})`,
                    amount: payment.amount,
                    paymentMode: payment.mode,
                    submittedBy: userProfile.nickname,
                    timestamp: payment.timestamp || new Date().toISOString(),
                };
                const inflowDocRef = doc(cashInflowsRef, docId);
                setDocumentNonBlocking(inflowDocRef, inflowData, {});
            }
        }
        
        toast({
            title: "Lead Updated!",
            description: "The lead details have been successfully updated.",
        });
        handleUpdate();
        onClose(); // Close the main Dialog after successful save
    } catch (e: any) {
        console.error("Error updating lead: ", e);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: e.message || "Could not update the lead.",
        });
    }
  }, [firestore, lead, handleUpdate, onClose, toast, formMethods, stagedOrders, addOns, discounts, payments, grandTotal, balance, userProfile]);

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-[90vw] w-full h-[95vh] flex flex-col">
        <FormProvider {...formMethods}>
            <form id={`edit-lead-form-${lead?.id}`} onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)} className="flex flex-col flex-1 overflow-hidden">
                <DialogHeader className="flex-shrink-0 pt-6 px-6">
                    <DialogTitle className="text-xl font-bold">Edit Customer Details and Orders</DialogTitle>
                    <DialogDescription>
                        Please change necessary details for update and make sure the data inputs are correct before saving
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start flex-1 overflow-y-auto px-6 pt-0 mt-4">
                    <div className="xl:col-span-3">
                        {isOpen && lead && (
                            <LeadForm 
                                stagedOrders={stagedOrders}
                                setStagedOrders={setStagedOrders}
                                onOrderTypeChange={setOrderType}
                                isEditing={true}
                                initialLeadData={lead}
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
                            isEditingLead={true}
                            isReadOnly={isReadOnly}
                        />
                    </div>
                </div>
                
                <DialogFooter className="mt-auto pt-4 border-t px-6 pb-6">
                    <div className="flex w-full justify-end items-center">
                        <div className="flex gap-2">
                           <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <Button 
                            type="button" 
                            form={`edit-lead-form-${lead?.id}`} 
                            onClick={handleSubmit(onValidSubmit, onInvalidSubmit)}
                            disabled={isReadOnly}
                            >
                            Save Changes
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
    </>
  );
}
