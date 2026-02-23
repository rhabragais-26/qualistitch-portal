'use client';
import { Header } from '@/components/header';
import { ReportsSummary } from '@/components/reports-summary';
import { TodaysPerformanceCard } from '@/components/todays-performance-card';
import { SalesSummaryCards } from '@/components/sales-summary-cards';

export default function ReportsPage() {
  return (
    <Header>
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <TodaysPerformanceCard />
            <SalesSummaryCards />
            <ReportsSummary />
        </div>
    </Header>
  );
}
