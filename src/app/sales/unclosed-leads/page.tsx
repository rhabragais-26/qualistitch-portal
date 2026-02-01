'use client';

import { Header } from '@/components/header';
import { UnclosedLeadsTable } from '@/components/unclosed-leads-table';
import { useUser } from '@/firebase';
import { hasEditPermission } from '@/lib/permissions';
import { usePathname } from 'next/navigation';

export default function UnclosedLeadsPage() {
  const { userProfile } = useUser();
  const pathname = usePathname();
  const canEdit = hasEditPermission(userProfile?.position as any, pathname);

  return (
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <UnclosedLeadsTable isReadOnly={!canEdit} />
      </main>
    </Header>
  );
}
