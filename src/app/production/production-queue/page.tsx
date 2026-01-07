
import { Header } from '@/components/header';
import { ProductionQueueTable } from '@/components/production-queue-table';

export default function ProductionQueuePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <ProductionQueueTable />
      </main>
    </div>
  );
}
