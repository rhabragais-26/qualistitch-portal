import { Header } from '@/components/header';
import { ProdPreparationTable } from '@/components/prod-preparation-table';

export default function ProdPreparationPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-hidden">
        <ProdPreparationTable />
      </main>
    </div>
  );
}
