
'use client';
import { Header } from '@/components/header';
import { HomeCarousel } from '@/components/home-carousel';

export default function HomePage() {
  return (
    <Header>
      <div className="flex flex-col items-center justify-center h-full p-2">
        <HomeCarousel />
      </div>
    </Header>
  );
}
