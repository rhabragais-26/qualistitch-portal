'use client';
import { useState } from 'react';
import { Header } from '@/components/header';
import { QuotationForm } from '@/components/quotation-form';
import { QuotationSummary } from '@/components/quotation-summary';
import { type Order } from '@/lib/form-schemas';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AddOns, Discount } from "@/components/invoice-card";
import { type QuotationFormValues, quotationFormSchema } from '@/lib/form-schemas';

export default function QuotationPage() {
  const [stagedOrders, setStagedOrders] = useState<Order[]>([]);
  const [orderType, setOrderType] = useState<QuotationFormValues['orderType'] | undefined>(undefined);
  const [addOns, setAddOns] = useState<Record<string, AddOns>>({});
  const [discounts, setDiscounts] = useState<Record<string, Discount>>({});
  const [grandTotal, setGrandTotal] = useState(0);
  const [removedFees, setRemovedFees] = useState<Record<string, { logo?: boolean; backText?: boolean }>>({});

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
              removedFees={removedFees}
              setRemovedFees={setRemovedFees}
            />
            <QuotationSummary 
              orders={stagedOrders}
              orderType={orderType}
              addOns={addOns}
              discounts={discounts}
              grandTotal={grandTotal}
              removedFees={removedFees}
            />
          </div>
        </main>
      </FormProvider>
    </Header>
  );
}
