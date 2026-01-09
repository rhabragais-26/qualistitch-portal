
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardFooter } from './ui/card';
import { X, GripVertical, Upload, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LOCAL_STORAGE_KEY = 'sizeChartData';

type SizeChartInfo = {
  image: string | null;
  uploadTime: string | null;
};

type SizeChartData = {
  corporateJacket: SizeChartInfo;
  bomberJacket: SizeChartInfo;
  poloShirt: SizeChartInfo;
};

const initialSizeChartData: SizeChartData = {
  corporateJacket: { image: null, uploadTime: null },
  bomberJacket: { image: null, uploadTime: null },
  poloShirt: { image: null, uploadTime: null },
};

type TabValue = keyof SizeChartData;

export function SizeChartDialog({ onClose }: { onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  
  const [sizeChartData, setSizeChartData] = useState<SizeChartData>(initialSizeChartData);
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('corporateJacket');

  useEffect(() => {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
        setSizeChartData(JSON.parse(savedData));
    }

    if (cardRef.current) {
        const { offsetWidth, offsetHeight } = cardRef.current;
        const centerX = window.innerWidth / 2 - offsetWidth / 2;
        const centerY = window.innerHeight / 2 - offsetHeight / 2;
        setPosition({ x: centerX, y: centerY });
    } else {
        const centerX = window.innerWidth / 2 - 325; // approx half-width
        const centerY = window.innerHeight / 2 - 350;
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

  const handleImageUpload = (file: File, tab: TabValue) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setSizeChartData(prev => ({
        ...prev,
        [tab]: {
          image: e.target?.result as string,
          uploadTime: new Date().toISOString()
        }
      }));
      setIsDirty(true);
    };
    reader.readAsDataURL(file);
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>, tab: TabValue) => {
    if (e.target.files?.[0]) {
        handleImageUpload(e.target.files[0], tab);
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>, tab: TabValue) => {
    const items = e.clipboardData.items;
    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if(blob) handleImageUpload(blob, tab);
        }
    }
  };

  const removeImage = (tab: TabValue) => {
    setSizeChartData(prev => ({
      ...prev,
      [tab]: { image: null, uploadTime: null }
    }));
    setIsDirty(true);
    if(fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleSave = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sizeChartData));
    setIsDirty(false);
    onClose();
  }
  
  const renderUploadBox = (tab: TabValue) => {
    const data = sizeChartData[tab];
    return (
      <div onPaste={(e) => onPaste(e, tab)} className="h-full flex flex-col">
        <div
            tabIndex={0}
            className={cn(
                "relative group flex-1 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-700/50 min-w-[600px]",
                (!data || !data.image) && "border-2 border-dashed border-gray-600 p-4"
            )}
            onDoubleClick={() => fileInputRef.current?.click()}
            onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}
        >
            {!data || !data.image ? (
                <>
                    <Upload className="h-10 w-10 mb-2" />
                    <p>Double-click to upload or paste image</p>
                </>
            ) : (
                <>
                    <Image src={data.image} alt={`${tab} Size Chart`} layout="fill" objectFit="contain" />
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeImage(tab)}>
                        <Trash2 className="h-4 w-4"/>
                    </Button>
                </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFileChange(e, tab)}/>
        </div>
        {data && data.uploadTime && (
            <p className="text-xs text-center text-gray-500 mt-2">
                Uploaded on: {new Date(data.uploadTime).toLocaleString()}
            </p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className="fixed z-50 w-auto"
      style={{ left: `${position.x}px`, top: `${position.y}px`, height: `700px` }}
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
        <CardContent className="p-4 flex-1 flex flex-col">
          <Tabs defaultValue="corporateJacket" className="w-full h-full flex flex-col" onValueChange={(v) => setActiveTab(v as TabValue)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="corporateJacket">Corporate Jacket</TabsTrigger>
              <TabsTrigger value="bomberJacket">Bomber Jacket</TabsTrigger>
              <TabsTrigger value="poloShirt">Polo Shirt</TabsTrigger>
            </TabsList>
            <TabsContent value="corporateJacket" className="flex-1 mt-4">
              {renderUploadBox('corporateJacket')}
            </TabsContent>
            <TabsContent value="bomberJacket" className="flex-1 mt-4">
              {renderUploadBox('bomberJacket')}
            </TabsContent>
            <TabsContent value="poloShirt" className="flex-1 mt-4">
              {renderUploadBox('poloShirt')}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="p-4 flex justify-center">
            <Button 
              onClick={handleSave} 
              disabled={!isDirty} 
              className="text-white font-bold disabled:bg-gray-500 disabled:text-gray-300"
            >
                <Save className="mr-2 h-4 w-4" />
                Save Changes
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
