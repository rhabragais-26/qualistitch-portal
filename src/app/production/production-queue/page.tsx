
'use client';
import { Header } from '@/components/header';
import { ProductionQueueTable } from '@/components/production-queue-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductionQueuePage() {
  return (
    <Header>
      {(leads, isLoading, error) => {
        if (isLoading) {
          return (
            <div className="space-y-2 p-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-gray-200" />
              ))}
            </div>
          );
        }
        if (error) {
          return <div className="text-red-500 p-4">Error loading job orders: {error.message}</div>;
        }
        return <ProductionQueueTable leads={leads} />;
      }}
    </Header>
  );
}
