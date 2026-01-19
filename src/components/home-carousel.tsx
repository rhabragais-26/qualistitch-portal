'use client';

import React, { useEffect, useState } from 'react';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import { useFirebaseApp } from '@/firebase';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { Skeleton } from './ui/skeleton';

export function HomeCarousel() {
  const app = useFirebaseApp();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!app) return;
    const storage = getStorage(app);
    const fetchImages = async () => {
      setIsLoading(true);
      try {
        const carouselRef = ref(storage, 'Carousel');
        const res = await listAll(carouselRef);
        const urls = await Promise.all(
          res.items.map((itemRef) => getDownloadURL(itemRef))
        );
        setImageUrls(urls);
      } catch (error) {
        console.error("Error fetching carousel images:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [app]);

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Skeleton className="h-[60vh] w-full" />
      </div>
    );
  }

  if (imageUrls.length === 0) {
    return (
        <div className="w-full max-w-4xl mx-auto flex items-center justify-center h-[60vh] bg-gray-100 rounded-lg">
            <p className="text-muted-foreground">No images found in carousel storage.</p>
        </div>
    );
  }

  return (
    <Carousel
      className="w-full max-w-4xl mx-auto"
      plugins={[Autoplay({ delay: 3000, stopOnInteraction: true })]}
      opts={{ loop: true }}
    >
      <CarouselContent>
        {imageUrls.map((url, index) => (
          <CarouselItem key={index}>
            <div className="p-1">
              <Card>
                <CardContent className="relative flex aspect-video items-center justify-center p-0 overflow-hidden rounded-lg">
                  <Image
                    src={url}
                    alt={`Carousel image ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                    priority={index === 0}
                  />
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
