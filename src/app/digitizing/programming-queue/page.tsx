
'use client';
import { Header } from '@/components/header';
import { DigitizingTable } from '@/components/digitizing-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProgrammingQueuePage() {
  return (
    <Header>
      {(leads, operationalCases, isLoading, error) => {
        if (isLoading) {
          return (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-gray-200" />
              ))}
            </div>
          );
        }
        if (error) {
          return <div className="text-red-500 p-4">Error loading records: {error.message}</div>;
        }
        return <DigitizingTable leads={leads} />;
      }}
    </Header>
  );
}
