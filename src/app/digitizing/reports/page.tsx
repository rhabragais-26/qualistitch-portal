export const dynamic = 'force-dynamic';

'use client';
import { Header } from '@/components/header';
import { DigitizingReportsSummary } from '@/components/digitizing-reports-summary';

export default function DigitizingReportsPage() {
  return (
    <Header>
      <DigitizingReportsSummary />
    </Header>
  );
}
