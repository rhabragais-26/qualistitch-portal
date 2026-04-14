
'use client';
import { Header } from '@/components/header';
import { RevisionHistoryTable } from '@/components/revision-history-table';
import { useUser } from '@/firebase';
import { hasEditPermission } from '@/lib/permissions';
import { usePathname } from 'next/navigation';

export default function RevisionHistoryPage() {
  const { userProfile } = useUser();
  const pathname = usePathname();
  const canEdit = hasEditPermission(userProfile, pathname);

  return (
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <RevisionHistoryTable isReadOnly={!canEdit} />
      </main>
    </Header>
  );
}
