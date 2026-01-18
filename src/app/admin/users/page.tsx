
'use client';

import { Header } from '@/components/header';
import { AdminUsersTable } from '@/components/admin-users-table';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AdminUsersPage() {
  const { user, isAdmin, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      router.replace('/new-order');
    }
  }, [isUserLoading, isAdmin, router]);

  const handleTestConfetti = async () => {
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Firestore not available.",
      });
      return;
    }
    const appStateRef = doc(firestore, 'appState', 'global');
    try {
      await setDoc(appStateRef, {
        showConfetti: true,
        confettiTimestamp: new Date().toISOString(),
      });
      toast({
        title: "Confetti!",
        description: "The confetti animation should be visible to all users.",
      });
    } catch (error) {
      console.error("Error triggering confetti:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not trigger confetti.",
      });
    }
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

    