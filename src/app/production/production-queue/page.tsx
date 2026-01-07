
'use client';
import { Header } from '@/components/header';
import { ProductionQueueTable } from '@/components/production-queue-table';

export default function ProductionQueuePage() {
  return (
    <Header>
      <ProductionQueueTable />
    </Header>
  );
}
