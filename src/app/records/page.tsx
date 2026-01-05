import { Header } from '@/components/header';
import { RecordsTable } from '@/components/records-table';

export default function RecordsPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-hidden">
        <RecordsTable />
      </main>
    </div>
  );
}
