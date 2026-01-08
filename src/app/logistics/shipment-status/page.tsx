'use client';
import { Header } from '@/components/header';
import { ShipmentStatusTable } from '@/components/shipment-status-table';

export default function ShipmentStatusPage() {
  return (
    <Header>
      <ShipmentStatusTable />
    </Header>
  );
}
