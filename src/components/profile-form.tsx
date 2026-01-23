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
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Camera, Eye, EyeOff, X } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { UserPosition } from '@/lib/permissions';
import Image from 'next/image';
import { toTitleCase } from '@/lib/utils';

const positions: UserPosition[] = [
    'Not Assigned',
    'CEO',
    'SCES',
    'Sales Supervisor',
    'Sales Manager',
    'Digitizer',
    'Inventory Officer',
    'Production Line Leader',
    'Production Head',
    'Logistics Officer',
    'Operations Manager',
    'Operations Head',
    'HR',
    'Finance',
    'Marketing Head',
    'Social Media Manager',
    'Page Admin'
];

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  nickname: z.string().min(1, 'Nickname is required.'),
  position: z.string().min(1, 'Position is required.'),
  phoneNumber: z.string().optional(),
  photoURL: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(data => {
    if (data.newPassword || data.confirmPassword) {
        return !!data.currentPassword;
    }
    return true;
}, {
    message: "Current password is required to change your password.",
    path: ["currentPassword"],
}).refine(data => {
    if(data.newPassword) {
        return data.newPassword.length >= 6;
    }
    return true;
}, {
    message: "New password must be at least 6 characters.",
    path: ["newPassword"],
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match.",
  path: ["confirmPassword"],
});


type FormValues = z.infer<typeof formSchema>;

export function ProfileForm() {
  const { user, userProfile, isUserLoading, isAdmin } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [imageInView, setImageInView] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      nickname: '',
      position: 'Not Assigned',
      phoneNumber: '',
      photoURL: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        nickname: userProfile.nickname || '',
        position: userProfile.position || 'Not Assigned',
        phoneNumber: userProfile.phoneNumber || '',
        photoURL: userProfile.photoURL || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [userProfile, form]);
  
  const getInitials = (nickname: string | undefined) => {
    if (!nickname) return '';
    return nickname.charAt(0).toUpperCase();
  };

  const handleAvatarClick = () => {
    const photoUrl = form.getValues('photoURL') || userProfile?.photoURL;
    if (photoUrl) {
      setImageInView(photoUrl);
    } else {
      fileInputRef.current?.click();
    }
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

    try {
        const { dirtyFields } = form.formState;

        const profileDataToUpdate: Partial<FormValues> = {};
        if (dirtyFields.firstName) profileDataToUpdate.firstName = toTitleCase(values.firstName);
        if (dirtyFields.lastName) profileDataToUpdate.lastName = toTitleCase(values.lastName);
        if (dirtyFields.nickname) profileDataToUpdate.nickname = toTitleCase(values.nickname);
        if (dirtyFields.position) profileDataToUpdate.position = values.position;
        if (dirtyFields.phoneNumber) profileDataToUpdate.phoneNumber = values.phoneNumber;
        if (dirtyFields.photoURL) profileDataToUpdate.photoURL = values.photoURL;

        if (Object.keys(profileDataToUpdate).length > 0) {
            const userDocRef = doc(firestore, 'users', user.uid);
            await updateDoc(userDocRef, {
                ...profileDataToUpdate,
                lastModified: new Date().toISOString(),
            });
             toast({
                title: 'Profile Updated',
                description: 'Your profile details have been saved successfully.',
            });
        }

        // Handle password change
        if (values.newPassword && values.currentPassword) {
            const credential = EmailAuthProvider.credential(user.email!, values.currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, values.newPassword);
            toast({
                title: 'Password Updated',
                description: 'Your password has been changed successfully.',
            });
        }
        
        form.reset(values);

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
    <>
      {imageInView && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center animate-in fade-in"
          onClick={() => setImageInView(null)}
        >
          <div className="relative h-[90vh] w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image src={imageInView} alt="Enlarged Profile Photo" layout="fill" objectFit="contain" />
             <Button
                variant="ghost"
                size="icon"
                onClick={() => setImageInView(null)}
                className="absolute top-4 right-4 text-white hover:bg-white/10 hover:text-white"
            >
                <X className="h-6 w-6" />
                <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>
      )}
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <CardTitle>{userProfile?.nickname}'s Profile</CardTitle>
          <CardDescription>Manage your personal information and password.</CardDescription>
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
                  <div
                    className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
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
              </div>
              
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                          <Input readOnly value={user?.email || ''} className="bg-muted" />
                      </FormControl>
                  </FormItem>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Position</FormLabel>
                            <FormControl>
                                <Input readOnly {...field} className="bg-muted" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                  />
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
              </div>

              <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-medium">Change Password</h3>
                  <FormField
                      control={form.control}
                      name="currentPassword"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <div className="relative">
                              <FormControl>
                                  <Input type={showCurrentPassword ? "text" : "password"} {...field} />
                              </FormControl>
                              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowCurrentPassword(prev => !prev)}>
                                  {showCurrentPassword ? <EyeOff /> : <Eye />}
                              </Button>
                          </div>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                          control={form.control}
                          name="newPassword"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <div className="relative">
                                  <FormControl>
                                      <Input type={showNewPassword ? "text" : "password"} {...field} />
                                  </FormControl>
                                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowNewPassword(prev => !prev)}>
                                      {showNewPassword ? <EyeOff /> : <Eye />}
                                  </Button>
                              </div>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name="confirmPassword"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <div className="relative">
                                  <FormControl>
                                      <Input type={showConfirmPassword ? "text" : "password"} {...field} />
                                  </FormControl>
                                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirmPassword(prev => !prev)}>
                                      {showConfirmPassword ? <EyeOff /> : <Eye />}
                                  </Button>
                              </div>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                  </div>
              </div>

              <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
