'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { SignupForm } from '@/components/signup-form';
import { LoginForm } from '@/components/login-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('login');

  useEffect(() => {
    // If user is loaded and is not anonymous, redirect to new-order
    if (!isUserLoading && user) {
      router.replace('/new-order');
    }
  }, [user, isUserLoading, router]);

  // While checking user state, or if the user is already logged in, show a loading message.
  // This prevents the login form from flashing before the redirect happens.
  if (isUserLoading || user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
                <Card>
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                    <CardDescription>Enter your credentials to access your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <LoginForm />
                </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="signup">
                <Card>
                <CardHeader>
                    <CardTitle>Sign Up</CardTitle>
                    <CardDescription>Create a new account to get started.</CardDescription>
                </CardHeader>
                <CardContent>
                    <SignupForm onSignupSuccess={() => setActiveTab('login')} />
                </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
