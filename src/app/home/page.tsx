'use client';
import { Header } from '@/components/header';
import { useUser } from '@/firebase';

export default function HomePage() {
  const { userProfile } = useUser();

  return (
    <Header>
      <div className="flex flex-col items-center justify-center flex-1 pt-[8px] text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Welcome, {userProfile?.nickname || 'User'}!
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          You can start by creating a new order or viewing existing records.
        </p>
      </div>
    </Header>
  );
}
