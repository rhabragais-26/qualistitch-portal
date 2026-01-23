'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, collection, query } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

type MarketingEvent = {
  id: string; // YYYY-MM-DD
  date: string;
  content: string;
  imageUrl?: string | null;
  uploadedBy?: string;
};

export function MarketingCalendar() {
  const { userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'marketingCalendar')) : null, [firestore]);
  const { data: events, isLoading, error } = useCollection<MarketingEvent>(eventsQuery);

  const [dialogContent, setDialogContent] = useState('');
  const [dialogImage, setDialogImage] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const canEdit = useMemo(() => {
    if (!userProfile) return false;
    const allowedPositions = ['CEO', 'Sales Manager', 'Operations Manager', 'HR', 'Finance', 'Page Admin', 'SCES', 'Sales Supervisor', 'S.E Officer'];
    return allowedPositions.includes(userProfile.position);
  }, [userProfile]);
  
  const eventsMap = useMemo(() => {
    const map = new Map<string, MarketingEvent>();
    if (events) {
      events.forEach(event => map.set(event.id, event));
    }
    return map;
  }, [events]);
  
  const handleDateSelect = (date: Date | undefined) => {
    if (!date || !canEdit) return;
    
    const adjustedDate = new Date(date.getTime() - date.getTimezoneOffset() * -60000);

    setSelectedDate(adjustedDate);
    const dateKey = format(adjustedDate, 'yyyy-MM-dd');
    const existingEvent = eventsMap.get(dateKey);

    setDialogContent(existingEvent?.content || '');
    setDialogImage(existingEvent?.imageUrl || null);
    setFileToUpload(null);
    setIsDialogOpen(true);
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readEvent) => {
        setDialogImage(readEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
      setFileToUpload(file);
    }
  };
  
  const handleSave = async () => {
    if (!selectedDate || !firestore || !userProfile) return;

    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const eventDocRef = doc(firestore, 'marketingCalendar', dateKey);

    let imageUrl = dialogImage;
    if (fileToUpload && imageUrl) {
        const storage = getStorage();
        const storageRef = ref(storage, `marketingCalendar/${dateKey}/${fileToUpload.name}`);
        await uploadString(storageRef, imageUrl, 'data_url');
        imageUrl = await getDownloadURL(storageRef);
    }

    const eventData: MarketingEvent = {
        id: dateKey,
        date: selectedDate.toISOString(),
        content: dialogContent,
        imageUrl: imageUrl || null,
        uploadedBy: userProfile.nickname,
    };

    try {
        await setDoc(eventDocRef, eventData, { merge: true });
        toast({ title: 'Event Saved', description: 'Your changes have been saved to the calendar.' });
        setIsDialogOpen(false);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    }
  };

  const DayWithDot: React.FC<{ date: Date }> = ({ date }) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const hasEvent = eventsMap.has(dateKey);
    const event = eventsMap.get(dateKey);

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span>{date.getDate()}</span>
        {hasEvent && (
           <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="absolute bottom-1 w-2 h-2 rounded-full bg-primary" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col gap-2 p-2 max-w-xs">
                    {event?.imageUrl && <Image src={event.imageUrl} alt="Event" width={100} height={100} className="rounded-md" />}
                    <p className="text-sm font-semibold">{event?.content}</p>
                  </div>
                </TooltipContent>
            </Tooltip>
           </TooltipProvider>
        )}
      </div>
    );
  };
  
  if(isLoading) {
    return <Skeleton className="w-full h-[600px]" />;
  }

  if(error) {
    return <p className="text-destructive">Error loading calendar events: {error.message}</p>
  }

  return (
    <>
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleDateSelect}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        className="rounded-md border p-0 w-full h-full"
        classNames={{
            root: "h-full flex flex-col",
            months: "flex flex-col sm:flex-row flex-1",
            month: "space-y-4 flex-1 flex flex-col p-4",
            table: "flex-1",
            tbody: "h-full",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-full basis-0 flex-1 justify-center items-center font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "text-center text-sm p-0 relative basis-0 flex-1 aspect-square [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: "h-full w-full p-0 font-normal aria-selected:opacity-100",
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
        }}
        components={{
          DayContent: (props) => <DayWithDot {...props} />,
        }}
        disabled={!canEdit}
      />
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Event for {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : ''}</DialogTitle>
                <DialogDescription>Add or edit the content and image for this date.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div>
                    <Label htmlFor="event-content">Content</Label>
                    <Textarea 
                        id="event-content"
                        value={dialogContent}
                        onChange={(e) => setDialogContent(e.target.value)}
                        placeholder="Describe the marketing plan for this day..."
                        className="min-h-[100px]"
                    />
                </div>
                <div>
                    <Label htmlFor="event-image">Image</Label>
                    <div className="mt-2 flex items-center gap-4">
                        {dialogImage && (
                            <div className="relative w-24 h-24">
                                <Image src={dialogImage} alt="Event" layout="fill" objectFit="cover" className="rounded-md" />
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                    onClick={() => { setDialogImage(null); setFileToUpload(null); }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <Button asChild variant="outline" className="flex-1">
                            <Label htmlFor="event-image-upload" className="cursor-pointer">
                                <Upload className="mr-2" />
                                <span>Upload Image</span>
                                <input id="event-image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </Label>
                        </Button>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleSave}>Save</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
