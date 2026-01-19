'use client';

import React, { useState, useEffect } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { PartyPopper, X } from 'lucide-react';

type AppState = {
  showConfetti?: boolean;
  confettiTimestamp?: string;
};

const CONFETTI_DURATION = 5000; // 5 seconds in ms

const CongratulationsPopup = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-[201] flex items-center justify-center bg-black/50 animate-in fade-in animate-out fade-out-500" onClick={onClose}>
      <div 
        className="relative w-full max-w-sm rounded-2xl bg-gradient-to-br from-purple-600 via-red-500 to-orange-400 p-8 text-white text-center shadow-2xl m-4 animate-in fade-in zoom-in-75 animate-out fade-out-500 zoom-out-95"
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="flex justify-center mb-6">
          <PartyPopper className="h-24 w-24 text-yellow-300 animate-popper-pop" />
        </div>
        
        <h2 className="text-3xl font-bold mb-4">Congratulations!</h2>
        <p className="text-sm text-white/80 mb-8">
          Lorem ipsum dolor sit amet, consectetuer
          adipiscing elit, sed diam nonummy nibh
          euismod tincidunt ut laoreet dolore magna
          aliquam erat volutpat.
        </p>
        
      </div>
    </div>
);

const LocalConfetti = () => (
    <div className="fixed inset-0 z-[202] pointer-events-none confetti-container">
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

export function RealtimeConfetti() {
  const firestore = useFirestore();
  const appStateRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'appState', 'global') : null),
    [firestore]
  );
  const { data: appState } = useDoc<AppState>(appStateRef);
  const [isVisible, setIsVisible] = useState(false);
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);

  useEffect(() => {
    if (appState?.showConfetti && appState.confettiTimestamp && appState.confettiTimestamp !== lastTimestamp) {
      setLastTimestamp(appState.confettiTimestamp);
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, CONFETTI_DURATION);

      return () => clearTimeout(timer);
    }
  }, [appState, lastTimestamp]);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <LocalConfetti />
      <CongratulationsPopup onClose={() => setIsVisible(false)} />
    </>
  );
}
