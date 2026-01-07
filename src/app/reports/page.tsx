
'use client';
import { Header } from '@/components/header';
import { ReportsSummary } from '@/components/reports-summary';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReportsPage() {
  return (
    <Header>
      {(leads, isLoading, error) => {
        return (
          <div className="grid grid-cols-1 gap-8">
            <ReportsSummary leads={leads} isLoading={isLoading} error={error} />
          </div>
        );
      }}
    </Header>
  );
}
