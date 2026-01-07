'use client';

import { Header } from '@/components/header';
import { OperationalCasesForm } from '@/components/operational-cases-form';
import { RecordedCasesList } from '@/components/recorded-cases-list';
import { useState } from 'react';

type OperationalCase = {
  id: string;
  joNumber: string;
  caseType: string;
  remarks: string;
  image?: string;
  submissionDateTime: string;
  customerName: string;
  contactNumber?: string;
  landlineNumber?: string;
  quantity?: number;
  isArchived?: boolean;
  isDeleted?: boolean;
};

export default function OperationalCasesPage() {
  const [editingCase, setEditingCase] = useState<OperationalCase | null>(null);

  const handleEdit = (caseItem: OperationalCase) => {
    setEditingCase(caseItem);
    // Scroll to the form for better UX on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingCase(null);
  };
  
  const handleSaveComplete = () => {
    setEditingCase(null);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-2 lg:sticky lg:top-24">
                 <OperationalCasesForm 
                    editingCase={editingCase}
                    onCancelEdit={handleCancelEdit}
                    onSaveComplete={handleSaveComplete}
                 />
            </div>
            <div className="lg:col-span-3">
                <RecordedCasesList onEdit={handleEdit} />
            </div>
        </div>
      </main>
    </div>
  );
}
