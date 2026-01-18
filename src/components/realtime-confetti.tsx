'use client';

import React, { useState, useEffect } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

type AppState = {
  showConfetti?: boolean;
  confettiTimestamp?: string;
};

const CONFETTI_DURATION = 5000; // 5 seconds in ms

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
}

    