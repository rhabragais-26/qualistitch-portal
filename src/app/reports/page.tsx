'use client';
import { Header } from '@/components/header';
import { MonthlySalesCard } from '@/components/monthly-sales-card';
import { ReportsSummary } from '@/components/reports-summary';
import { TodaysPerformanceCard } from '@/components/todays-performance-card';

export default function ReportsPage() {
  return (
    <Header>
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <TodaysPerformanceCard />
            <MonthlySalesCard />
            <ReportsSummary />
        </div>
    </Header>
  );
}
