'use client';
import { Header } from '@/components/header';
import { HomeCarousel } from '@/components/home-carousel';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const { userProfile } = useUser();

  return (
    <Header>
      <div className="flex flex-col items-center flex-1">
        <div className="px-2 pt-2 text-center">
           <h1 className={cn(
              "text-3xl font-bold font-headline bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent shining-metal"
            )}>
            Welcome back, {userProfile?.nickname || 'User'}!
          </h1>
          <p className="text-sm text-muted-foreground">Here's a quick look on our Company Profile</p>
        </div>
        <div className="w-full max-w-7xl flex-1 flex items-center justify-center">
          <HomeCarousel />
        </div>
      </div>
    </Header>
  );
}
