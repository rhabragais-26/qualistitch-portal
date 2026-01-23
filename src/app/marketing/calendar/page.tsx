'use client';

import { Header } from '@/components/header';
import { MarketingCalendar } from '@/components/marketing-calendar';

export default function MarketingCalendarPage() {
  return (
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <MarketingCalendar />
      </main>
    </Header>
  );
}
