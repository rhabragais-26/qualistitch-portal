
'use client';

import { Header } from '@/components/header';
import { OperationalCasesForm } from '@/components/operational-cases-form';
import { RecordedCasesList } from '@/components/recorded-cases-list';
import { useState, Suspense } from 'react';
import { useUser } from '@/firebase';
import { usePathname, useSearchParams } from 'next/navigation';
import { hasEditPermission } from '@/lib/permissions';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

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

function OperationalCasesPageContent() {
  const searchParams = useSearchParams();
  const joNumberFromQuery = searchParams.get('joNumber');
  const sourceFromQuery = searchParams.get('source');

  const [editingCase, setEditingCase] = useState<OperationalCase | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const { userProfile } = useUser();
  const pathname = usePathname();
  const canEdit = hasEditPermission(userProfile?.position as any, pathname);
  const [imageInView, setImageInView] = useState<string | null>(null);

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
       {imageInView && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center animate-in fade-in"
          onClick={() => setImageInView(null)}
        >
          <div className="relative h-[90vh] w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image src={imageInView} alt="Enlarged Case Image" layout="fill" objectFit="contain" />
             <Button
                variant="ghost"
                size="icon"
                onClick={() => setImageInView(null)}
                className="absolute top-4 right-4 text-white hover:bg-white/10 hover:text-white"
            >
                <X className="h-6 w-6" />
                <span className="sr-only">Close image view</span>
            </Button>
          </div>
        </div>
      )}
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
                      setImageInView={setImageInView}
                      initialJoNumber={joNumberFromQuery}
                      source={sourceFromQuery}
                   />
              </div>
              <div className="lg:col-span-3">
                  <RecordedCasesList onEdit={handleEdit} isReadOnly={!canEdit} setImageInView={setImageInView}/>
              </div>
          </div>
        </main>
      </Header>
    </div>
  );
}

export default function OperationalCasesPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <OperationalCasesPageContent />
        </Suspense>
    );
}
