'use client';

import { SignupForm } from '@/components/signup-form';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';


export default function SignupPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  if (isUserLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (user && !user.isAnonymous) {
    router.replace('/');
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <SignupForm />
    </div>
  );
}
