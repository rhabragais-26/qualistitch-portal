
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardFooter } from './ui/card';
import { X, GripVertical, Upload, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const LOCAL_STORAGE_KEY = 'sizeChartData';

type SizeChartData = {
  image: string;
  uploadTime: string;
};

export function SizeChartDialog({ onClose }: { onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 800, height: 700 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  
  const [image, setImage] = useState<string | null>(null);
  const [uploadTime, setUploadTime] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load from localStorage on mount
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
        const { image: savedImage, uploadTime: savedUploadTime }: SizeChartData = JSON.parse(savedData);
        setImage(savedImage);
        setUploadTime(savedUploadTime);
    }

    // Center the dialog on initial render
    const centerX = window.innerWidth / 2 - size.width / 2;
    const centerY = window.innerHeight / 2 - size.height / 2;
    setPosition({ x: centerX, y: centerY });
  }, [size.width, size.height]);

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

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setUploadTime(new Date().toISOString());
      setIsDirty(true);
    };
    reader.readAsDataURL(file);
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
        handleImageUpload(e.target.files[0]);
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if(blob) handleImageUpload(blob);
        }
    }
  };

  const removeImage = () => {
    setImage(null);
    setUploadTime(null);
    setIsDirty(true);
    if(fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleSave = () => {
    if (image && uploadTime) {
      const dataToSave: SizeChartData = { image, uploadTime };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    setIsDirty(false);
    onClose();
  }

  return (
    <div
      ref={cardRef}
      className="fixed z-50"
      style={{ left: `${position.x}px`, top: `${position.y}px`, width: `${size.width}px`, height: `${size.height}px` }}
      onMouseDown={handleMouseDown}
    >
      <Card className="w-full h-full shadow-2xl bg-gray-800 text-white border-gray-700 flex flex-col">
        <CardHeader 
            ref={headerRef}
            className={cn("flex flex-row items-center justify-between p-2 cursor-move", isDragging && "cursor-grabbing")}
        >
          <div className="flex items-center">
            <GripVertical className="h-5 w-5 text-gray-500"/>
            <span className="text-sm font-medium text-gray-400">Size Chart</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:bg-gray-700 hover:text-white" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col" onPaste={onPaste}>
            <div
                tabIndex={0}
                className={cn(
                    "relative group flex-1 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-700/50",
                    !image && "p-4"
                )}
                onDoubleClick={() => fileInputRef.current?.click()}
                onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}
            >
                {!image ? (
                    <>
                        <Upload className="h-10 w-10 mb-2" />
                        <p>Double-click to upload or paste image</p>
                    </>
                ) : (
                    <>
                        <Image src={image} alt="Size Chart" layout="fill" objectFit="contain" />
                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={removeImage}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange}/>
            </div>
            {uploadTime && (
                <p className="text-xs text-center text-gray-500 mt-2">
                    Uploaded on: {new Date(uploadTime).toLocaleString()}
                </p>
            )}
        </CardContent>
        <CardFooter className="p-2 flex justify-center">
            <Button onClick={handleSave} disabled={!isDirty} className="text-white font-bold">
                <Save className="mr-2 h-4 w-4" />
                Save
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
