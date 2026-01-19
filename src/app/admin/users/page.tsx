'use client';

import { Header } from '@/components/header';
import { AdminUsersTable } from '@/components/admin-users-table';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { doc } from 'firebase/firestore';


export default function AdminUsersPage() {
  const { user, isAdmin, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      router.replace('/new-order');
    }
  }, [isUserLoading, isAdmin, router]);

  const handleTestConfetti = () => {
    if (!firestore) return;
    const appStateRef = doc(firestore, 'appState', 'global');
    setDocumentNonBlocking(appStateRef, {
        showConfetti: true,
        confettiTimestamp: new Date().toISOString(),
    }, { merge: true });
  };
  
  if (isUserLoading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
      <Header>
        <div className="p-4 sm:p-6 lg:p-8">
          <AdminUsersTable />
          <div className="mt-4 flex justify-center">
              <Button onClick={handleTestConfetti}>Test</Button>
          </div>
        </div>
      </Header>
  );
}
