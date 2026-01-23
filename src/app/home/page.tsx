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
        <div className="text-center mb-4 px-4">
          <p className="text-lg font-semibold text-foreground">
            Here's a quick look for our Company Profile
          </p>
        </div>
        <div className="w-full flex-1 flex items-center justify-center pb-[5px]">
          <HomeCarousel />
        </div>
      </div>
    </Header>
  );
}
