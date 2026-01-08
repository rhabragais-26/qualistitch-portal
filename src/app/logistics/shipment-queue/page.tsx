'use client';
import { Header } from '@/components/header';
import { ShipmentQueueTable } from '@/components/shipment-queue-table';

export default function ShipmentQueuePage() {
  return (
    <Header>
      <ShipmentQueueTable />
    </Header>
  );
}