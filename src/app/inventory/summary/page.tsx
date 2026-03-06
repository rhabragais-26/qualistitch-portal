
'use client';

import { Header } from '@/components/header';
import { InventorySummaryTable } from '@/components/inventory-summary-table';

export default function InventorySummaryPage() {
  return (
    <Header>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <InventorySummaryTable />
      </div>
    </Header>
  );
}
