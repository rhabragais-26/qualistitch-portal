
import { Header } from '@/components/header';
import { OperationalCasesForm } from '@/components/operational-cases-form';

export default function OperationalCasesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full flex items-start justify-center p-4 sm:p-6 lg:p-8">
        <OperationalCasesForm />
      </main>
    </div>
  );
}
