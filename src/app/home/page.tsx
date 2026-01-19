'use client';
import { Header } from '@/components/header';
import { HomeCarousel } from '@/components/home-carousel';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const { userProfile } = useUser();

  return (
    <Header>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center space-y-8 text-center h-full">
        <div>
           <h1 className={cn(
              "text-5xl font-bold font-headline bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent shining-metal"
            )}>
            Welcome back, {userProfile?.nickname || 'User'}!
          </h1>
          <p className="text-xl text-muted-foreground mt-2">Here's a quick look at what's happening today.</p>
        </div>
        <div className="w-full max-w-2xl">
          <HomeCarousel />
        </div>
      </div>
    </Header>
  );
}
