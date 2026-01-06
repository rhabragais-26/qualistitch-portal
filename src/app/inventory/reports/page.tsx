
import { Header } from '@/components/header';
import { InventoryReportTable } from '@/components/inventory-report-table';

export default function InventoryReportsPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-hidden">
        <InventoryReportTable />
      </main>
    </div>
  );
}
