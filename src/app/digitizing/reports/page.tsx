'use client';

export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { DigitizingReportsSummary } from '@/components/digitizing-reports-summary';

export default function DigitizingReportsPage() {
  return (
    <Header>
      <main className="p-4 sm:p-6 lg:p-8">
        <DigitizingReportsSummary />
      </main>
    </Header>
  );
}
