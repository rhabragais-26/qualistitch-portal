'use client';

import { Header } from '@/components/header';
import { ReplenishmentHistoryTable } from '@/components/replenishment-history-table';

export default function ReplenishmentHistoryPage() {
  return (
    <Header>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <ReplenishmentHistoryTable />
      </div>
    </Header>
  );
}
