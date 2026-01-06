import { Header } from '@/components/header';
import { DigitizingTable } from '@/components/digitizing-table';

export default function DigitizingPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-hidden">
        <DigitizingTable />
      </main>
    </div>
  );
}
