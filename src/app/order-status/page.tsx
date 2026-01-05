import { Header } from '@/components/header';
import { OrderStatusTable } from '@/components/order-status-table';

export default function OrderStatusPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-hidden">
        <OrderStatusTable />
      </main>
    </div>
  );
}
