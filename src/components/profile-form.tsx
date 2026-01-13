'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Camera } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  nickname: z.string().min(1, 'Nickname is required.'),
  phoneNumber: z.string().optional(),
  photoURL: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function ProfileForm() {
  const { user, userProfile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      nickname: '',
      phoneNumber: '',
      photoURL: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        nickname: userProfile.nickname || '',
        phoneNumber: userProfile.phoneNumber || '',
        photoURL: userProfile.photoURL || '',
      });
    }
  }, [userProfile, form]);
  
  const getInitials = (nickname: string | undefined) => {
    if (!nickname) return '';
    return nickname.charAt(0).toUpperCase();
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        form.setValue('photoURL', e.target?.result as string, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(values: FormValues) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'User or database not available.' });
      return;
    }
    setIsSaving(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        ...values,
        lastModified: new Date().toISOString(),
      });
      toast({
        title: 'Profile Updated',
        description: 'Your profile details have been saved successfully.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Could not update your profile.',
      });
    } finally {
      setIsSaving(false);
    }
  }
  
  if (isUserLoading) {
     return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-6 w-1/4" />
          </div>
          <div className="space-y-4">
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl shadow-xl">
      <CardHeader>
        <CardTitle>My Profile</CardTitle>
        <CardDescription>Manage your personal information and profile picture.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                 <Avatar className="h-32 w-32">
                    <AvatarImage src={form.getValues('photoURL') || userProfile?.photoURL || ''} alt={userProfile?.nickname} />
                    <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
                        {getInitials(userProfile?.nickname)}
                    </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-8 w-8 text-white" />
                </div>
              </div>
               <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/gif"
              />
              <span className="text-lg font-semibold text-center">{userProfile?.position || 'Not Assigned'}</span>
            </div>
             <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nickname</FormLabel>
                  <FormControl>
                    <Input placeholder="Your nickname" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                        <Input placeholder="Juan" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                        <Input placeholder="Dela Cruz" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input readOnly value={user?.email || ''} className="bg-muted" />
              </FormControl>
            </FormItem>
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Your phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
