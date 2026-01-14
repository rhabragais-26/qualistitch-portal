'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { LeadForm } from '@/components/lead-form';
import { InvoiceCard } from '@/components/invoice-card';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Order } from '@/components/lead-form';
import { Button } from '@/components/ui/button';
import { CalculatorIcon, Ruler, Tag } from 'lucide-react';
import { Calculator } from '@/components/calculator';
import { SizeChartDialog } from '@/components/size-chart-dialog';
import { cn } from '@/lib/utils';
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

export default function NewOrderPage() {
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [stagedOrders, setStagedOrders] = useState<Order[]>([]);
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [showCalculator, setShowCalculator] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [showItemPrices, setShowItemPrices] = useState(false);
  const [isCalculatorDragging, setIsCalculatorDragging] = useState(false);
  const [isSizeChartDragging, setIsSizeChartDragging] = useState(false);
  const [isItemPricesDragging, setIsItemPricesDragging] = useState(false);

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
                    />
                </div>
                <div className="xl:col-span-2 space-y-4">
                     <div className="flex justify-center gap-4">
                        <Button type="button" variant="outline" onClick={() => setShowCalculator(true)}>
                            <CalculatorIcon className="mr-2 h-4 w-4" />
                            Show Calculator
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowSizeChart(true)}>
                            <Ruler className="mr-2 h-4 w-4" />
                            Check Size Chart
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowItemPrices(true)}>
                            <Tag className="mr-2 h-4 w-4" />
                            Check Item Prices
                        </Button>
                    </div>
                    <InvoiceCard orders={stagedOrders} />
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
                            <Button type="submit" form="lead-form" size="lg" className="shadow-md transition-transform active:scale-95 text-white font-bold">
                                Submit
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
      </Header>
    </div>
  );
}
