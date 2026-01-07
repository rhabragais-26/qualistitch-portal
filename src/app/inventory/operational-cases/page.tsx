'use client';

import { Header } from '@/components/header';
import { OperationalCasesForm } from '@/components/operational-cases-form';
import { RecordedCasesList } from '@/components/recorded-cases-list';

export default function OperationalCasesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 lg:sticky lg:top-24">
                 <OperationalCasesForm />
            </div>
            <div className="lg:col-span-2">
                <RecordedCasesList />
            </div>
        </div>
      </main>
    </div>
  );
}
