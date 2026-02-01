'use client';

import { Header } from '@/components/header';
import { AdminUsersTable } from '@/components/admin-users-table';
import { ProductManagement } from '@/components/product-management';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, writeBatch, query, doc } from 'firebase/firestore';
import { getStorage, ref, listAll, deleteObject, StorageReference } from 'firebase/storage';

export default function AdminUsersPage() {
  const { user, isAdmin, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);

  const collectionsToDelete = [
    'leads', 'unclosedLeads', 'dailyAds', 'embroidery_logs', 'marketingCalendar', 
    'operational_expenses', 'cost_of_goods', 'capital_expenses', 'direct_messages', 
    'inventory', 'operationalCases', 'campaign_inquiries', 'adCampaigns', 
    'ad_spend_inquiries', 'other_cash_inflows', 'counters', 'sizeCharts'
  ];

  const storageFoldersToDelete = [
    'leads-images', 'leads-files', 'operational-cases', 'adCampaigns-images', 
    'dailyAds', 'marketingCalendar', 'sizeCharts'
  ];

  const deleteCollection = async (collectionPath: string) => {
    if (!firestore) return;
    const collectionRef = collection(firestore, collectionPath);
    const q = query(collectionRef);
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return;

    const batch = writeBatch(firestore);
    querySnapshot.forEach((docSnapshot) => {
      batch.delete(docSnapshot.ref);
    });

    if (collectionPath === 'direct_messages') {
        for (const docSnapshot of querySnapshot.docs) {
            const messagesRef = collection(doc(firestore, collectionPath, docSnapshot.id), 'messages');
            const messagesSnapshot = await getDocs(query(messagesRef));
            messagesSnapshot.forEach(msgDoc => batch.delete(msgDoc.ref));
        }
    }

    await batch.commit();
  };

  const deleteStorageFolder = async (folderPath: string) => {
    const storage = getStorage();
    const folderRef = ref(storage, folderPath);
    
    async function deleteRecursively(currentRef: StorageReference) {
        try {
            const listResult = await listAll(currentRef);
            const deletePromises = listResult.items.map(itemRef => deleteObject(itemRef));
            await Promise.all(deletePromises);

            for (const prefix of listResult.prefixes) {
                await deleteRecursively(prefix);
            }
        } catch (error) {
             if ((error as any).code !== 'storage/object-not-found') {
                console.error(`Could not list folder ${currentRef.fullPath} for deletion.`, error);
             }
        }
    }

    await deleteRecursively(folderRef);
  };

  const handleClearData = async () => {
    setIsClearing(true);
    toast({ title: 'Clearing Data...', description: 'This may take a few moments. Please do not navigate away.' });

    try {
        await Promise.all(collectionsToDelete.map(path => deleteCollection(path)));
        await Promise.all(storageFoldersToDelete.map(path => deleteStorageFolder(path)));
        toast({ title: 'Success!', description: 'All specified data has been cleared.' });
    } catch (error: any) {
        console.error("Data clearing error:", error);
        toast({ variant: 'destructive', title: 'An Error Occurred', description: error.message || 'Failed to clear all data.' });
    } finally {
        setIsClearing(false);
    }
  };

  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      router.replace('/new-order');
    }
  }, [isUserLoading, isAdmin, router]);
  
  if (isUserLoading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
      <Header>
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="mb-8">Clear All Transactional Data (Temporary)</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action is irreversible and will delete all orders, chats, and uploaded photos. 
                  User accounts will NOT be deleted. Are you sure you want to proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearData} disabled={isClearing}>
                  {isClearing ? 'Clearing...' : 'Yes, delete everything'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <ProductManagement />
          <AdminUsersTable />
        </div>
      </Header>
  );
}
