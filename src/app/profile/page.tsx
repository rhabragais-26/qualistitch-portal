
'use client';

import { Header } from '@/components/header';
import { ProfileForm } from '@/components/profile-form';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.replace('/');
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || !user || user.isAnonymous) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return (
    <Header>
      <div className="flex justify-center p-4 sm:p-6 lg:p-8">
        <ProfileForm />
      </div>
    </Header>
  );
}
