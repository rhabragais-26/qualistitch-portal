import { Header } from '@/components/header';
import { JobOrderTable } from '@/components/job-order-table';

export default function JobOrderPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-hidden">
        <JobOrderTable />
      </main>
    </div>
  );
}
