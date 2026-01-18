'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatLayout } from '@/components/chat-layout';
import { MessageSquare, ChevronsLeft, ChevronsRight } from 'lucide-react';
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
          <div className="flex flex-col items-center justify-center h-full py-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" onClick={() => setIsExpanded(true)} className="w-full h-16">
                    <MessageSquare className="h-6 w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right"><p>Open Chat</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
      <div className="p-2 border-t mt-auto">
        <Button variant="ghost" onClick={() => setIsExpanded(!isExpanded)} className="w-full">
          {isExpanded ? <ChevronsLeft className="h-5 w-5" /> : <ChevronsRight className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
