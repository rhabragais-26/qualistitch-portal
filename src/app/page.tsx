'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

export default function RootPage() {
  const { user, userProfile, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        if (userProfile?.position === 'Not Assigned') {
          router.replace('/pending-approval');
        } else {
          router.replace('/new-order');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, userProfile, isUserLoading, router]);

  return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
}
