

'use client';
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { LeadForm } from '@/components/lead-form'; 
import { InvoiceCard } from "./invoice-card";
import { AddOns, Discount, Payment } from "./invoice-dialogs";
import { type Order, type QuotationFormValues } from '@/lib/form-schemas';


type QuotationFormProps = {
  stagedOrders: Order[];
  setStagedOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  onOrderTypeChange: (orderType: QuotationFormValues['orderType'] | undefined) => void;
  orderType?: QuotationFormValues['orderType'];
  addOns: Record<string, AddOns>;
  setAddOns: React.Dispatch<React.SetStateAction<Record<string, AddOns>>>;
  discounts: Record<string, Discount>;
  setDiscounts: React.Dispatch<React.SetStateAction<Record<string, Discount>>>;
  onGrandTotalChange: (total: number) => void;
  removedFees: Record<string, { logo?: boolean; backText?: boolean }>;
  setRemovedFees: React.Dispatch<React.SetStateAction<Record<string, { logo?: boolean; backText?: boolean }>>>;
  isReadOnly?: boolean;
  editedUnitPrices: Record<string, number>;
  setEditedUnitPrices: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  editedAddOnPrices: Record<string, number>;
  setEditedAddOnPrices: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  editedProgrammingFees: Record<string, { logoFee?: number; backTextFee?: number }>;
  setEditedProgrammingFees: React.Dispatch<React.SetStateAction<Record<string, { logoFee?: number; backTextFee?: number }>>>;
};

export function QuotationForm({
  stagedOrders,
  setStagedOrders,
  onOrderTypeChange,
  orderType,
  addOns,
  setAddOns,
  discounts,
  setDiscounts,
  onGrandTotalChange,
  removedFees,
  setRemovedFees,
  isReadOnly,
  editedUnitPrices,
  setEditedUnitPrices,
  editedAddOnPrices,
  setEditedAddOnPrices,
  editedProgrammingFees,
  setEditedProgrammingFees,
}: QuotationFormProps) {
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [balance, setBalance] = useState(0);

  return (
    <div className="space-y-4">
      <form id="quotation-form" onSubmit={(e) => e.preventDefault()}>
        <LeadForm
          isQuotationMode={true}
          stagedOrders={stagedOrders}
          setStagedOrders={setStagedOrders}
          onOrderTypeChange={onOrderTypeChange}
          isReadOnly={isReadOnly}
        />
      </form>
      <InvoiceCard
        orders={stagedOrders}
        orderType={orderType}
        addOns={addOns}
        setAddOns={setAddOns}
        discounts={discounts}
        setDiscounts={setDiscounts}
        payments={payments}
        setPayments={setPayments}
        onGrandTotalChange={onGrandTotalChange}
        onBalanceChange={setBalance}
        isReadOnly={isReadOnly}
        isQuotationMode={true}
        removedFees={removedFees}
        setRemovedFees={setRemovedFees}
        editedUnitPrices={editedUnitPrices}
        setEditedUnitPrices={setEditedUnitPrices}
        editedAddOnPrices={editedAddOnPrices}
        setEditedAddOnPrices={setEditedAddOnPrices}
        editedProgrammingFees={editedProgrammingFees}
        setEditedProgrammingFees={setEditedProgrammingFees}
      />
    </div>
  );
}
