'use client';

import { HomeCarousel } from '@/components/home-carousel';
import { Header } from '@/components/header';

export default function HomePage() {
  return (
    <Header>
        <div className="flex flex-col items-center justify-center flex-1 pt-[8px]">
            <HomeCarousel />
        </div>
    </Header>
  );
}
