
'use client';

import { cn } from "@/lib/utils";

type StatusBannerProps = {
  text: string;
  backgroundColor?: string;
  backgroundClassName?: string;
  textColorClassName?: string;
  borderClassName?: string;
  className?: string;
};

export function StatusBanner({ 
    text, 
    backgroundColor, 
    backgroundClassName, 
    textColorClassName,
    borderClassName,
    className 
}: StatusBannerProps) {
  return (
    <div className={cn("relative w-48 h-8", className)}>
      <div 
        className={cn("absolute inset-0 w-full h-full border-2 rounded-full", borderClassName)} 
        style={{ backgroundColor: backgroundColor }}
      >
      </div>
      <div
        className={cn(
            "absolute inset-0 flex items-center justify-center font-bold text-xs",
            textColorClassName
        )}
      >
        {text}
      </div>
    </div>
  );
}
