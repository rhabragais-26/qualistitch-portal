'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { LeadForm } from '@/components/lead-form';
import { QuotationCard } from '@/components/quotation-card';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Order } from '@/components/lead-form';

export default function NewOrderPage() {
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [stagedOrders, setStagedOrders] = useState<Order[]>([]);
  const { user, isUserLoading } = useUser();
  const router = useRouter();

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
      <Header isNewOrderPageDirty={isFormDirty}>
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
                <div className="xl:col-span-3">
                    <LeadForm 
                        onDirtyChange={setIsFormDirty} 
                        stagedOrders={stagedOrders}
                        setStagedOrders={setStagedOrders}
                    />
                </div>
                <div className="xl:col-span-2">
                    <QuotationCard orders={stagedOrders} />
                </div>
            </div>
        </main>
      </Header>
    </div>
  );
}
