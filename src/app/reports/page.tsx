import { Header } from '@/components/header';
import { ReportsSummary } from '@/components/reports-summary';

export default function ReportsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-8">
          <ReportsSummary />
        </div>
      </main>
    </div>
  );
}
