'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDoc, useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type AppState = {
  showConfetti?: boolean;
  confettiTimestamp?: string;
  congratsNickname?: string;
  congratsMessage?: string;
  congratsPhotoURL?: string;
};

const CONFETTI_DURATION = 7000; // 7 seconds in ms
const FADE_OUT_DURATION = 500; // CSS animation duration

const CongratulationsPopup = ({ isClosing, onClose, nickname, message, photoURL }: { isClosing: boolean, onClose: () => void, nickname?: string, message?: string, photoURL?: string }) => (
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
                "relative w-full max-w-md rounded-2xl bg-gradient-to-br from-purple-600 via-red-500 to-orange-400 p-8 text-white text-center shadow-2xl m-4 animate-in fade-in zoom-in-75",
                 isClosing && "animate-out fade-out-50 zoom-out-95"
            )}
            style={{ animationDuration: `${FADE_OUT_DURATION}ms` }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex justify-center mb-6">
                <PartyPopper className="h-24 w-24 text-yellow-300 animate-popper-pop" />
            </div>

            <h3 className="text-5xl font-bold">{nickname ? `Congratulations, ${nickname}!` : 'Congratulations!'}</h3>
            
            {photoURL && (
                <div className="flex justify-center my-6">
                    <Image
                        src={photoURL}
                        alt={nickname || 'Profile Picture'}
                        width={100}
                        height={100}
                        className="w-[100px] h-[100px] rounded-lg border-4 border-yellow-300 animate-zoom-in-out"
                    />
                </div>
            )}

            <h2 className="text-2xl text-white/80 mb-8">
                {message ? (
                    <span>
                        {message.split('**').map((part, index) =>
                            index % 2 === 1 ? <strong key={index}>{part}</strong> : part
                        )}
                    </span>
                ) : (
                    'Amazing work!'
                )}
            </h2>
        </div>
    </div>
);

const LocalConfetti = () => (
    <div className="fixed inset-0 z-[202] pointer-events-none confetti-container">
      {Array.from({ length: 600 }).map((_, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}vw`,
            animationDelay: `${Math.random() * (CONFETTI_DURATION / 1000 - 1)}s`,
            animationDuration: `${1 + Math.random() * 4}s`,
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

  const [visibility, setVisibility] = useState<'hidden' | 'visible' | 'closing'>('hidden');
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);

  // On mount, check localStorage for the last seen timestamp to prevent re-showing on refresh
  useEffect(() => {
    const savedTimestamp = localStorage.getItem('confettiLastTimestamp');
    if (savedTimestamp) {
      setLastTimestamp(savedTimestamp);
    }
  }, []);

  const closePopup = useCallback(() => {
    if (visibility === 'visible') {
      setVisibility('closing');
    }
  }, [visibility]);

  // Effect to trigger the confetti when a new event arrives from Firestore
  useEffect(() => {
    if (appState?.showConfetti && appState.confettiTimestamp && appState.confettiTimestamp !== lastTimestamp) {
      // Store the new timestamp in both state and localStorage
      setLastTimestamp(appState.confettiTimestamp);
      localStorage.setItem('confettiLastTimestamp', appState.confettiTimestamp);
      
      setVisibility('visible');

      // Set a timer to automatically start closing after the duration
      const autoCloseTimer = setTimeout(() => {
        setVisibility('closing');
      }, CONFETTI_DURATION);

      return () => clearTimeout(autoCloseTimer);
    }
  }, [appState, lastTimestamp]);
  
  // Effect to handle the final cleanup after the closing animation is complete
  useEffect(() => {
    if (visibility === 'closing') {
      const cleanupTimer = setTimeout(() => {
        setVisibility('hidden');
        // Reset the trigger in Firestore now that it's fully hidden
        if (appStateRef) {
          setDocumentNonBlocking(appStateRef, { showConfetti: false, congratsMessage: null, congratsNickname: null, congratsPhotoURL: null }, { merge: true });
        }
      }, FADE_OUT_DURATION);

      return () => clearTimeout(cleanupTimer);
    }
  }, [visibility, appStateRef]);


  if (visibility === 'hidden') {
    return null;
  }

  return (
    <>
      <LocalConfetti />
      <CongratulationsPopup 
        isClosing={visibility === 'closing'} 
        onClose={closePopup}
        nickname={appState?.congratsNickname}
        message={appState?.congratsMessage}
        photoURL={appState?.congratsPhotoURL}
      />
    </>
  );
}