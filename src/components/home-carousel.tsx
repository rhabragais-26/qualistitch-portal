'use client';

import React, { useEffect, useState } from 'react';
import { getStorage, ref, listAll, getDownloadURL, type StorageReference } from 'firebase/storage';
import { useFirebaseApp, useUser } from '@/firebase';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

async function listAllRecursive(storageRef: StorageReference): Promise<StorageReference[]> {
    const res = await listAll(storageRef);
    const files = res.items;

    const promises = res.prefixes.map(folderRef => listAllRecursive(folderRef));
    const subfolderFiles = await Promise.all(promises);

    return files.concat(...subfolderFiles);
}

const wrap = (min: number, max: number, v: number) => {
  if (max === 0) return 0;
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

export function HomeCarousel() {
  const app = useFirebaseApp();
  const { user, isUserLoading } = useUser();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [[page, direction], setPage] = useState([0, 0]);

  const imageIndex = wrap(0, imageUrls.length, page);
  const prevIndex = wrap(0, imageUrls.length, page - 1);
  const nextIndex = wrap(0, imageUrls.length, page + 1);

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };
  
  useEffect(() => {
    if (imageUrls.length > 1) {
        const timer = setTimeout(() => {
            paginate(1);
        }, 5000);
        return () => clearTimeout(timer);
    }
  }, [page, imageUrls.length]);


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
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
          <Skeleton className="h-full w-full" />
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
    <div className="flex items-center justify-center w-full max-w-7xl gap-2">
      <Button variant="ghost" size="icon" onClick={() => paginate(-1)} className="h-16 w-16 shrink-0" disabled={imageUrls.length <= 1}>
          <ChevronLeft className="h-12 w-12 text-muted-foreground hover:text-foreground transition-colors" />
      </Button>
      <div className="relative w-full h-[700px] overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={page}
            className="absolute inset-0 flex items-center justify-center gap-4"
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 200 : -200, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction > 0 ? -200 : 200, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {imageUrls.length > 1 ? (
                <>
                    <div className="w-[25%] h-[80%] relative cursor-pointer" onClick={() => paginate(-1)}>
                        <Image
                            src={imageUrls[prevIndex]}
                            alt="Previous"
                            layout="fill"
                            objectFit="cover"
                            className="rounded-lg grayscale opacity-50 hover:opacity-100 transition-all"
                        />
                    </div>
                    <div className="w-[45%] h-full relative z-10 shadow-2xl">
                        <Image
                            src={imageUrls[imageIndex]}
                            alt={`Carousel image ${imageIndex + 1}`}
                            layout="fill"
                            objectFit="cover"
                            className="rounded-lg"
                            priority
                        />
                    </div>
                    <div className="w-[25%] h-[80%] relative cursor-pointer" onClick={() => paginate(1)}>
                        <Image
                            src={imageUrls[nextIndex]}
                            alt="Next"
                            layout="fill"
                            objectFit="cover"
                            className="rounded-lg grayscale opacity-50 hover:opacity-100 transition-all"
                        />
                    </div>
                </>
            ) : (
                <div className="w-[45%] h-full relative z-10 shadow-2xl">
                    <Image
                        src={imageUrls[imageIndex]}
                        alt={`Carousel image ${imageIndex + 1}`}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-lg"
                        priority
                    />
                </div>
            )}
        </motion.div>
       </AnimatePresence>
      </div>
      <Button variant="ghost" size="icon" onClick={() => paginate(1)} className="h-16 w-16 shrink-0" disabled={imageUrls.length <= 1}>
          <ChevronRight className="h-12 w-12 text-muted-foreground hover:text-foreground transition-colors" />
      </Button>
    </div>
  );
}
