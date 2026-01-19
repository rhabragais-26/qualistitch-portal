
'use client';

import { Header } from '@/components/header';
import { AdminUsersTable } from '@/components/admin-users-table';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PartyPopper, X } from 'lucide-react';

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

const CongratulationsPopup = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-[201] flex items-center justify-center bg-black/50 animate-in fade-in" onClick={onClose}>
    <div 
      className="relative w-full max-w-sm rounded-2xl bg-gradient-to-br from-purple-600 via-red-500 to-orange-400 p-8 text-white text-center shadow-2xl m-4 animate-in fade-in zoom-in-75"
      onClick={(e) => e.stopPropagation()}
    >
      <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-white/70 hover:text-white hover:bg-white/10" onClick={onClose}>
        <X className="h-6 w-6" />
      </Button>
      
      <div className="flex justify-center mb-6">
        <PartyPopper className="h-24 w-24 text-white animate-popper-pop" />
      </div>
      
      <h2 className="text-3xl font-bold mb-4">Congratulations!</h2>
      <p className="text-sm text-white/80 mb-8">
        Lorem ipsum dolor sit amet, consectetuer
        adipiscing elit, sed diam nonummy nibh
        euismod tincidunt ut laoreet dolore magna
        aliquam erat volutpat.
      </p>
      
      <Button className="w-full bg-white/90 text-black font-bold hover:bg-white shadow-md">
        SHARE
      </Button>
    </div>
  </div>
);


export default function AdminUsersPage() {
  const { user, isAdmin, isUserLoading } = useUser();
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      router.replace('/new-order');
    }
  }, [isUserLoading, isAdmin, router]);

  const handleTestConfetti = () => {
    setShowConfetti(true);
  };
  
  const handleClosePopup = () => {
    setShowConfetti(false);
  }

  if (isUserLoading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <>
      {showConfetti && <LocalConfetti />}
      {showConfetti && <CongratulationsPopup onClose={handleClosePopup} />}
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
