'use client';

import { SignupForm } from '@/components/signup-form';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useEffect } from 'react';


export default function SignupPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user && !user.isAnonymous) {
      router.replace('/');
    }
  }, [isUserLoading, user, router]);


  if (isUserLoading || (user && !user.isAnonymous)) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <SignupForm />
    </div>
  );
}
