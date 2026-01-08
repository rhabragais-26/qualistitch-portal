
'use client';

import { cn } from "@/lib/utils";

type StatusBannerProps = {
  text: string;
  backgroundColor?: string;
  backgroundClassName?: string;
  textColor: string;
  className?: string;
};

export function StatusBanner({ text, backgroundColor, backgroundClassName, textColor, className }: StatusBannerProps) {
  return (
    <div className={cn("relative w-48 h-8", className)}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 192 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#D4AF37', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#F7DC6F', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#B8860B', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <rect
          x="1"
          y="1"
          width="190"
          height="30"
          rx="15"
          ry="15"
          fill={backgroundColor}
          className={backgroundClassName}
          stroke="url(#gold-gradient)"
          strokeWidth="2"
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center font-bold text-xs"
        style={{ color: textColor }}
      >
        {text}
      </div>
    </div>
  );
}
