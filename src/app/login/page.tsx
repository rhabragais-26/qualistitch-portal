'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { SignupForm } from '@/components/signup-form';
import { LoginForm } from '@/components/login-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthPage() {
  const { user, userProfile, isUserLoading } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('login');

  useEffect(() => {
    // If user is loaded and their profile is also loaded, redirect away from auth page.
    // This prevents redirection during the signup process before the user is signed out.
    if (!isUserLoading && user && userProfile) {
      router.replace('/');
    }
  }, [user, userProfile, isUserLoading, router]);

  // While checking user state, or if the user is logged in with a profile, show a loading message.
  if (isUserLoading || (user && userProfile)) {
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
                    <CardDescription>A required verification will be sent to your email after successful sign up</CardDescription>
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
