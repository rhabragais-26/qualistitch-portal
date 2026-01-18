'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChatLayout } from '@/components/chat-layout';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useUser } from '@/firebase';

export function CollapsibleChat() {
  const { user, isUserLoading } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExpanded) {
      setIsContentVisible(true);
    } else {
      timer = setTimeout(() => setIsContentVisible(false), 300); // Matches duration-300
    }
    return () => clearTimeout(timer);
  }, [isExpanded]);


  if (!isMounted || isUserLoading || !user || user.isAnonymous) {
    return null;
  }

  return (
    <div className="fixed z-50 bottom-4 left-0 no-print">
      <div
        className={cn(
          "relative transition-all duration-300 ease-in-out",
          isExpanded ? "w-96 h-[70vh] max-h-[500px]" : "w-9 h-24"
        )}
      >
        {/* Chat Window */}
        <div
          className={cn(
            "absolute inset-0 bg-card text-card-foreground border rounded-lg shadow-xl flex flex-col transition-all duration-300 ease-in-out",
            isExpanded ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
          )}
        >
          <div className="flex-1 overflow-hidden">
            {isContentVisible && <ChatLayout />}
          </div>
        </div>

        {/* CHAT Button */}
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
                  variant="ghost"
                  onClick={() => setIsExpanded(true)}
                  className="h-24 w-9 p-1 rounded-l-none rounded-r-lg bg-[#81cdc6] text-white hover:bg-[#81cdc6] hover:text-white flex items-center justify-center"
                >
                  <span className="[writing-mode:vertical-rl] rotate-180 font-bold tracking-wider">CHAT</span>
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
