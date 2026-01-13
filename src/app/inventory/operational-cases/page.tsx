
'use client';

import { Header } from '@/components/header';
import { OperationalCasesForm } from '@/components/operational-cases-form';
import { RecordedCasesList } from '@/components/recorded-cases-list';
import { useState } from 'react';
import { useUser } from '@/firebase';
import { usePathname } from 'next/navigation';
import { hasEditPermission } from '@/lib/permissions';

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
  caseItems: any[];
  isArchived?: boolean;
  isDeleted?: boolean;
};

export default function OperationalCasesPage() {
  const [editingCase, setEditingCase] = useState<OperationalCase | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const { userProfile } = useUser();
  const pathname = usePathname();
  const canEdit = hasEditPermission(userProfile?.position as any, pathname);

  const handleEdit = (caseItem: OperationalCase) => {
    if (!canEdit) return;
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
      <Header isOperationalCasesPageDirty={isFormDirty}>
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
              <div className="lg:col-span-2 lg:sticky lg:top-24">
                   <OperationalCasesForm 
                      editingCase={editingCase}
                      onCancelEdit={handleCancelEdit}
                      onSaveComplete={handleSaveComplete}
                      onDirtyChange={setIsFormDirty}
                      isReadOnly={!canEdit}
                   />
              </div>
              <div className="lg:col-span-3">
                  <RecordedCasesList onEdit={handleEdit} isReadOnly={!canEdit} />
              </div>
          </div>
        </main>
      </Header>
    </div>
  );
}
