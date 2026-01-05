import { Header } from '@/components/header';
import { ReportsSummary } from '@/components/reports-summary';

export default function ReportsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 w-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <ReportsSummary />
      </main>
    </div>
  );
}
