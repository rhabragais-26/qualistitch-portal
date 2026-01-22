'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useUser } from '@/firebase';

export function CollapsibleRightPanel() {
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
    // When the user logs in or out, ensure the panel is collapsed.
    if (!isUserLoading) {
      setIsExpanded(false);
    }
  }, [user?.uid, isUserLoading]);


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
    <>
      {/* Panel Window */}
      <div
        className={cn(
          "fixed z-40 top-0 right-0 w-96 h-screen no-print transition-transform duration-300 ease-in-out bg-card border-l border-t border-b rounded-l-lg shadow-xl flex flex-col",
          isExpanded ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex-1 overflow-hidden rounded-l-lg">
          {isContentVisible && (
            <div className="p-4">
              <h2 className="text-lg font-bold">Right Panel</h2>
              <p>This is the content of the right-side collapsible panel.</p>
            </div>
          )}
        </div>
      </div>

      {/* PANEL Button */}
      <div
        className={cn(
          "fixed z-50 top-1/2 -translate-y-1/2 no-print transition-all duration-300 ease-in-out",
          isExpanded ? "right-[24rem]" : "right-0" // w-96 is 24rem
        )}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                className="relative h-24 w-9 p-1 rounded-r-none rounded-l-lg bg-[#81cdc6] text-white hover:bg-[#69bab2] hover:text-white flex items-center justify-center"
              >
                <span className="[writing-mode:vertical-rl] font-bold tracking-wider">PANEL</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{isExpanded ? "Close Panel" : "Open Panel"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </>
  );
}
