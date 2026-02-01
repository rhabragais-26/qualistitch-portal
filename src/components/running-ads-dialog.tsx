'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import Image from 'next/image';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { formatDateTime } from '@/lib/utils';

type AdImage = {
  name: string;
  url: string;
};

type DailyAd = {
  id: string;
  date: string;
  adAccount: string;
  images: AdImage[];
  submittedBy: string;
  timestamp: string;
};

export function RunningAdsDialog({ onClose, onDraggingChange }: { onClose: () => void; onDraggingChange: (isDragging: boolean) => void; }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const [imageInView, setImageInView] = useState<string | null>(null);
  
  const firestore = useFirestore();
  
  const dailyAdsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'dailyAds')) : null, [firestore]);
  const { data: dailyAds, isLoading, error } = useCollection<DailyAd>(dailyAdsQuery);

  const todaysAds = useMemo(() => {
    if (!dailyAds) return [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return dailyAds.filter(ad => {
      try {
        return format(new Date(ad.date), 'yyyy-MM-dd') === todayStr;
      } catch {
        return false;
      }
    });
  }, [dailyAds]);

  const allImages = useMemo(() => {
    return todaysAds?.flatMap(ad => ad.images.map(img => ({...img, adAccount: ad.adAccount, timestamp: ad.timestamp }))) || [];
  }, [todaysAds]);


  useEffect(() => {
    onDraggingChange(isDragging);
  }, [isDragging, onDraggingChange]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (cardRef.current) {
        const { offsetWidth, offsetHeight } = cardRef.current;
        const centerX = window.innerWidth / 2 - offsetWidth / 2;
        const centerY = window.innerHeight / 2 - offsetHeight / 2;
        setPosition({ x: centerX, y: centerY });
    } else {
        const centerX = window.innerWidth / 2 - 275; // approx half-width
        const centerY = window.innerHeight / 2 - 350; // approx half-height
        setPosition({ x: centerX, y: centerY });
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (headerRef.current?.contains(e.target as Node)) {
        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
    }
  }, [position.x, position.y]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
      });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <>
    <div
      ref={cardRef}
      className={cn("fixed z-50", isDragging && "select-none")}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={handleMouseDown}
    >
      <Card className="w-[550px] h-[700px] shadow-2xl bg-gray-800 text-white border-gray-600 flex flex-col">
        <CardHeader 
            ref={headerRef}
            className={cn("flex flex-row items-center justify-between p-2 cursor-move", isDragging && "cursor-grabbing")}
        >
          <div className="flex items-center">
            <GripVertical className="h-5 w-5 text-gray-500"/>
            <span className="text-sm font-medium text-gray-400">Today's Running Ads</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:bg-gray-700 hover:text-white" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col">
           {isLoading && (
              <div className="grid grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 w-full bg-gray-700" />)}
              </div>
           )}
           {error && <p className="text-destructive text-center">Error loading ads: {error.message}</p>}
           {!isLoading && !error && (
            allImages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-400">No ads running today.</p>
                </div>
            ) : (
                <ScrollArea className="h-full modern-scrollbar pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        {allImages.map((image, index) => (
                           <div key={index} className="space-y-1 group">
                             <div className="relative aspect-square w-full rounded-md overflow-hidden cursor-pointer" onClick={() => setImageInView(image.url)}>
                                <Image src={image.url} alt={image.name} layout="fill" objectFit="cover" />
                             </div>
                             <p className="text-sm text-center text-white truncate font-semibold">{image.name}</p>
                             <p className="text-xs text-center text-gray-400">{formatDateTime(image.timestamp).dateTimeShort}</p>
                           </div>
                        ))}
                    </div>
                </ScrollArea>
            )
           )}
        </CardContent>
      </Card>
    </div>
    {imageInView && (
    <div
        className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center animate-in fade-in"
        onClick={() => setImageInView(null)}
    >
        <div className="relative h-[90vh] w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <Image src={imageInView} alt="Enlarged view" layout="fill" objectFit="contain" />
            <Button
            variant="ghost"
            size="icon"
            onClick={() => setImageInView(null)}
            className="absolute top-4 right-4 text-white hover:bg-white/10 hover:text-white"
        >
            <X className="h-6 w-6" />
            <span className="sr-only">Close</span>
        </Button>
        </div>
    </div>
    )}
    </>
  );
}
