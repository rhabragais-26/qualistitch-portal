import { Header } from '@/components/header';

export default function InventoryReportsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold">Inventory Reports</h1>
        <p>This is the page for inventory reports.</p>
      </main>
    </div>
  );
}
