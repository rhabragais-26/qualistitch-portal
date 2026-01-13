'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { LeadForm } from '@/components/lead-form';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';

export default function NewOrderPage() {
  const [isFormDirty, setIsFormDirty] = useState(false);
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
        <LeadForm onDirtyChange={setIsFormDirty} />
      </Header>
    </div>
  );
}
