
import { Header } from '@/components/header';
import { DigitizingReportsSummary } from '@/components/digitizing-reports-summary';

export default function DigitizingReportsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-8">
          <DigitizingReportsSummary />
        </div>
      </main>
    </div>
  );
}
