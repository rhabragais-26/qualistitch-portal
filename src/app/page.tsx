'use client';
import { useState } from 'react';
import { Header } from '@/components/header';
import { LeadForm } from '@/components/lead-form';

export default function Home() {
  const [isFormDirty, setIsFormDirty] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Header isNewOrderPageDirty={isFormDirty}>
        <LeadForm onDirtyChange={setIsFormDirty} />
      </Header>
    </div>
  );
}
