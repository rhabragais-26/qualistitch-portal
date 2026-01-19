'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

type AppState = {
  showConfetti?: boolean;
  confettiTimestamp?: string;
};

const CONFETTI_DURATION = 5000; // 5 seconds in ms
const FADE_OUT_DURATION = 500; // CSS animation duration

const CongratulationsPopup = ({ isClosing, onClose }: { isClosing: boolean, onClose: () => void }) => (
    <div 
        className={cn(
            "fixed inset-0 z-[201] flex items-center justify-center bg-black/50 animate-in fade-in",
            isClosing && "animate-out fade-out"
        )} 
        style={{ animationDuration: `${FADE_OUT_DURATION}ms` }}
        onClick={onClose}
    >
        <div 
            className={cn(
                "relative w-full max-w-sm rounded-2xl bg-gradient-to-br from-purple-600 via-red-500 to-orange-400 p-8 text-white text-center shadow-2xl m-4 animate-in fade-in zoom-in-75",
                isClosing && "animate-out fade-out-50 zoom-out-95"
            )}
            style={{ animationDuration: `${FADE_OUT_DURATION}ms` }}
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
  const [isClosing, setIsClosing] = useState(false);
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);
  
  const timers = useRef<{ main?: NodeJS.Timeout, animation?: NodeJS.Timeout }>({});

  // Centralized function to handle closing the popup
  const closePopup = () => {
    // Prevent multiple triggers
    if (isClosingRef.current || !isVisibleRef.current) return;

    // Clear any existing timers to avoid conflicts
    clearTimeout(timers.current.main);
    clearTimeout(timers.current.animation);

    setIsClosing(true);
    timers.current.animation = setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
    }, FADE_OUT_DURATION);
  };
  
  // Refs to hold current state for access in callbacks without dependency issues
  const isVisibleRef = useRef(isVisible);
  const isClosingRef = useRef(isClosing);
  useEffect(() => {
    isVisibleRef.current = isVisible;
    isClosingRef.current = isClosing;
  }, [isVisible, isClosing]);

  useEffect(() => {
    // Effect to show the popup based on Firestore data
    if (appState?.showConfetti && appState.confettiTimestamp && appState.confettiTimestamp !== lastTimestamp) {
      
      // Clear any lingering timers from previous events
      clearTimeout(timers.current.main);
      clearTimeout(timers.current.animation);
      
      setLastTimestamp(appState.confettiTimestamp);
      setIsVisible(true);
      setIsClosing(false);
      
      // Set new timer to auto-close the popup
      timers.current.main = setTimeout(closePopup, CONFETTI_DURATION);
    }
    
    // Cleanup function runs on unmount or when dependencies change
    return () => {
      clearTimeout(timers.current.main);
      clearTimeout(timers.current.animation);
    };
  // `closePopup` is defined outside and stable, so not needed as a dependency
  }, [appState, lastTimestamp]);


  if (!isVisible) {
    return null;
  }

  return (
    <>
      <LocalConfetti />
      <CongratulationsPopup isClosing={isClosing} onClose={closePopup} />
    </>
  );
}