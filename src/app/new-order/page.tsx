'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { LeadForm } from '@/components/lead-form';
import { type FormValues, formSchema, type Order } from '@/lib/form-schemas';
import { InvoiceCard, AddOns, Discount, Payment } from '@/components/invoice-card';
import { useUser, useFirestore, setDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CalculatorIcon, Ruler, Tag, Tv } from 'lucide-react';
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
import { RunningAdsDialog } from '@/components/running-ads-dialog';
import { formatCurrency, toTitleCase } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, query } from 'firebase/firestore';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { hasEditPermission } from '@/lib/permissions';
import { isSameDay } from 'date-fns';
import type { Lead as LeadType } from '@/components/records-table';


export default function NewOrderPage() {
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [stagedOrders, setStagedOrders] = useState<Order[]>([]);
  const { user, userProfile, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const pathname = usePathname();
  const canEdit = hasEditPermission(userProfile?.position as any, pathname);
  const [formKey, setFormKey] = useState(0);

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: allLeads } = useCollection<LeadType>(leadsQuery, undefined, { listen: false });

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [showItemPrices, setShowItemPrices] = useState(false);
  const [showRunningAds, setShowRunningAds] = useState(false);
  const [isCalculatorDragging, setIsCalculatorDragging] = useState(false);
  const [isSizeChartDragging, setIsSizeChartDragging] = useState(false);
  const [isItemPricesDragging, setIsItemPricesDragging] = useState(false);
  const [isRunningAdsDragging, setIsRunningAdsDragging] = useState(false);
  
  const [orderType, setOrderType] = useState<'MTO' | 'Personalize' | 'Customize' | 'Stock Design' | 'Stock (Jacket Only)' | 'Services' | undefined>(undefined);

  const [addOns, setAddOns] = useState<Record<string, AddOns>>({});
  const [discounts, setDiscounts] = useState<Record<string, Discount>>({});
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [grandTotal, setGrandTotal] = useState(0);
  const [balance, setBalance] = useState(0);

  const formId = "new-lead-form";

  const defaultFormValues: FormValues = {
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
    priorityType: "Regular",
    courier: undefined,
    orders: [],
  };

  const formMethods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit',
    defaultValues: defaultFormValues,
  });


  useEffect(() => {
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.replace('/');
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || !user || user.isAnonymous) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  const handleResetClick = () => {
    formMethods.reset(defaultFormValues);
    setStagedOrders([]);
    setAddOns({});
    setDiscounts({});
    setPayments({});
    setGrandTotal(0);
    setBalance(0);
    setOrderType(undefined);
    setFormKey(prev => prev + 1);
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

    const paymentsWithMeta = Object.values(payments).flat().map(payment => ({
      ...payment,
      processedBy: userProfile.nickname,
      timestamp: now,
    }));

    const submissionData = {
      id: leadId,
      customerName: toTitleCase(values.customerName),
      companyName: values.companyName ? toTitleCase(values.companyName) : '-',
      contactNumber: values.mobileNo || '-',
      contactNumber2: values.mobileNo2 || '-',
      landlineNumber: values.landlineNo || '-',
      isInternational: values.isInternational,
      houseStreet: values.isInternational ? '' : toTitleCase(values.houseStreet || ''),
      barangay: values.isInternational ? '' : toTitleCase(values.barangay || ''),
      city: values.isInternational ? '' : toTitleCase(values.city || ''),
      province: values.isInternational ? '' : toTitleCase(values.province || ''),
      location: values.isInternational ? values.internationalAddress : [[values.houseStreet, values.barangay].filter(v => !!v).map(toTitleCase).join(' '), [values.city, values.province].filter(v => !!v).map(toTitleCase).join(' ')].filter(p => !!p).join(', '),
      courier: values.courier || '-',
      paymentType: paymentType,
      salesRepresentative: userProfile.nickname,
      scesFullName: toTitleCase(`${userProfile.firstName} ${userProfile.lastName}`),
      orderType: values.orderType,
      priorityType: values.priorityType,
      productType: values.orders.map(o => o.productType).join(', '),
      orders: values.orders,
      submissionDateTime: now,
      lastModified: now,
      lastModifiedBy: userProfile.nickname,
      publiclyPrintable: true,
      grandTotal,
      paidAmount,
      modeOfPayment,
      balance,
      addOns,
      discounts,
      payments: paymentsWithMeta,
    };

    if (allLeads) {
        const today = new Date();
        const scesLeadsToday = allLeads.filter(lead => 
          lead.salesRepresentative === userProfile.nickname &&
          isSameDay(new Date(lead.submissionDateTime), today)
        );

        const previousTotalQuantity = scesLeadsToday.reduce((sum, lead) => 
          sum + lead.orders.reduce((orderSum, order) => orderSum + order.quantity, 0), 0);
        
        const previousTotalAmount = scesLeadsToday.reduce((sum, lead) => sum + (lead.grandTotal || 0), 0);

        const newOrderQuantity = values.orders.reduce((sum, order) => sum + order.quantity, 0);

        const newTotalQuantity = previousTotalQuantity + newOrderQuantity;
        const newTotalAmount = previousTotalAmount + grandTotal;

        const milestones = [100, 300, 500, 700, 1000];
        const crossedMilestone = milestones.find(m => previousTotalQuantity < m && newTotalQuantity >= m);

        if (crossedMilestone) {
          const appStateRef = doc(firestore, 'appState', 'global');
          setDocumentNonBlocking(appStateRef, {
              showConfetti: true,
              confettiTimestamp: new Date().toISOString(),
              congratsNickname: userProfile.nickname,
              congratsMessage: `Amazing work for hitting **${newTotalQuantity}** items with a total of **${formatCurrency(newTotalAmount)}** in a single day. Cheers!`,
              congratsPhotoURL: userProfile.photoURL || null,
          }, { merge: true });
        }
    }

    setDocumentNonBlocking(leadDocRef, submissionData, {});

    toast({
      title: 'Lead Submitted!',
      description: 'The new lead for ' + toTitleCase(values.customerName) + ' has been successfully recorded.',
    });
    
    handleResetClick();
    setShowSubmitConfirm(false);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {showCalculator && <Calculator onClose={() => setShowCalculator(false)} onDraggingChange={setIsCalculatorDragging} />}
      {showSizeChart && <SizeChartDialog onClose={() => setShowSizeChart(false)} onDraggingChange={setIsSizeChartDragging} />}
      {showItemPrices && <ItemPricesDialog onClose={() => setShowItemPrices(false)} onDraggingChange={setIsItemPricesDragging} />}
      {showRunningAds && <RunningAdsDialog onClose={() => setShowRunningAds(false)} onDraggingChange={setIsRunningAdsDragging} />}

      <Header isNewOrderPageDirty={isFormDirty}>
        <FormProvider {...formMethods}>
          <form id={formId} onSubmit={formMethods.handleSubmit(handleNewOrderSubmit)}>
            <main className={cn("flex-1 w-full p-4 sm:p-6 lg:p-8", (isCalculatorDragging || isSizeChartDragging || isItemPricesDragging || isRunningAdsDragging) && "select-none")}>
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
                    <div className="xl:col-span-3">
                        <LeadForm 
                            key={formKey}
                            onDirtyChange={setIsFormDirty} 
                            stagedOrders={stagedOrders}
                            setStagedOrders={setStagedOrders}
                            onOrderTypeChange={setOrderType}
                            isReadOnly={!canEdit}
                        />
                    </div>
                    <div className="xl:col-span-2 space-y-4">
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
                            isReadOnly={!canEdit}
                        />
                         {canEdit && (
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
                                <Button type="button" onClick={formMethods.handleSubmit(() => setShowSubmitConfirm(true))} size="lg" className="shadow-md transition-transform active:scale-95 text-white font-bold">
                                    Submit
                                </Button>
                                <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
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
                                            <AlertDialogAction onClick={formMethods.handleSubmit(handleNewOrderSubmit)}>
                                                Continue
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                        )}
                    </div>
                </div>
            </main>
          </form>
        </FormProvider>
      </Header>
    </div>
  );
}
