'use client';
import { Header } from '@/components/header';
import { HomeCarousel } from '@/components/home-carousel';

export default function HomePage() {
  return (
    <Header>
      <div className="flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Welcome to Qualistitch Inc.</h1>
        <HomeCarousel />
      </div>
    </Header>
  );
}
