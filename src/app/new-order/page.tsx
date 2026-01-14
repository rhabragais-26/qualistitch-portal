'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { LeadForm } from '@/components/lead-form';
import { InvoiceCard } from '@/components/invoice-card';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Order } from '@/components/lead-form';
import { Button } from '@/components/ui/button';
import { CalculatorIcon, Ruler } from 'lucide-react';
import { Calculator } from '@/components/calculator';
import { SizeChartDialog } from '@/components/size-chart-dialog';
import { cn } from '@/lib/utils';

export default function NewOrderPage() {
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [stagedOrders, setStagedOrders] = useState<Order[]>([]);
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [showCalculator, setShowCalculator] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [isCalculatorDragging, setIsCalculatorDragging] = useState(false);
  const [isSizeChartDragging, setIsSizeChartDragging] = useState(false);

  useEffect(() => {
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.replace('/');
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || !user || user.isAnonymous) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {showCalculator && <Calculator onClose={() => setShowCalculator(false)} onDraggingChange={setIsCalculatorDragging} />}
      {showSizeChart && <SizeChartDialog onClose={() => setShowSizeChart(false)} onDraggingChange={setIsSizeChartDragging} />}

      <Header isNewOrderPageDirty={isFormDirty}>
        <main className={cn("flex-1 w-full p-4 sm:p-6 lg:p-8", (isCalculatorDragging || isSizeChartDragging) && "select-none")}>
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
                <div className="xl:col-span-3">
                    <LeadForm 
                        onDirtyChange={setIsFormDirty} 
                        stagedOrders={stagedOrders}
                        setStagedOrders={setStagedOrders}
                    />
                </div>
                <div className="xl:col-span-2 space-y-4">
                     <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" onClick={() => setShowCalculator(true)}>
                            <CalculatorIcon className="mr-2 h-4 w-4" />
                            Show Calculator
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowSizeChart(true)}>
                            <Ruler className="mr-2 h-4 w-4" />
                            Check Size Chart
                        </Button>
                    </div>
                    <InvoiceCard orders={stagedOrders} />
                </div>
            </div>
        </main>
      </Header>
    </div>
  );
}
