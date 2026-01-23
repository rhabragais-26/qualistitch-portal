'use client';

import { Header } from '@/components/header';
import { AdminUsersTable } from '@/components/admin-users-table';
import { ProductManagement } from '@/components/product-management';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminUsersPage() {
  const { user, isAdmin, isUserLoading } = useUser();
  const router = useRouter();

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
          <ProductManagement />
          <AdminUsersTable />
        </div>
      </Header>
  );
}
