'use client';
import { Header } from '@/components/header';
import { HomeCarousel } from '@/components/home-carousel';

export default function HomePage() {
  return (
    <Header>
      <div className="flex flex-col items-center justify-center p-4 h-full">
        <HomeCarousel />
      </div>
    </Header>
  );
}
