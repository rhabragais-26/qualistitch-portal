
'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { LeadForm, FormValues } from '@/components/lead-form';
import { InvoiceCard, AddOns, Discount, Payment } from '@/components/invoice-card';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Order } from '@/components/lead-form';
import { Button } from '@/components/ui/button';
import { CalculatorIcon, Ruler, Tag } from 'lucide-react';
import { Calculator } from '@/components/calculator';
import { SizeChartDialog } from '@/components/size-chart-dialog';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ItemPricesDialog } from '@/components/item-prices-dialog';
import { toTitleCase } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { collection, doc } from 'firebase/firestore';


export default function NewOrderPage() {
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [stagedOrders, setStagedOrders] = useState<Order[]>([]);
  const { user, userProfile, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [showCalculator, setShowCalculator] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [showItemPrices, setShowItemPrices] = useState(false);
  const [isCalculatorDragging, setIsCalculatorDragging] = useState(false);
  const [isSizeChartDragging, setIsSizeChartDragging] = useState(false);
  const [isItemPricesDragging, setIsItemPricesDragging] = useState(false);
  
  const [orderType, setOrderType] = useState<'MTO' | 'Personalize' | 'Customize' | 'Stock Design' | 'Stock (Jacket Only)' | 'Services' | undefined>(undefined);

  const [addOns, setAddOns] = useState<Record<string, AddOns>>({});
  const [discounts, setDiscounts] = useState<Record<string, Discount>>({});
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [grandTotal, setGrandTotal] = useState(0);
  const [balance, setBalance] = useState(0);

  const [resetFormTrigger, setResetFormTrigger] = useState(0);

  useEffect(() => {
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.replace('/');
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || !user || user.isAnonymous) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  const handleResetClick = () => {
    setResetFormTrigger(prev => prev + 1);
    setStagedOrders([]);
    setAddOns({});
    setDiscounts({});
    setPayments({});
    setGrandTotal(0);
    setBalance(0);
  }

  const handleNewOrderSubmit = (values: FormValues) => {
    if (!firestore || !userProfile) return;
    const leadId = uuidv4();
    const leadsRef = collection(firestore, 'leads');
    const leadDocRef = doc(leadsRef, leadId);
    const now = new Date().toISOString();
    
    const paidAmount = Object.values(payments).flat().reduce((sum, p) => sum + p.amount, 0);
    const modeOfPayment = Object.values(payments).flat().map(p => p.mode).join(', ');

    let paymentType: 'Partially Paid' | 'Fully Paid' | 'COD';
    if (paidAmount > 0) {
      if (balance > 0) {
        paymentType = 'Partially Paid';
      } else {
        paymentType = 'Fully Paid';
      }
    } else {
      paymentType = 'COD';
    }

    const submissionData = {
      id: leadId,
      customerName: toTitleCase(values.customerName),
      companyName: values.companyName ? toTitleCase(values.companyName) : '-',
      contactNumber: values.mobileNo || '-',
      landlineNumber: values.landlineNo || '-',
      isInternational: values.isInternational,
      houseStreet: values.isInternational ? '' : toTitleCase(values.houseStreet || ''),
      barangay: values.isInternational ? '' : toTitleCase(values.barangay || ''),
      city: values.isInternational ? '' : toTitleCase(values.city || ''),
      province: values.isInternational ? '' : toTitleCase(values.province || ''),
      location: values.isInternational ? values.internationalAddress : [values.houseStreet, values.barangay, values.city, values.province].filter(Boolean).map(toTitleCase).join(', '),
      courier: values.courier || '-',
      paymentType: paymentType,
      salesRepresentative: userProfile.nickname,
      scesFullName: `${userProfile.firstName} ${userProfile.lastName}`,
      orderType: values.orderType,
      priorityType: values.priorityType,
      productType: values.orders.map(o => o.productType).join(', '),
      orders: values.orders,
      submissionDateTime: now,
      lastModified: now,
      publiclyPrintable: true,
      grandTotal,
      paidAmount,
      modeOfPayment,
      balance,
      addOns,
      discounts,
      payments: Object.values(payments).flat(),
    };

    setDocumentNonBlocking(leadDocRef, submissionData, {});

    toast({
      title: 'Lead Submitted!',
      description: 'The new lead for ' + toTitleCase(values.customerName) + ' has been successfully recorded.',
    });
    
    handleResetClick();
  }

  return (
    <div className="flex flex-col min-h-screen">
      {showCalculator && <Calculator onClose={() => setShowCalculator(false)} onDraggingChange={setIsCalculatorDragging} />}
      {showSizeChart && <SizeChartDialog onClose={() => setShowSizeChart(false)} onDraggingChange={setIsSizeChartDragging} />}
      {showItemPrices && <ItemPricesDialog onClose={() => setShowItemPrices(false)} onDraggingChange={setIsItemPricesDragging} />}

      <Header isNewOrderPageDirty={isFormDirty}>
        <main className={cn("flex-1 w-full p-4 sm:p-6 lg:p-8", (isCalculatorDragging || isSizeChartDragging || isItemPricesDragging) && "select-none")}>
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
                <div className="xl:col-span-3">
                    <LeadForm 
                        onDirtyChange={setIsFormDirty} 
                        stagedOrders={stagedOrders}
                        setStagedOrders={setStagedOrders}
                        resetFormTrigger={resetFormTrigger}
                        onOrderTypeChange={setOrderType}
                        onSubmit={handleNewOrderSubmit}
                    />
                </div>
                <div className="xl:col-span-2 space-y-4">
                     <div className="flex justify-center gap-4">
                        <Button type="button" variant="outline" className="bg-gray-700 text-white hover:bg-gray-600 font-bold" onClick={() => setShowCalculator(true)}>
                            <CalculatorIcon className="mr-2 h-4 w-4" />
                            Show Calculator
                        </Button>
                        <Button type="button" variant="outline" className="bg-gray-700 text-white hover:bg-gray-600 font-bold" onClick={() => setShowSizeChart(true)}>
                            <Ruler className="mr-2 h-4 w-4" />
                            Check Size Chart
                        </Button>
                        <Button type="button" variant="outline" className="bg-gray-700 text-white hover:bg-gray-600 font-bold" onClick={() => setShowItemPrices(true)}>
                            <Tag className="mr-2 h-4 w-4" />
                            Check Item Prices
                        </Button>
                    </div>
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
                    <div className="flex justify-end pt-4 col-span-full">
                        <div className="flex gap-4">
                            <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="outline">Reset</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>This action will clear all the fields in the form.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleResetClick}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" size="lg" className="shadow-md transition-transform active:scale-95 text-white font-bold">
                                        Submit
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Please confirm that the customer information and order details are correct.
                                            {Object.keys(payments).length === 0 && (
                                                <span className="block mt-4 font-semibold text-destructive">
                                                    You have not recorded any payment. Are you sure you want to proceed as Cash on Delivery (COD)?
                                                </span>
                                            )}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => {
                                            const form = document.getElementById('lead-form');
                                            if (form) {
                                                form.requestSubmit();
                                            }
                                        }}>
                                            Confirm & Submit
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>
            </div>
        </main>
      </Header>
    </div>
  );
}
