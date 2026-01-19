'use client';
import { Header } from '@/components/header';
import { HomeCarousel } from '@/components/home-carousel';
import { TodaysPerformanceCard } from '@/components/todays-performance-card';
import { useUser } from '@/firebase';

export default function HomePage() {
  const { userProfile } = useUser();

  return (
    <Header>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome back, {userProfile?.firstName || 'User'}!
          </h1>
          <p className="text-lg text-muted-foreground">Here's a quick look at what's happening today.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
                <TodaysPerformanceCard />
            </div>
            <div className="flex items-center justify-center h-full">
                <HomeCarousel />
            </div>
        </div>
      </div>
    </Header>
  );
}
