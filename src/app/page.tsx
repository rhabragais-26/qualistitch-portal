'use client';
import { useState } from 'react';
import { Header } from '@/components/header';
import { LeadForm } from '@/components/lead-form';

export default function Home() {
  const [isFormDirty, setIsFormDirty] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Header isNewOrderPageDirty={isFormDirty} />
      <main className="flex-1 w-full flex justify-center p-4 sm:p-6 lg:p-8">
        <LeadForm onDirtyChange={setIsFormDirty} />
      </main>
    </div>
  );
}
