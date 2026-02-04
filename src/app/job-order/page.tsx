
'use client';
import { Header } from '@/components/header';
import { JobOrderTable } from '@/components/job-order-table';
import { useUser } from '@/firebase';
import { hasEditPermission } from '@/lib/permissions';
import { usePathname } from 'next/navigation';

export default function JobOrderPage() {
  const { userProfile } = useUser();
  const pathname = usePathname();
  const canEdit = hasEditPermission(userProfile?.position as any, pathname);

  return (
    <Header>
      <JobOrderTable isReadOnly={!canEdit} filterType="ONGOING" />
    </Header>
  );
}
