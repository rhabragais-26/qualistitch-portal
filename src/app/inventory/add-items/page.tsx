
import { Header } from '@/components/header';
import { AddItemForm } from '@/components/add-item-form';

export default function AddItemsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full flex items-start md:items-center justify-center p-4 sm:p-6 lg:p-8">
        <AddItemForm />
      </main>
    </div>
  );
}
