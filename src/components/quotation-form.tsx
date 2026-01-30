

'use client';

import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeadForm } from './lead-form'; 
import { InvoiceCard, AddOns, Discount, Payment } from "./invoice-card";
import * as z from 'zod';
import { formSchema as leadFormSchema, type Order } from '@/lib/form-schemas';

// Make customer fields optional for quotation context
export const quotationFormSchema = leadFormSchema.extend({
  customerName: z.string().optional(),
  houseStreet: z.string().optional(),
  barangay: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  priorityType: z.enum(['Rush', 'Regular']).optional(),
  orderType: z.enum(['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services', 'Item Sample']).optional(),
  orders: z.array(z.any()).optional(),
});
export type QuotationFormValues = z.infer<typeof quotationFormSchema>;

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
}: QuotationFormProps) {
  const formMethods = useFormContext<QuotationFormValues>();
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [balance, setBalance] = useState(0);

  return (
    <div className="space-y-4">
      <Form {...formMethods}>
        <form id="quotation-form" onSubmit={(e) => e.preventDefault()}>
          <LeadForm
            isQuotationMode={true}
            stagedOrders={stagedOrders}
            setStagedOrders={setStagedOrders}
            onOrderTypeChange={onOrderTypeChange}
          />
        </form>
      </Form>
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
        isReadOnly={false}
      />
    </div>
  );
}
