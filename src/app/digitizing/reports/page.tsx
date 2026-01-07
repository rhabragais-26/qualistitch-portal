
'use client';
import { Header } from '@/components/header';
import { DigitizingReportsSummary } from '@/components/digitizing-reports-summary';

export default function DigitizingReportsPage() {
  return (
    <Header>
      {(leads, operationalCases, isLoading, error) => (
        <div className="grid grid-cols-1 gap-8">
          <DigitizingReportsSummary leads={leads} isLoading={isLoading} error={error} />
        </div>
      )}
    </Header>
  );
}
