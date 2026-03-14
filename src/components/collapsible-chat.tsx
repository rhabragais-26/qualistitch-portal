'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChatLayout } from '@/components/chat-layout';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore'; // Import onSnapshot
import type { DirectMessageChannel } from './chat-layout';
import { Badge } from './ui/badge';

export function CollapsibleChat() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isMounted, setIsMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const chatSoundRef = useRef<HTMLAudioElement | null>(null);
  
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const isInitialFetchRef = useRef(true);

  // This useEffect will now handle fetching the unread count and playing the sound.
  useEffect(() => {
    if (!firestore || !user?.uid) {
      setTotalUnreadCount(0);
      return;
    }

    const channelsQuery = query(
      collection(firestore, 'direct_messages'), 
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(channelsQuery, (snapshot) => {
      let newTotalUnread = 0;
      snapshot.forEach(doc => {
        const channel = doc.data() as DirectMessageChannel;
        newTotalUnread += channel.unreadCount?.[user.uid] || 0;
      });

      // On the very first data load, just set the count, don't play sound.
      if (isInitialFetchRef.current) {
        setTotalUnreadCount(newTotalUnread);
        isInitialFetchRef.current = false;
        return;
      }
      
      // For subsequent updates, if the count has increased, play the sound.
      setTotalUnreadCount(prevCount => {
        if (newTotalUnread > prevCount) {
            chatSoundRef.current?.play().catch(error => console.error("Chat audio play failed:", error));
        }
        return newTotalUnread;
      });
    });

    return () => {
      unsubscribe();
      isInitialFetchRef.current = true; // Reset for next user/login
    };

  }, [firestore, user?.uid]);


  useEffect(() => {
    setIsMounted(true);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    if (typeof window !== 'undefined') {
      chatSoundRef.current = new Audio('/Chat_Sound.mp3');
      chatSoundRef.current.volume = 0.5;
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isUserLoading) {
      setIsExpanded(false);
    }
  }, [user?.uid, isUserLoading]);


  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExpanded) {
      setIsContentVisible(true);
    } else {
      timer = setTimeout(() => setIsContentVisible(false), 300);
    }
    return () => clearTimeout(timer);
  }, [isExpanded]);


  if (!isMounted || isUserLoading || !user || user.isAnonymous) {
    return null;
  }

  return (
    <div className={cn("fixed z-50 no-print transition-all duration-300 ease-in-out", isExpanded ? "bottom-0 left-[5px]" : "bottom-4 left-0")}>
      <div
        className={cn(
          "relative transition-all duration-300 ease-in-out",
          isExpanded ? "w-[400px] h-[70vh] max-h-[500px]" : "w-9 h-24"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 border rounded-t-lg shadow-xl flex flex-col transition-all duration-300 ease-in-out",
            isExpanded ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
          )}
        >
          <div className="flex-1 overflow-hidden rounded-t-lg">
            {isContentVisible && <ChatLayout />}
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-300",
            !isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setIsExpanded(true)}
                  className="relative h-24 w-9 p-1 rounded-l-none rounded-r-lg bg-[#81cdc6] text-white hover:bg-[#69bab2] hover:text-white flex items-center justify-center"
                >
                  {totalUnreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-2 h-5 w-5 justify-center rounded-full p-0">
                      {totalUnreadCount}
                    </Badge>
                  )}
                  <span className="[writing-mode:vertical-rl] font-bold tracking-wider">CHAT</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Open Chat</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
