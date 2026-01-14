'use client';

import { cn } from "@/lib/utils";

type StatusBannerProps = {
  text: string;
  backgroundColor?: string;
  backgroundClassName?: string;
  textColorClassName?: string;
  borderColor?: string;
  borderClassName?: string;
  className?: string;
};

export function StatusBanner({ 
    text, 
    backgroundColor, 
    backgroundClassName, 
    textColorClassName,
    borderColor,
    borderClassName,
    className 
}: StatusBannerProps) {
  return (
    <div className={cn(
      "relative w-44 h-8 rounded-full border-2 overflow-hidden", 
      borderClassName,
      className
    )} style={{ borderColor: borderClassName ? undefined : borderColor }}>
      <div 
        className={cn("absolute inset-0 w-full h-full", backgroundClassName)} 
        style={{ backgroundColor }}
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
