'use client';

import React, { useEffect, useState } from 'react';
import { getStorage, ref, listAll, getDownloadURL, type StorageReference } from 'firebase/storage';
import { useFirebaseApp, useUser } from '@/firebase';
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

async function listAllRecursive(storageRef: StorageReference): Promise<StorageReference[]> {
    const res = await listAll(storageRef);
    const files = res.items;

    const promises = res.prefixes.map(folderRef => listAllRecursive(folderRef));
    const subfolderFiles = await Promise.all(promises);

    return files.concat(...subfolderFiles);
}

export function HomeCarousel() {
  const app = useFirebaseApp();
  const { user, isUserLoading } = useUser();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!app || isUserLoading) {
      return;
    }

    const storage = getStorage(app);
    const fetchImages = async () => {
      setIsLoading(true);
      setError(null);
      try {
          const carouselRef = ref(storage, 'Carousel');
          const allImageRefs = await listAllRecursive(carouselRef);
          
          if (allImageRefs.length === 0) {
              setImageUrls([]);
              setIsLoading(false);
              return;
          }

          const results = await Promise.allSettled(
              allImageRefs.map(itemRef => getDownloadURL(itemRef))
          );

          const successfulUrls: string[] = [];
          const failedReasons: any[] = [];

          results.forEach(result => {
              if (result.status === 'fulfilled') {
                  successfulUrls.push(result.value);
              } else {
                  console.error('Failed to get download URL:', result.reason);
                  failedReasons.push(result.reason);
              }
          });
          
          setImageUrls(successfulUrls);

          if (failedReasons.length > 0) {
              const firstError = failedReasons[0];
              let errorMessage = `Failed to load ${failedReasons.length} of ${allImageRefs.length} images.`;
              
              if (firstError.code === 'storage/object-not-found') {
                  errorMessage += " Reason: The 'Carousel' folder or images within it could not be found. Please check that the folder name is capitalized correctly and contains your images.";
              } else if (firstError.code === 'storage/unauthorized') {
                  errorMessage += " Reason: You are not authorized to view these images. Please ensure your Firebase Storage security rules for the 'Carousel' path are correctly configured for public read access.";
              } else {
                  errorMessage += ` First error: ${firstError.message}`;
              }
              setError(errorMessage);
          }

      } catch (e: any) {
          console.error("Error fetching carousel images:", e);
          if (e.code === 'storage/object-not-found') {
            setError("The 'Carousel' folder could not be found in your Firebase Storage. Please ensure it exists at the root of your storage bucket.");
          } else {
            setError(e.message || "An unknown error occurred while fetching images.");
          }
      } finally {
          setIsLoading(false);
      }
    };

    fetchImages();
  }, [app, isUserLoading]);

  if (isLoading || isUserLoading) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="p-1">
          <Card className="aspect-[3/4]">
            <CardContent className="relative flex items-center justify-center p-0 overflow-hidden rounded-lg h-full">
              <Skeleton className="h-full w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
        <div className="w-full h-full flex items-center justify-center bg-destructive/10 rounded-lg p-4">
            <p className="text-center text-destructive font-medium">{error}</p>
        </div>
    );
  }

  if (imageUrls.length === 0) {
    return (
        <div className="w-full max-w-lg mx-auto aspect-[3/4] flex items-center justify-center bg-gray-100 rounded-lg">
            <p className="text-muted-foreground">No images found in the 'Carousel' storage folder.</p>
        </div>
    );
  }

  return (
    <Carousel
      className="w-full max-w-lg"
      plugins={[Autoplay({ delay: 3000, stopOnInteraction: true })]}
      opts={{ loop: true }}
    >
      <CarouselContent>
        {imageUrls.map((url, index) => (
          <CarouselItem key={index}>
            <div className="p-1">
              <Card>
                <CardContent className="relative aspect-[3/4] flex items-center justify-center p-0 overflow-hidden rounded-lg">
                  <Image
                    src={url}
                    alt={`Carousel image ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 672px"
                    className="object-contain"
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
