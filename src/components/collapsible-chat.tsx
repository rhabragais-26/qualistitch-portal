'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatLayout } from '@/components/chat-layout';
import { ChevronsLeft, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export function CollapsibleChat() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn(
        "fixed bottom-0 left-0 z-50 transition-all duration-300 ease-in-out flex flex-col no-print",
        isExpanded ? "w-96 h-[70vh] max-h-[500px] bg-card text-card-foreground border-t border-r rounded-tr-lg shadow-xl" : "w-auto h-auto"
      )}>
      <div className={cn("overflow-hidden", isExpanded ? "flex-1" : "h-0")}>
        {isExpanded && <ChatLayout />}
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(isExpanded ? "w-full border-t" : "h-10 w-10 p-0 rounded-full bg-accent/70 text-white hover:bg-accent/90")}
            >
              {isExpanded ? <ChevronsLeft className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          {!isExpanded && (
            <TooltipContent side="right">
              <p>Open Chat</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
