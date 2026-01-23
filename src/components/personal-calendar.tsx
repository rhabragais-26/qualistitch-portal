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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, ChevronLeft, ChevronRight, Edit, Plus, ArrowLeft, Paintbrush } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, collection, query, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from './ui/alert-dialog';
import { ScrollArea } from './ui/scroll-area';

type PersonalEvent = {
  id: string;
  date: string;
  content: string;
};

function PersonalEventForm({
  event,
  onSave,
  onCancel,
}: {
  event: Partial<PersonalEvent>;
  onSave: (event: Partial<PersonalEvent>) => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState(event.content || '');

  const handleSaveClick = () => {
    onSave({
      ...event,
      content,
    });
  };
  
  return (
    <div className="space-y-4 py-4">
      <div>
        <Label htmlFor="event-content">Content</Label>
        <Textarea
          id="event-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Describe the event..."
          className="min-h-[100px]"
        />
      </div>
      <DialogFooter className="pt-4">
        <Button variant="outline" onClick={onCancel}>Back to List</Button>
        <Button onClick={handleSaveClick}>Save Event</Button>
      </DialogFooter>
    </div>
  );
}

export function PersonalCalendar() {
  const { userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const eventsQuery = useMemoFirebase(() => (firestore && userProfile) ? query(collection(firestore, 'users', userProfile.uid, 'personalCalendar')) : null, [firestore, userProfile]);
  const { data: events, isLoading, error } = useCollection<PersonalEvent>(eventsQuery);
  
  const [dialogView, setDialogView] = useState<'list' | 'form'>('list');
  const [currentEvent, setCurrentEvent] = useState<Partial<PersonalEvent> | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [theme, setTheme] = useState('default');

  useEffect(() => {
    const savedTheme = localStorage.getItem('personalCalendarTheme') || 'default';
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('personalCalendarTheme', theme);
  }, [theme]);

  const canEdit = !!userProfile;
  
  const eventsByDate = useMemo(() => {
    const map = new Map<string, PersonalEvent[]>();
    if (events) {
      events.forEach(event => {
        try {
          const dateKey = format(new Date(event.date), 'yyyy-MM-dd');
          if (!map.has(dateKey)) {
            map.set(dateKey, []);
          }
          map.get(dateKey)!.push(event);
        } catch (e) {
          console.warn(`Invalid date format for event ${event.id}: ${event.date}`);
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
  
  const handleSaveEvent = async (eventData: Partial<PersonalEvent>) => {
    if (!firestore || !userProfile || !eventData.content?.trim()) {
        toast({ variant: 'destructive', title: 'Content is required.' });
        return;
    }

    const isNew = !eventData.id;
    const eventId = isNew ? uuidv4() : eventData.id!;
    
    const dataToSave: PersonalEvent = {
        id: eventId,
        date: eventData.date!,
        content: eventData.content!,
    };

    const eventDocRef = doc(firestore, 'users', userProfile.uid, 'personalCalendar', eventId);

    try {
        await setDoc(eventDocRef, dataToSave, { merge: true });
        toast({ title: `Event ${isNew ? 'Added' : 'Updated'}` });
        setCurrentEvent(null);
        setDialogView('list');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  const handleDeleteEvent = async () => {
    if (!deletingEventId || !firestore || !userProfile) return;
    try {
        await deleteDoc(doc(firestore, 'users', userProfile.uid, 'personalCalendar', deletingEventId));
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
      <div className={cn("flex flex-col w-full border rounded-lg h-auto", `theme-${theme}`)}>
        <header className="grid grid-cols-3 items-center px-6 py-4 border-b">
          <div className="justify-self-start">
            <h2 className="text-2xl font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
          </div>
          <div className="justify-self-center">
            <h2 className="text-2xl font-bold">My Personal Calendar</h2>
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
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Paintbrush className="mr-2 h-4 w-4" />
                    Theme
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                    <DropdownMenuRadioItem value="default">Default</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="serene">Serene</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="vibrant">Vibrant</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="professional">Professional</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
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
                  "relative p-2 border-r border-b flex items-center justify-center min-h-[120px]",
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
                         <div className="mt-2 overflow-hidden w-full px-1 text-center">
                            <p className="text-xs text-foreground truncate text-center">{dayEvents[0].content}</p>
                            {dayEvents.length > 1 && <p className="text-xs text-muted-foreground mt-1 text-center">+ {dayEvents.length - 1} more</p>}
                        </div>
                      </TooltipTrigger>
                       <TooltipContent className="p-0">
                        <ScrollArea className="max-h-60 w-80 modern-scrollbar">
                            <div className="p-4">
                                <ul className="list-disc pl-5 space-y-2">
                                    {dayEvents.map(event => (
                                        <li key={event.id} className="text-sm">{event.content}</li>
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
                        ? `Events for ${selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : ''}` 
                        : currentEvent?.id ? 'Edit Event' : 'Add New Event'
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
                                <p className="truncate text-sm">{event.content}</p>
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
                <PersonalEventForm
                    event={currentEvent}
                    onSave={handleSaveEvent}
                    onCancel={() => setDialogView('list')}
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
