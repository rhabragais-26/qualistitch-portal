import { Header } from '@/components/header';
import { InventorySummaryTable } from '@/components/inventory-summary-table';

export default function InventorySummaryPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 w-full overflow-hidden">
        <InventorySummaryTable />
      </main>
    </div>
  );
}
