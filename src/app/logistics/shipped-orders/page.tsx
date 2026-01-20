'use client';
import { Header } from '@/components/header';
import { ShipmentQueueTable } from '@/components/shipment-queue-table';
import { useUser } from '@/firebase';
import { hasEditPermission } from '@/lib/permissions';
import { usePathname } from 'next/navigation';

export default function ShippedOrdersPage() {
  const { userProfile } = useUser();
  const pathname = usePathname();
  const canEdit = hasEditPermission(userProfile?.position as any, pathname);

  return (
    <Header>
      <ShipmentQueueTable isReadOnly={!canEdit} filterType="COMPLETED" />
    </Header>
  );
}
