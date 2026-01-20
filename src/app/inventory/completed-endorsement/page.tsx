
'use client';
import { Header } from '@/components/header';
import { ItemPreparationTable } from '@/components/item-preparation-table';
import { useUser } from '@/firebase';
import { hasEditPermission } from '@/lib/permissions';
import { usePathname } from 'next/navigation';

export default function CompletedEndorsementPage() {
  const { userProfile } = useUser();
  const pathname = usePathname();
  const canEdit = hasEditPermission(userProfile?.position as any, pathname);
  
  return (
    <Header>
      <ItemPreparationTable isReadOnly={!canEdit} filterType="COMPLETED" />
    </Header>
  );
}
