'use client';

import { Header } from '@/components/header';
import { PhotoshootRequestsTable } from '@/components/photoshoot-requests-table';

export default function PhotoshootRequestsPage() {
  return (
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <PhotoshootRequestsTable />
      </main>
    </Header>
  );
}
