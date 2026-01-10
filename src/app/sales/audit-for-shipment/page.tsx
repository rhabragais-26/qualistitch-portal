
'use client';
import { Header } from '@/components/header';
import { AuditForShipmentTable } from '@/components/audit-for-shipment-table';

export default function AuditForShipmentPage() {
  return (
    <Header>
      <AuditForShipmentTable />
    </Header>
  );
}
