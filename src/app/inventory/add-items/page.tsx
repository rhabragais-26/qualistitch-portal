import { Header } from '@/components/header';

export default function AddItemsPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-hidden">
        <h1 className="text-2xl font-bold">Add Items</h1>
        <p>This is the page for adding inventory items.</p>
      </main>
    </div>
  );
}
