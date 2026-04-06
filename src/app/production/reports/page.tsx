'use client';

export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { ProductionReportsSummary } from '@/components/production-reports-summary';

export default function ProductionReportsPage() {
  return (
    <Header>
      <main className="p-4 sm:p-6 lg:p-8">
        <ProductionReportsSummary />
      </main>
    </Header>
  );
}
