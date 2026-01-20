'use client';
import { Header } from '@/components/header';
import { HomeCarousel } from '@/components/home-carousel';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const { userProfile } = useUser();

  return (
    <Header>
      <div className="flex flex-col items-center flex-1 pt-[8px]">
        <div className="w-full flex-1 flex items-center justify-center pb-[18px]">
          <HomeCarousel />
        </div>
      </div>
    </Header>
  );
}
