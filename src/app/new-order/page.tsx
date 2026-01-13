'use client';
import { useState } from 'react';
import { Header } from '@/components/header';
import { LeadForm } from '@/components/lead-form';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';

export default function NewOrderPage() {
  const [isFormDirty, setIsFormDirty] = useState(false);
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  if (isUserLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user || user.isAnonymous) {
    router.replace('/');
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header isNewOrderPageDirty={isFormDirty}>
        <LeadForm onDirtyChange={setIsFormDirty} />
      </Header>
    </div>
  );
}
