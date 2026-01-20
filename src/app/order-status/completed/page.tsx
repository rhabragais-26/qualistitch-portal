'use client';
import { Header } from '@/components/header';
import { OrderStatusTable } from '@/components/order-status-table';

export default function CompletelyDeliveredOrdersPage() {
  return (
    <Header>
      <OrderStatusTable filterType="COMPLETED" />
    </Header>
  );
}
