'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
} from 'date-fns';
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
import { Upload, Trash2, ChevronLeft, ChevronRight, Edit, Plus, ArrowLeft, X } from 'lucide-react';
import Image from 'next/image';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, collection, query, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from './ui/alert-dialog';
import { ScrollArea } from './ui/scroll-area';

type MarketingEvent = {
  id: string;
  date: string;
  content: string;
  imageUrl?: string | null;
  uploadedBy?: string;
};

function EventForm({
  event,
  onSave,
  onCancel,
}: {
  event: Partial<MarketingEvent>;
  onSave: (event: Partial<MarketingEvent> & { _fileToUpload?: File }) => void;
  onClose: () => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState(event.content || '');
  const [image, setImage] = useState(event.imageUrl || null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveClick = () => {
    onSave({
      ...event,
      content,
      imageUrl: image,
      _fileToUpload: fileToUpload || undefined,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readEvent) => {
        setImage(readEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
      setFileToUpload(file);
    }
  };
  
  return (
    <div className="space-y-4 py-4">
      <div>
        <Label htmlFor="event-content">Content</Label>
        <Textarea
          id="event-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Describe the marketing plan for this day..."
          className="min-h-[100px]"
        />
      </div>
      <div>
        <Label htmlFor="event-image">Image</Label>
        <div className="mt-2 flex items-center gap-4">
          {image && (
            <div className="relative w-24 h-24">
              <Image src={image} alt="Event" layout="fill" objectFit="cover" className="rounded-md" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={() => { setImage(null); setFileToUpload(null); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Button asChild variant="outline" className="flex-1">
            <Label htmlFor="event-image-upload" className="cursor-pointer">
              <Upload className="mr-2" />
              <span>Upload Image</span>
              <input id="event-image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" ref={fileInputRef} />
            </Label>
          </Button>
        </div>
      </div>
      <DialogFooter className="pt-4">
        <Button variant="outline" onClick={onCancel}>Back to List</Button>
        <Button onClick={handleSaveClick}>Save Event</Button>
      </DialogFooter>
    </div>
  );
}

export function MarketingCalendar() {
  const { userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'marketingCalendar')) : null, [firestore]);
  const { data: events, isLoading, error } = useCollection<MarketingEvent>(eventsQuery);
  
  const [dialogView, setDialogView] = useState<'list' | 'form'>('list');
  const [currentEvent, setCurrentEvent] = useState<Partial<MarketingEvent> | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [imageInView, setImageInView] = useState<string | null>(null);


  const canEdit = useMemo(() => {
    if (!userProfile) return false;
    const allowedPositions = ['CEO', 'Sales Manager', 'Operations Manager', 'HR', 'Finance', 'Page Admin', 'SCES', 'Sales Supervisor', 'S.E Officer'];
    return allowedPositions.includes(userProfile.position);
  }, [userProfile]);
  
  const eventsByDate = useMemo(() => {
    const map = new Map<string, MarketingEvent[]>();
    if (events) {
      events.forEach(event => {
        try {
          const dateKey = format(new Date(event.date), 'yyyy-MM-dd');
          if (!map.has(dateKey)) {
            map.set(dateKey, []);
          }
          map.get(dateKey)!.push(event);
        } catch (e) {
          console.warn(`Invalid date format for event ${'\'\'\''}event.id{'\'\'\''}: ${'\'\'\''}event.date{'\'\'\''}`);
        }
      });
    }
    return map;
  }, [events]);
  
  const handleDateSelect = (date: Date | undefined) => {
    if (!date || !canEdit) return;
    
    setSelectedDate(date);
    setDialogView('list');
    setCurrentEvent(null);
    setIsDialogOpen(true);
  };
  
  const handleSaveEvent = async (eventData: Partial<MarketingEvent> & { _fileToUpload?: File }) => {
    if (!firestore || !userProfile || !eventData.content?.trim()) {
        toast({ variant: 'destructive', title: 'Content is required.' });
        return;
    }

    const isNew = !eventData.id;
    const eventId = isNew ? uuidv4() : eventData.id!;
    const storage = getStorage();

    let finalImageUrl = eventData.imageUrl;
    const fileToUpload = eventData._fileToUpload;

    if (fileToUpload && finalImageUrl?.startsWith('data:')) {
        const storageRef = ref(storage, `marketingCalendar/${'\'\'\''}eventId{'\'\'\''}/${'\'\'\''}fileToUpload.name{'\'\'\''}`);
        const uploadResult = await uploadString(storageRef, finalImageUrl, 'data_url');
        finalImageUrl = await getDownloadURL(uploadResult.ref);
    }
    
    const dataToSave: MarketingEvent = {
        id: eventId,
        date: eventData.date!,
        content: eventData.content!,
        imageUrl: finalImageUrl || null,
        uploadedBy: userProfile.nickname,
    };

    const eventDocRef = doc(firestore, 'marketingCalendar', eventId);

    try {
        await setDoc(eventDocRef, dataToSave, { merge: true });
        toast({ title: `Event ${'\'\'\''}isNew ? 'Added' : 'Updated'}` });
        setCurrentEvent(null);
        setDialogView('list');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  const handleDeleteEvent = async () => {
    if (!deletingEventId || !firestore) return;
    try {
        await deleteDoc(doc(firestore, 'marketingCalendar', deletingEventId));
        toast({ title: 'Event Deleted' });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    } finally {
        setDeletingEventId(null);
    }
  };

  
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if(isLoading) {
    return <Skeleton className="w-full h-[70vh]" />;
  }

  if(error) {
    return <p className="text-destructive">Error loading calendar events: {error.message}</p>
  }
  
  const eventsForDay = selectedDate ? eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || [] : [];

  return (
    <>
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
      <div className="flex flex-col w-full border rounded-lg h-auto">
        <header className="grid grid-cols-3 items-center px-6 py-4 border-b">
          <div className="justify-self-start">
             <h2 className="text-2xl font-bold uppercase">MARKETING CALENDAR</h2>
          </div>
          <div className="justify-self-center">
             <h2 className="text-2xl font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
          </div>
          <div className="justify-self-end">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        <div className="flex-1 grid grid-cols-7">
          {weekDays.map(day => (
            <div key={day} className="text-center font-bold border-b border-r py-2">
              {day}
            </div>
          ))}
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate.get(dateKey) || [];
            return (
              <div
                key={day.toString()}
                onClick={() => handleDateSelect(day)}
                className={cn(
                  "relative p-2 border-r border-b flex flex-col items-start justify-center min-h-[120px]",
                  isSameMonth(day, currentMonth) ? 'bg-background' : 'bg-muted/50 text-muted-foreground',
                  canEdit && 'cursor-pointer hover:bg-accent/20 transition-colors',
                  "overflow-hidden"
                )}
              >
                <time
                  dateTime={format(day, 'yyyy-MM-dd')}
                  className={cn(
                    "absolute top-2 left-2 text-sm font-medium",
                    isToday(day) && "flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, 'd')}
                </time>
                {dayEvents.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                         <ul className="w-full pl-6 pr-2 text-left list-disc list-inside">
                            {dayEvents.slice(0, 2).map((event) => (
                                <li key={event.id} className="text-xs text-foreground truncate mt-1 first:mt-0">
                                    <span>{event.content}</span>
                                </li>
                            ))}
                            {dayEvents.length > 2 && (
                                <li className="text-xs text-muted-foreground mt-1 list-none text-center">
                                    + {dayEvents.length - 2} more
                                </li>
                            )}
                        </ul>
                      </TooltipTrigger>
                       <TooltipContent className="p-0">
                        <ScrollArea className="max-h-60 w-80 modern-scrollbar">
                            <div className="p-4">
                                <ul className="list-disc pl-5 space-y-2">
                                    {dayEvents.map(event => (
                                        <li key={event.id} className="text-sm">
                                            {event.content}
                                            {event.imageUrl && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setImageInView(event.imageUrl!);
                                                    }}
                                                    className="ml-2 text-blue-500 hover:underline text-xs"
                                                >
                                                    (view photo)
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </ScrollArea>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )
          })}
        </div>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setDialogView('list'); setCurrentEvent(null); } setIsDialogOpen(open); }}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>
                    {dialogView === 'list' 
                        ? `Events for ${'\'\'\''}selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : ''}` 
                        : currentEvent?.id && events?.some(e => e.id === currentEvent.id) ? 'Edit Event' : 'Add New Event'
                    }
                </DialogTitle>
            </DialogHeader>
            {dialogView === 'list' ? (
                 <div className="py-4">
                    <ScrollArea className="max-h-80 pr-4">
                        <div className="space-y-4">
                        {eventsForDay.length > 0 ? (
                            eventsForDay.map(event => (
                            <div key={event.id} className="flex items-center justify-between gap-4 p-2 rounded-md border">
                                <div className="flex items-center gap-2 overflow-hidden">
                                {event.imageUrl && <Image src={event.imageUrl} alt="Event thumbnail" width={40} height={40} className="rounded-md" />}
                                <p className="truncate text-sm">{event.content}</p>
                                </div>
                                <div className="flex-shrink-0">
                                <Button variant="ghost" size="icon" onClick={() => { setCurrentEvent(event); setDialogView('form'); }}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingEventId(event.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            ))
                        ) : <p className="text-center text-muted-foreground">No events for this day.</p>}
                        </div>
                    </ScrollArea>
                    <DialogFooter className="pt-4 mt-4 border-t">
                        <Button onClick={() => { setCurrentEvent({ date: selectedDate!.toISOString() }); setDialogView('form'); }}>
                            <Plus className="mr-2" /> Add New Event
                        </Button>
                    </DialogFooter>
                 </div>
            ) : currentEvent ? (
                <EventForm
                    event={currentEvent}
                    onSave={handleSaveEvent}
                    onCancel={() => setDialogView('list')}
                    onClose={() => {}}
                />
            ) : null}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deletingEventId} onOpenChange={(open) => !open && setDeletingEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this event. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
