
'use client';
import { useState } from 'react';
import { Header } from '@/components/header';
import { QuotationForm } from '@/components/quotation-form';
import { QuotationSummary } from '@/components/quotation-summary';
import { Order } from '@/components/lead-form';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AddOns, Discount } from "@/components/invoice-card";

const quotationFormSchema = z.object({
  orderType: z.enum(['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services', 'Item Sample'], {required_error: "You need to select an order type."}),
  priorityType: z.enum(['Rush', 'Regular'], {required_error: "You need to select a priority type."}),
  orders: z.array(z.any()).min(1, "Please add at least one order."),
});
export type QuotationFormValues = z.infer<typeof quotationFormSchema>;

export default function QuotationPage() {
  const [stagedOrders, setStagedOrders] = useState<Order[]>([]);
  const [orderType, setOrderType] = useState<QuotationFormValues['orderType'] | undefined>(undefined);
  const [addOns, setAddOns] = useState<Record<string, AddOns>>({});
  const [discounts, setDiscounts] = useState<Record<string, Discount>>({});
  const [grandTotal, setGrandTotal] = useState(0);

  const formMethods = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      priorityType: 'Regular',
      orders: [],
    },
  });

  return (
    <Header>
      <FormProvider {...formMethods}>
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
            <QuotationForm 
              stagedOrders={stagedOrders}
              setStagedOrders={setStagedOrders}
              onOrderTypeChange={setOrderType}
              orderType={orderType}
              addOns={addOns}
              setAddOns={setAddOns}
              discounts={discounts}
              setDiscounts={setDiscounts}
              onGrandTotalChange={setGrandTotal}
            />
            <QuotationSummary 
              orders={stagedOrders}
              orderType={orderType}
              addOns={addOns}
              discounts={discounts}
              grandTotal={grandTotal}
            />
          </div>
        </main>
      </FormProvider>
    </Header>
  );
}
