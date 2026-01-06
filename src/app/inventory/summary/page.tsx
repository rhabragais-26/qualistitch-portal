import { Header } from '@/components/header';

export default function InventorySummaryPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-hidden">
        <h1 className="text-2xl font-bold">Inventory Summary</h1>
        <p>This is the page for the inventory summary.</p>
      </main>
    </div>
  );
}
