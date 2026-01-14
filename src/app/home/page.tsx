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
import React from "react";

const images = [
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%201.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%202.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%203.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%204.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%205.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%206.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%207.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%208.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%209.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%2010.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%2011.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%2012.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%2013.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%2014.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%2015.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%2016.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%2017.jpg",
  "https://storage.googleapis.com/studio-399912310-23c48.appspot.com/Company%20Profile%20Picture/Page%2018.jpg",
];

export default function HomePage() {
  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  )

  return (
    <Header>
      <div className="flex justify-center items-center p-4 sm:p-6 lg:p-8">
        <Carousel
          plugins={[plugin.current]}
          className="w-full max-w-4xl"
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
        >
          <CarouselContent>
            {images.map((src, index) => (
              <CarouselItem key={index}>
                <div className="p-1">
                  <Card>
                    <CardContent className="flex aspect-[16/9] items-center justify-center p-6 relative">
                      <Image 
                        src={src} 
                        alt={`Company Profile Picture ${index + 1}`}
                        layout="fill"
                        objectFit="contain"
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
      </div>
    </Header>
  );
}