
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import React, { useState, useEffect } from 'react';
import { useAuth, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';

type UserProfile = {
    uid: string;
    firstName: string;
    lastName: string;
    nickname: string;
    email: string;
    role: string;
    phoneNumber?: string;
    photoURL?: string;
};

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  nickname: z.string().min(1, 'Nickname is required.'),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
});

const passwordSchema = z.object({
    existingPassword: z.string().min(1, { message: "Existing password is required." }),
    newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
    confirmNewPassword: z.string()
}).refine(data => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ["confirmNewPassword"],
});


type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

type AccountSettingsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function AccountSettingsDialog({ isOpen, onOpenChange }: AccountSettingsDialogProps) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading, refetch } = useDoc<UserProfile>(userDocRef);

  const [showExistingPassword, setShowExistingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
        firstName: '',
        lastName: '',
        nickname: '',
        email: '',
        phoneNumber: '',
    }
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
        existingPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    }
  });

  useEffect(() => {
    if (userProfile) {
      profileForm.reset({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        nickname: userProfile.nickname || '',
        email: userProfile.email || '',
        phoneNumber: userProfile.phoneNumber || '',
      });
    }
  }, [userProfile, profileForm]);
  
  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleProfileSave = async (values: ProfileFormValues) => {
    if (!userDocRef) return;
    setIsSavingProfile(true);
    try {
        await updateDoc(userDocRef, {
            firstName: toTitleCase(values.firstName),
            lastName: toTitleCase(values.lastName),
            nickname: values.nickname,
            phoneNumber: values.phoneNumber,
        });
        await refetch();
        toast({ title: 'Profile Updated!', description: 'Your changes have been saved.' });
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save your profile changes.' });
    } finally {
        setIsSavingProfile(false);
    }
  };
  
  const handlePasswordSave = async (values: PasswordFormValues) => {
    if (!user || !user.email) return;

    setIsSavingPassword(true);
    passwordForm.clearErrors();

    try {
        const credential = EmailAuthProvider.credential(user.email, values.existingPassword);
        await reauthenticateWithCredential(user, credential);
        
        await updatePassword(user, values.newPassword);
        
        passwordForm.reset();
        toast({ title: 'Password Changed!', description: 'Your password has been successfully updated.' });
        
    } catch (error: any) {
        console.error("Error changing password:", error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
             passwordForm.setError('existingPassword', { type: 'manual', message: 'Incorrect existing password.' });
        } else {
             toast({ variant: 'destructive', title: 'Password Change Failed', description: 'An unexpected error occurred.' });
        }
    } finally {
        setIsSavingPassword(false);
    }
  };


  const isLoading = isUserLoading || isProfileLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
          <DialogDescription>
            Update your profile information and password.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
             <div className="grid gap-3 py-4 text-sm">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-24 w-24 rounded-md" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-9 w-1/2" />
                    </div>
                </div>
                 <Skeleton className="h-9 w-full" />
                 <Skeleton className="h-9 w-full" />
                 <Skeleton className="h-9 w-full" />
             </div>
        ) : (
          <div className="grid gap-6 py-4 text-sm">
             <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-24 w-24">
                             <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                                {userProfile?.nickname?.[0].toUpperCase() ?? user?.email?.[0].toUpperCase() ?? 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                            <Label htmlFor="profile-picture" className="text-xs">Profile Picture</Label>
                            <div className="flex items-center gap-2">
                                <Button asChild variant="outline" size="sm" className="text-xs">
                                    <label htmlFor="profile-picture-upload" className="cursor-pointer">
                                        Choose File
                                    </label>
                                </Button>
                                <Input id="profile-picture-upload" type="file" className="hidden" />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField control={profileForm.control} name="firstName" render={({ field }) => (
                            <FormItem><FormLabel className="text-xs">First Name</FormLabel><Input {...field} className="text-xs h-9" /></FormItem>
                        )} />
                         <FormField control={profileForm.control} name="lastName" render={({ field }) => (
                            <FormItem><FormLabel className="text-xs">Last Name</FormLabel><Input {...field} className="text-xs h-9" /></FormItem>
                        )} />
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                       <FormField control={profileForm.control} name="nickname" render={({ field }) => (
                            <FormItem className='col-span-2'><FormLabel className="text-xs">Nickname</FormLabel><Input {...field} className="text-xs h-9" /></FormItem>
                        )} />
                        <FormField control={profileForm.control} name="email" render={({ field }) => (
                            <FormItem className='col-span-3'><FormLabel className="text-xs">Email</FormLabel><Input {...field} disabled className="text-xs h-9 bg-muted" /></FormItem>
                        )} />
                    </div>
                    <Button type="submit" className="text-white font-bold w-full" disabled={isSavingProfile}>
                        {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Profile Changes
                    </Button>
                </form>
            </Form>
            
            <Separator />

             <Form {...passwordForm}>
                 <form onSubmit={passwordForm.handleSubmit(handlePasswordSave)} className="space-y-4">
                    <FormField control={passwordForm.control} name="existingPassword" render={({ field }) => (
                        <FormItem className="relative">
                            <Label className="text-xs">Existing Password</Label>
                            <Input {...field} type={showExistingPassword ? 'text' : 'password'} className="text-xs h-9 pr-10" />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 bottom-1 h-7 w-7 text-gray-500" onClick={() => setShowExistingPassword(p => !p)}>
                                {showExistingPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            {passwordForm.formState.errors.existingPassword && <p className="text-xs text-destructive">{passwordForm.formState.errors.existingPassword.message}</p>}
                        </FormItem>
                    )} />
                    <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                        <FormItem className="relative">
                            <Label className="text-xs">New Password</Label>
                            <Input {...field} type={showNewPassword ? 'text' : 'password'} className="text-xs h-9 pr-10" />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 bottom-1 h-7 w-7 text-gray-500" onClick={() => setShowNewPassword(p => !p)}>
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                             {passwordForm.formState.errors.newPassword && <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>}
                        </FormItem>
                    )} />
                     <FormField control={passwordForm.control} name="confirmNewPassword" render={({ field }) => (
                        <FormItem className="relative">
                            <Label className="text-xs">Confirm New Password</Label>
                            <Input {...field} type={showConfirmNewPassword ? 'text' : 'password'} className="text-xs h-9 pr-10" />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 bottom-1 h-7 w-7 text-gray-500" onClick={() => setShowConfirmNewPassword(p => !p)}>
                                {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            {passwordForm.formState.errors.confirmNewPassword && <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmNewPassword.message}</p>}
                        </FormItem>
                    )} />
                     <Button type="submit" className="text-white font-bold w-full" disabled={isSavingPassword}>
                        {isSavingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Change Password
                    </Button>
                 </form>
             </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
