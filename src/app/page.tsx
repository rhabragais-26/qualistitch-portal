'use client';

import { LoginForm } from '@/components/login-form';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const isUserAuthenticated = !isUserLoading && user && !user.isAnonymous && user.emailVerified;

  useEffect(() => {
    if (isUserAuthenticated) {
      router.replace('/new-order');
    }
  }, [isUserAuthenticated, router]);

  if (isUserLoading || isUserAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <LoginForm />
    </div>
  );
}
