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
import { Button } from '@/components/ui/button';
import { CalculatorIcon, Ruler, Tag, Tv } from 'lucide-react';
import { Calculator } from '@/components/calculator';
import { SizeChartDialog } from '@/components/size-chart-dialog';
import { ItemPricesDialog } from '@/components/item-prices-dialog';
import { RunningAdsDialog } from '@/components/running-ads-dialog';
import { cn } from '@/lib/utils';


export default function QuotationPage() {
  const [stagedOrders, setStagedOrders] = useState<Order[]>([]);
  const [orderType, setOrderType] = useState<QuotationFormValues['orderType'] | undefined>(undefined);
  const [addOns, setAddOns] = useState<Record<string, AddOns>>({});
  const [discounts, setDiscounts] = useState<Record<string, Discount>>({});
  const [grandTotal, setGrandTotal] = useState(0);
  const [removedFees, setRemovedFees] = useState<Record<string, { logo?: boolean; backText?: boolean }>>({});
  const [quotationNumber, setQuotationNumber] = useState<string | null>(null);

  const [showCalculator, setShowCalculator] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [showItemPrices, setShowItemPrices] = useState(false);
  const [showRunningAds, setShowRunningAds] = useState(false);
  const [isCalculatorDragging, setIsCalculatorDragging] = useState(false);
  const [isSizeChartDragging, setIsSizeChartDragging] = useState(false);
  const [isItemPricesDragging, setIsItemPricesDragging] = useState(false);
  const [isRunningAdsDragging, setIsRunningAdsDragging] = useState(false);

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

  const handleReset = () => {
    formMethods.reset({
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
    });
    setStagedOrders([]);
    setOrderType(undefined);
    setAddOns({});
    setDiscounts({});
    setGrandTotal(0);
    setRemovedFees({});
    setQuotationNumber(null);
  };


  return (
    <div className="flex flex-col min-h-screen">
       {showCalculator && <Calculator onClose={() => setShowCalculator(false)} onDraggingChange={setIsCalculatorDragging} />}
      {showSizeChart && <SizeChartDialog onClose={() => setShowSizeChart(false)} onDraggingChange={setIsSizeChartDragging} />}
      {showItemPrices && <ItemPricesDialog onClose={() => setShowItemPrices(false)} onDraggingChange={setIsItemPricesDragging} />}
      {showRunningAds && <RunningAdsDialog onClose={() => setShowRunningAds(false)} onDraggingChange={setIsRunningAdsDragging} />}

    <Header>
      <FormProvider {...formMethods}>
        <main className={cn("p-4 sm:p-6 lg:p-8", (isCalculatorDragging || isSizeChartDragging || isItemPricesDragging || isRunningAdsDragging) && "select-none")}>
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
              onGrandTotalChange={onGrandTotalChange}
              removedFees={removedFees}
              setRemovedFees={setRemovedFees}
            />
            <div className="space-y-4">
               <div className="flex justify-center gap-2 flex-wrap">
                  <Button type="button" variant="outline" size="sm" className="bg-gray-700 text-white hover:bg-gray-600 font-bold" onClick={() => setShowCalculator(true)}>
                      <CalculatorIcon className="mr-2 h-4 w-4" />
                      Show Calculator
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="bg-gray-700 text-white hover:bg-gray-600 font-bold" onClick={() => setShowSizeChart(true)}>
                      <Ruler className="mr-2 h-4 w-4" />
                      Check Size Chart
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="bg-gray-700 text-white hover:bg-gray-600 font-bold" onClick={() => setShowItemPrices(true)}>
                      <Tag className="mr-2 h-4 w-4" />
                      Check Item Prices
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="bg-gray-700 text-white hover:bg-gray-600 font-bold" onClick={() => setShowRunningAds(true)}>
                      <Tv className="mr-2 h-4 w-4" />
                      Check Running Ads
                  </Button>
              </div>
              <QuotationSummary 
                orders={stagedOrders}
                orderType={orderType}
                addOns={addOns}
                discounts={discounts}
                grandTotal={grandTotal}
                removedFees={removedFees}
                quotationNumber={quotationNumber}
                setQuotationNumber={setQuotationNumber}
              />
              <div className="flex justify-end">
                <Button onClick={handleReset}>Create Another Quotation</Button>
              </div>
            </div>
          </div>
        </main>
      </FormProvider>
    </Header>
    </div>
  );
}
