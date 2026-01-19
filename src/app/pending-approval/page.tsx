'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PendingApprovalPage() {
  const { user, userProfile, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading) {
      // If user is not logged in, or is logged in but has an assigned position, redirect them.
      if (!user) {
        router.replace('/login');
      } else if (userProfile && userProfile.position !== 'Not Assigned') {
        router.replace('/new-order');
      }
    }
  }, [user, userProfile, isUserLoading, router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // While loading, or if user data is inconsistent, show a loading screen.
  if (isUserLoading || !user || !userProfile) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <div className="text-center max-w-2xl mx-auto flex flex-col items-center h-full justify-center">
        <header className="mb-8">
            <div className="bg-black rounded-lg px-8 py-4">
                <span className={cn("font-bold font-headline flex items-baseline bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent shining-metal whitespace-nowrap")}>
                    <span className="text-5xl">Q</span>
                    <span className="text-4xl">UALISTITCH Inc.</span>
                </span>
            </div>
        </header>
        <main className="flex-grow flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold mb-6">Welcome to the Qualistitch Portal!</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Thank you for joining us. To ensure the security of our system, all new accounts require a quick manual review. You’ll have full access to all pages as soon as an administrator approves your profile.
          </p>
        </main>
        <footer className="text-center flex flex-col items-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-24 w-24 text-amber-500"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <circle cx="12" cy="12" r="4" />
              <path d="m9 9 6 6" />
            </svg>
            <p className="text-lg text-muted-foreground text-left">
              <span className="font-bold">Access Pending:</span> Awaiting administrator approval.
            </p>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Thank you for your patience. Please try signing in again later.</p>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </footer>
      </div>
    </div>
  );
}
