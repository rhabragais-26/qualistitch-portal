'use client';
import { Header } from '@/components/header';
import { RecordsTable } from '@/components/records-table';
import { useUser } from '@/firebase';
import { hasEditPermission } from '@/lib/permissions';
import { usePathname } from 'next/navigation';

export default function CompletedRecordsPage() {
  const { userProfile } = useUser();
  const pathname = usePathname();
  const canEdit = hasEditPermission(userProfile?.position as any, pathname);

  return (
    <Header>
      <RecordsTable isReadOnly={!canEdit} filterStatus="COMPLETED" />
    </Header>
  );
}
