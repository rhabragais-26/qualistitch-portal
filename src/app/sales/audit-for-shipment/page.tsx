
'use client';
import { Header } from '@/components/header';
import { AuditForShipmentTable } from '@/components/audit-for-shipment-table';
import { useUser } from '@/firebase';
import { hasEditPermission } from '@/lib/permissions';
import { usePathname } from 'next/navigation';

export default function AuditForShipmentPage() {
  const { userProfile } = useUser();
  const pathname = usePathname();
  const canEdit = hasEditPermission(userProfile?.position as any, pathname);

  return (
    <Header>
      <AuditForShipmentTable isReadOnly={!canEdit} />
    </Header>
  );
}
