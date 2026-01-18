'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatLayout } from '@/components/chat-layout';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export function CollapsibleChat() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn(
        "fixed bottom-4 left-4 z-50 h-[70vh] max-h-[500px] bg-card text-card-foreground border rounded-lg shadow-xl transition-all duration-300 ease-in-out flex flex-col no-print",
        isExpanded ? "w-96" : "w-16"
      )}>
      <div className="flex-1 overflow-hidden">
        {isExpanded ? (
          <ChatLayout />
        ) : (
          null
        )}
      </div>
      <div className="p-2 border-t mt-auto">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" onClick={() => setIsExpanded(!isExpanded)} className="w-full">
                {isExpanded ? <ChevronsLeft className="h-5 w-5" /> : <ChevronsRight className="h-5 w-5" />}
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
    </div>
  );
}
