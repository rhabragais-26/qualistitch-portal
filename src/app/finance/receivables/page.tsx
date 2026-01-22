'use client';

import { Header } from '@/components/header';
import { ReceivablesTable } from '@/components/receivables-table';
import { useUser } from '@/firebase';
import { hasEditPermission } from '@/lib/permissions';
import { usePathname } from 'next/navigation';

export default function ReceivablesPage() {
  const { userProfile } = useUser();
  const pathname = usePathname();
  const canEdit = hasEditPermission(userProfile?.position as any, pathname);

  return (
    <Header>
      <ReceivablesTable isReadOnly={!canEdit} />
    </Header>
  );
}
