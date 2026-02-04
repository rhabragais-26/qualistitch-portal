'use client';

import { useState, useEffect } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';

type AppState = {
  announcementText?: string;
  announcementType?: 'banner' | 'notification';
  announcementTimestamp?: string;
  announcementSender?: string;
};

function BannerContent() {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const pathname = usePathname();
  
  const appStateRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'appState', 'global') : null),
    [firestore]
  );
  const { data: appState } = useDoc<AppState>(appStateRef);

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (
      appState?.announcementType === 'banner' &&
      appState.announcementText &&
      appState.announcementTimestamp
    ) {
      const lastDismissedTimestamp = localStorage.getItem('announcementLastDismissed');
      if (appState.announcementTimestamp !== lastDismissedTimestamp) {
        setIsVisible(true);
      }
    } else {
        setIsVisible(false);
    }
  }, [appState]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (appState?.announcementTimestamp) {
      localStorage.setItem('announcementLastDismissed', appState.announcementTimestamp);
    }
  };

  if (!isVisible || !userProfile || pathname === '/login' || pathname === '/pending-approval') {
    return null;
  }

  return (
    <div className="fixed top-1/2 left-0 right-0 z-[200] w-full -translate-y-1/2 bg-black/70 backdrop-blur-sm pointer-events-auto">
      <div className="relative flex items-center h-16 overflow-hidden">
        <h2 className="absolute whitespace-nowrap text-3xl font-bold text-white animate-marquee">
          <span className="text-yellow-400">Announcement: </span>
          {appState?.announcementText}
          {appState?.announcementSender && <span className="italic"> - {appState.announcementSender}</span>}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-4 -translate-y-1/2 h-8 w-8 text-white hover:bg-white/20"
          onClick={handleDismiss}
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Dismiss announcement</span>
        </Button>
      </div>
    </div>
  );
}

export function RealtimeBanner() {
    const { user, isUserLoading } = useUser();

    if (isUserLoading || !user) {
        return null;
    }

    return <BannerContent />;
}
