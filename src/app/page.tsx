'use client';

import { LoginForm } from '@/components/login-form';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user && !user.isAnonymous && user.emailVerified) {
      router.replace('/new-order');
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || (user && !user.isAnonymous && user.emailVerified)) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <LoginForm />
    </div>
  );
}
