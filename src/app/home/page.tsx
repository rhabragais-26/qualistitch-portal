'use client';
import { Header } from '@/components/header';
import { HomeCarousel } from '@/components/home-carousel';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const { userProfile } = useUser();

  return (
    <Header>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center text-center">
        <div>
           <h1 className={cn(
              "text-3xl font-bold font-headline bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent shining-metal"
            )}>
            Welcome back, {userProfile?.nickname || 'User'}!
          </h1>
          <p className="text-lg text-muted-foreground">Here's a quick look on our Company Profile</p>
        </div>
        <div className="w-full max-w-2xl mt-4">
          <HomeCarousel />
        </div>
      </div>
    </Header>
  );
}
