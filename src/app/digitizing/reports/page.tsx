'use client';

export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { DigitizingReportsSummary } from '@/components/digitizing-reports-summary';

export default function DigitizingReportsPage() {
  return (
    <Header>
      <DigitizingReportsSummary />
    </Header>
  );
}
