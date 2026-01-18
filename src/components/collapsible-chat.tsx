'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChatLayout } from '@/components/chat-layout';
import { ChevronsLeft, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export function CollapsibleChat() {
  const [isMounted, setIsMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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

  if (!isMounted) {
    return null;
  }

  return (
    <div className={cn(
        "fixed z-50 transition-all duration-300 ease-in-out flex flex-col no-print",
        isExpanded 
            ? "w-96 h-[70vh] max-h-[500px] bg-card text-card-foreground border rounded-t-lg shadow-xl" 
            : "w-auto",
        isExpanded ? "bottom-0 left-0" : "bottom-0 left-0"
      )}>
      <div className={cn("overflow-hidden rounded-t-lg", isExpanded ? "flex-1" : "h-0")}>
        {isExpanded && <ChatLayout />}
      </div>
      {!isExpanded && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
               <Button
                variant="ghost"
                onClick={() => setIsExpanded(true)}
                className="h-24 w-9 p-1 rounded-l-none rounded-r-lg bg-amber-500/50 text-white hover:bg-amber-500 hover:text-white flex items-center justify-center"
              >
                <span className="[writing-mode:vertical-rl] rotate-180 font-bold tracking-wider">CHAT</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Open Chat</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
