
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardFooter } from './ui/card';
import { X, GripVertical, Upload, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { isEqual } from 'lodash';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from './ui/skeleton';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type SizeChartInfo = {
  image: string | null;
  uploadTime: string | null;
  uploadedBy?: string | null;
};

type SizeChartData = {
  id?: string;
  bomberJacket: SizeChartInfo;
  poloShirt: SizeChartInfo;
  corporateJacket: SizeChartInfo;
};

const initialSizeChartData: SizeChartData = {
  bomberJacket: { image: null, uploadTime: null, uploadedBy: null },
  poloShirt: { image: null, uploadTime: null, uploadedBy: null },
  corporateJacket: { image: null, uploadTime: null, uploadedBy: null },
};

type TabValue = keyof Omit<SizeChartData, 'id'>;

export function SizeChartDialog({ onClose, onDraggingChange }: { onClose: () => void; onDraggingChange: (isDragging: boolean) => void; }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const { toast } = useToast();
  const { user, userProfile, isAdmin, isUserLoading: isAuthLoading } = useUser();
  
  const firestore = useFirestore();
  const sizeChartRef = useMemoFirebase(() => firestore ? doc(firestore, 'sizeCharts', 'default') : null, [firestore]);
  const { data: fetchedData, isLoading, refetch } = useDoc<SizeChartData>(sizeChartRef, undefined, { listen: false });

  const [sizeChartData, setSizeChartData] = useState<SizeChartData>(initialSizeChartData);
  const [filesToUpload, setFilesToUpload] = useState<Record<TabValue, File | null>>({ bomberJacket: null, poloShirt: null, corporateJacket: null });
  const [isDirty, setIsDirty] = useState(false);
  const [imageInView, setImageInView] = useState<string | null>(null);
  
  const bomberJacketInputRef = useRef<HTMLInputElement>(null);
  const poloShirtInputRef = useRef<HTMLInputElement>(null);
  const corporateJacketInputRef = useRef<HTMLInputElement>(null);

  const [deletingTab, setDeletingTab] = useState<TabValue | null>(null);

  const fileInputRefs: Record<TabValue, React.RefObject<HTMLInputElement>> = {
    bomberJacket: bomberJacketInputRef,
    poloShirt: poloShirtInputRef,
    corporateJacket: corporateJacketInputRef,
  };

  useEffect(() => {
    if (fetchedData) {
      const dataToSet = {
        bomberJacket: fetchedData.bomberJacket || { image: null, uploadTime: null, uploadedBy: null },
        poloShirt: fetchedData.poloShirt || { image: null, uploadTime: null, uploadedBy: null },
        corporateJacket: fetchedData.corporateJacket || { image: null, uploadTime: null, uploadedBy: null },
      };
      setSizeChartData(dataToSet);
    }
  }, [fetchedData]);

  useEffect(() => {
    if (isLoading) return;
    const initialCompareState = fetchedData 
      ? {
          bomberJacket: fetchedData.bomberJacket || { image: null, uploadTime: null, uploadedBy: null },
          poloShirt: fetchedData.poloShirt || { image: null, uploadTime: null, uploadedBy: null },
          corporateJacket: fetchedData.corporateJacket || { image: null, uploadTime: null, uploadedBy: null },
        } 
      : initialSizeChartData;

    setIsDirty(!isEqual(sizeChartData, initialCompareState));
  }, [sizeChartData, fetchedData, isLoading]);

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
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
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

  const handleImageUpload = (file: File, tab: TabValue) => {
    if (!isAdmin) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setSizeChartData(prev => ({
        ...prev,
        [tab]: {
          image: e.target?.result as string,
          uploadTime: new Date().toISOString(),
          uploadedBy: userProfile?.nickname || null,
        }
      }));
    };
    reader.readAsDataURL(file);
    setFilesToUpload(prev => ({ ...prev, [tab]: file }));
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>, tab: TabValue) => {
    if (e.target.files?.[0]) {
        handleImageUpload(e.target.files[0], tab);
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>, tab: TabValue) => {
    if (!isAdmin) return;
    const items = e.clipboardData.items;
    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if(blob) handleImageUpload(blob as File, tab);
        }
    }
  };

  const removeImage = (tab: TabValue) => {
    if (!isAdmin) return;
    setSizeChartData(prev => ({
      ...prev,
      [tab]: { image: null, uploadTime: null, uploadedBy: null }
    }));
    setFilesToUpload(prev => ({ ...prev, [tab]: null }));
    const fileInput = fileInputRefs[tab].current;
    if (fileInput) fileInput.value = '';
  }

  const handleConfirmDelete = () => {
    if (deletingTab) {
      removeImage(deletingTab);
      setDeletingTab(null);
    }
  };

  const handleSave = async () => {
    if (!sizeChartRef || !firestore || !userProfile) return;
  
    try {
      const storage = getStorage();
      const dataToSave: SizeChartData = JSON.parse(JSON.stringify(sizeChartData));
      
      const tabsWithNewFiles = (Object.keys(filesToUpload) as TabValue[]).filter(tab => filesToUpload[tab]);

      // Upload new files
      for (const tab of tabsWithNewFiles) {
        const file = filesToUpload[tab]!;
        const storageRef = ref(storage, `sizeCharts/${tab}/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        dataToSave[tab].image = downloadURL;
        // uploadedBy and uploadTime are already set in local state by handleImageUpload
      }
      
      // Handle deletions (image is null in local state)
      (Object.keys(dataToSave) as TabValue[]).forEach(tab => {
        if (dataToSave[tab].image === null) {
           dataToSave[tab] = { image: null, uploadTime: null, uploadedBy: null };
        }
      });

      await setDoc(sizeChartRef, { ...dataToSave, id: 'default' }, { merge: true });
  
      toast({
        title: 'Success',
        description: 'Size charts have been saved successfully.',
      });
      
      setFilesToUpload({ bomberJacket: null, poloShirt: null, corporateJacket: null });
      refetch();
      setIsDirty(false);

    } catch (error: any) {
      console.error('Error saving size charts:', error);
      const permissionError = new FirestorePermissionError({
        path: sizeChartRef.path,
        operation: 'write',
        requestResourceData: sizeChartData,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };
  
  const renderUploadBox = (tab: TabValue) => {
    const data = sizeChartData[tab];
    const canEdit = isAdmin;
    const fileInputRef = fileInputRefs[tab];

    return (
      <div onPaste={(e) => onPaste(e, tab)} className="h-full flex flex-col">
        <div
            tabIndex={0}
            className={cn(
                "relative group flex-1 rounded-lg flex flex-col items-center justify-center text-gray-400",
                canEdit && "cursor-pointer hover:bg-gray-700/50",
                data && !data.image && "border-2 border-dashed border-gray-600 p-4"
            )}
            onClick={() => data?.image && setImageInView(data.image)}
            onDoubleClick={() => canEdit && !data?.image && fileInputRef.current?.click()}
            onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}
        >
            {data && !data.image ? (
                <>
                    <Upload className="h-10 w-10 mb-2" />
                    <p>{canEdit ? "Double-click to upload or paste image" : "No image available"}</p>
                </>
            ) : data && data.image ? (
                <>
                    <Image src={data.image} alt={`${tab} Size Chart`} layout="fill" objectFit="contain" />
                    {canEdit && (
                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => {e.stopPropagation(); setDeletingTab(tab)}}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    )}
                </>
            ) : null}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFileChange(e, tab)} disabled={!canEdit} />
        </div>
        {data && data.uploadTime && (
            <p className="text-xs text-center text-gray-500 mt-2">
              Uploaded on: {new Date(data.uploadTime).toLocaleString()}
              {data.uploadedBy && ` by ${data.uploadedBy}`}
            </p>
        )}
      </div>
    );
  }

  if (isLoading || isAuthLoading) {
    return (
         <div
            className={cn("fixed z-50")}
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
         >
             <Card className="w-[550px] h-[700px] shadow-2xl bg-gray-800 text-white border-gray-700 flex flex-col">
                <CardHeader className="p-2">
                     <div className="h-8 w-full bg-gray-700 rounded-md"></div>
                </CardHeader>
                <CardContent className="p-4 flex-1">
                    <div className="space-y-4">
                        <div className="h-10 bg-gray-700 rounded-md"></div>
                        <div className="h-[500px] bg-gray-700 rounded-md"></div>
                    </div>
                </CardContent>
                <CardFooter className="p-4 flex justify-center">
                    <div className="h-10 w-32 bg-gray-700 rounded-md"></div>
                </CardFooter>
            </Card>
        </div>
    )
  }

  return (
    <>
      <div
        ref={cardRef}
        className={cn("fixed z-50 w-auto", isDragging && "select-none")}
        style={{ left: `${position.x}px`, top: `${position.y}px`, height: `700px` }}
        onMouseDown={handleMouseDown}
      >
        <Card className="w-[550px] h-full shadow-2xl bg-gray-800 text-white border-gray-700 flex flex-col">
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
            <Tabs defaultValue="bomberJacket" className="w-full h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bomberJacket">Bomber Jacket</TabsTrigger>
                <TabsTrigger value="poloShirt">Polo Shirt</TabsTrigger>
                <TabsTrigger value="corporateJacket">Corporate Jacket</TabsTrigger>
              </TabsList>
              <TabsContent value="bomberJacket" className="flex-1 mt-4">
                {renderUploadBox('bomberJacket')}
              </TabsContent>
              <TabsContent value="poloShirt" className="flex-1 mt-4">
                {renderUploadBox('poloShirt')}
              </TabsContent>
              <TabsContent value="corporateJacket" className="flex-1 mt-4">
                {renderUploadBox('corporateJacket')}
              </TabsContent>
            </Tabs>
          </CardContent>
          {isAdmin && (
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
          )}
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

      <AlertDialog open={!!deletingTab} onOpenChange={(open) => !open && setDeletingTab(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the uploaded size chart image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingTab(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
