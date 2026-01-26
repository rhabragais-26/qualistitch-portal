'use client';

import { Header } from '@/components/header';
import { FoundingAnniversariesList } from '@/components/founding-anniversaries-list';

export default function FoundingAnniversariesPage() {
  return (
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <FoundingAnniversariesList />
      </main>
    </Header>
  );
}
