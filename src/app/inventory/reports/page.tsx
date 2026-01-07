
import { Header } from '@/components/header';
import { InventoryReportTable } from '@/components/inventory-report-table';
import { OperationalCasesSummary } from '@/components/operational-cases-summary';

export default function InventoryReportsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
            <InventoryReportTable />
            <OperationalCasesSummary />
        </div>
      </main>
    </div>
  );
}
