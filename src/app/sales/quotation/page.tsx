
'use client';
import { useState } from 'react';
import { Header } from '@/components/header';
import { QuotationForm, QuotationFormValues, quotationFormSchema } from '@/components/quotation-form';
import { QuotationSummary } from '@/components/quotation-summary';
import { Order } from '@/components/lead-form';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AddOns, Discount, Payment } from "@/components/invoice-card";

export default function QuotationPage() {
  const [stagedOrders, setStagedOrders] = useState<Order[]>([]);
  const [orderType, setOrderType] = useState<QuotationFormValues['orderType'] | undefined>(undefined);
  const [addOns, setAddOns] = useState<Record<string, AddOns>>({});
  const [discounts, setDiscounts] = useState<Record<string, Discount>>({});
  const [grandTotal, setGrandTotal] = useState(0);

  const formMethods = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      customerName: "",
      companyName: "",
      mobileNo: "",
      mobileNo2: "",
      landlineNo: "",
      isInternational: false,
      houseStreet: "",
      barangay: "",
      city: "",
      province: "",
      internationalAddress: "",
      orderType: undefined,
      priorityType: 'Regular',
      orders: [],
      courier: undefined,
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
