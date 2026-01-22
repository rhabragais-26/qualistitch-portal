'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toTitleCase } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type UserProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  nickname: string;
  [key: string]: any;
};

export function DataMigration() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleFormatUserNames = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore not initialized.',
      });
      return;
    }
    setIsLoading(true);

    try {
      const usersRef = collection(firestore, 'users');
      const querySnapshot = await getDocs(usersRef);
      const batch = writeBatch(firestore);
      let updatedCount = 0;

      querySnapshot.forEach((doc) => {
        const user = doc.data() as UserProfile;
        const updates: Partial<UserProfile> = {};
        
        const formattedFirstName = toTitleCase(user.firstName);
        if (user.firstName !== formattedFirstName) {
            updates.firstName = formattedFirstName;
        }

        const formattedLastName = toTitleCase(user.lastName);
        if (user.lastName !== formattedLastName) {
            updates.lastName = formattedLastName;
        }

        const formattedNickname = toTitleCase(user.nickname);
        if (user.nickname !== formattedNickname) {
            updates.nickname = formattedNickname;
        }

        if (Object.keys(updates).length > 0) {
            batch.update(doc.ref, updates);
            updatedCount++;
        }
      });
      
      if (updatedCount > 0) {
        await batch.commit();
        toast({
          title: 'Success!',
          description: `Formatted names for ${updatedCount} user(s). The user list may take a moment to refresh.`,
        });
      } else {
        toast({
            title: 'No Changes Needed',
            description: 'All user names are already in the correct format.',
        });
      }

    } catch (error: any) {
      console.error('Error during data migration:', error);
      toast({
        variant: 'destructive',
        title: 'Migration Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-xl mt-8">
      <CardHeader>
        <CardTitle>Data Migration Tools</CardTitle>
        <CardDescription>
          One-time actions to clean up or format existing data in your database.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Format User Names</h4>
            <p className="text-sm text-muted-foreground">
              Ensures all existing first names, last names, and nicknames are in Title Case format (e.g., "John Doe").
            </p>
          </div>
          <Button onClick={handleFormatUserNames} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Formatting...' : 'Run Formatter'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
