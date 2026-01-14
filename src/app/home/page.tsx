'use client';
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Header } from "@/components/header";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay"
import React, { useState, useEffect } from "react";
import { useFirebaseApp } from "@/firebase";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  );
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const firebaseApp = useFirebaseApp();

  useEffect(() => {
    const fetchImages = async () => {
      if (!firebaseApp) return;
      setIsLoading(true);
      try {
        const storage = getStorage(firebaseApp);
        const listRef = ref(storage, 'Company Profile');
        const res = await listAll(listRef);

        const urls = await Promise.all(
          res.items
            .sort((a, b) => {
              // Extract page numbers for sorting (e.g., "Page 1.png")
              const pageA = parseInt(a.name.match(/(\d+)/)?.[0] || '0', 10);
              const pageB = parseInt(b.name.match(/(\d+)/)?.[0] || '0', 10);
              return pageA - pageB;
            })
            .map((itemRef) => getDownloadURL(itemRef))
        );
        setImageUrls(urls);
      } catch (error) {
        console.error("Error fetching images from Firebase Storage:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [firebaseApp]);

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        ) : (
          <Carousel
            plugins={[plugin.current]}
            className="w-full flex-1"
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
          >
            <CarouselContent className="h-full">
              {imageUrls.map((src, index) => (
                <CarouselItem key={index} className="h-full">
                  <div className="h-full">
                    <Card className="h-full rounded-none border-none">
                      <CardContent className="flex h-full items-center justify-center p-0 relative">
                        <Image 
                          src={src} 
                          alt={`Company Profile Picture ${index + 1}`}
                          fill
                          style={{objectFit: "cover"}}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        )}
      </main>
    </div>
  );
}
