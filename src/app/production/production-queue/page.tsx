
'use client';
import { Header } from '@/components/header';
import { ProductionQueueTable } from '@/components/production-queue-table';
import { useUser } from '@/firebase';
import { hasEditPermission } from '@/lib/permissions';
import { usePathname } from 'next/navigation';

export default function ProductionQueuePage() {
    const { userProfile } = useUser();
    const pathname = usePathname();
    const canEdit = hasEditPermission(userProfile?.position as any, pathname);

  return (
    <Header>
      <ProductionQueueTable isReadOnly={!canEdit} filterType="ONGOING" />
    </Header>
  );
}
