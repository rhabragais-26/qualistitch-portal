
'use client';
import { Header } from '@/components/header';
import { OrderStatusTable } from '@/components/order-status-table';

export default function OrderStatusPage() {
  return (
    <Header>
      <OrderStatusTable />
    </Header>
  );
}
