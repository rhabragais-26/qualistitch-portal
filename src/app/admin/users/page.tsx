
'use client';

import { Header } from '@/components/header';
import { AdminUsersTable } from '@/components/admin-users-table';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const CONFETTI_DURATION = 5000;

const LocalConfetti = () => (
    <div className="fixed inset-0 z-[200] pointer-events-none confetti-container">
      {Array.from({ length: 150 }).map((_, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}vw`,
            animationDelay: `${Math.random() * (CONFETTI_DURATION / 1000 - 1)}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
            backgroundColor: `hsl(${Math.random() * 360}, 90%, 65%)`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
);


export default function AdminUsersPage() {
  const { user, isAdmin, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      router.replace('/new-order');
    }
  }, [isUserLoading, isAdmin, router]);

  const handleTestConfetti = () => {
    setShowConfetti(true);
    toast({
      title: "Confetti!",
      description: "Enjoy the animation!",
    });
    setTimeout(() => {
      setShowConfetti(false);
    }, CONFETTI_DURATION);
  };

  if (isUserLoading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <>
      {showConfetti && <LocalConfetti />}
      <Header>
        <div className="p-4 sm:p-6 lg:p-8">
          <AdminUsersTable />
          <div className="mt-4 flex justify-center">
              <Button onClick={handleTestConfetti}>Test</Button>
          </div>
        </div>
      </Header>
    </>
  );
}
