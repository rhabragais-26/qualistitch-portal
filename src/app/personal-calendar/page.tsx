'use client';

import { Header } from '@/components/header';
import { PersonalCalendar } from '@/components/personal-calendar';

export default function PersonalCalendarPage() {
  return (
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <PersonalCalendar />
      </main>
    </Header>
  );
}
