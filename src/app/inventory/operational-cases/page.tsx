'use client';

import { Header } from '@/components/header';
import { OperationalCasesForm } from '@/components/operational-cases-form';
import { RecordedCasesList } from '@/components/recorded-cases-list';

export default function OperationalCasesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="lg:sticky lg:top-24">
                 <OperationalCasesForm />
            </div>
            <div>
                <RecordedCasesList />
            </div>
        </div>
      </main>
    </div>
  );
}
