
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

type Notification = {
  id: string; // noteId or global announcement timestamp
  leadId: string;
  customerName: string;
  joNumber: string; // For JO notes, this is JO number. For announcements, it's sender.
  noteContent: string;
  notifyAt: string; // ISO string
  isRead: boolean;
};

type AppState = {
  announcementText?: string;
  announcementType?: 'banner' | 'notification';
  announcementTimestamp?: string;
  announcementSender?: string;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [globalAnnouncements, setGlobalAnnouncements] = useState<Notification[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevUnreadCountRef = useRef(0);
  const firestore = useFirestore();
  const appStateRef = useMemoFirebase(() => (firestore ? doc(firestore, 'appState', 'global') : null), [firestore]);
  const { data: appState } = useDoc<AppState>(appStateRef);

  const loadLocalNotifications = () => {
    const storedNotifications = JSON.parse(localStorage.getItem('jo-notifications') || '[]') as Notification[];
    const now = new Date();
    const triggered = storedNotifications.filter(n => isPast(new Date(n.notifyAt)));
    setNotifications(triggered);
  };

  const loadGlobalAnnouncements = () => {
    const stored = JSON.parse(localStorage.getItem('global-announcements') || '[]') as Notification[];
    setGlobalAnnouncements(stored);
  };

  useEffect(() => {
    loadLocalNotifications();
    loadGlobalAnnouncements();
    const interval = setInterval(loadLocalNotifications, 30000); // Check every 30 seconds
    
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'jo-notifications') {
            loadLocalNotifications();
        }
        if (event.key === 'global-announcements') {
            loadGlobalAnnouncements();
        }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  useEffect(() => {
    if (appState?.announcementType === 'notification' && appState.announcementText && appState.announcementTimestamp) {
        const existingAnnouncements = JSON.parse(localStorage.getItem('global-announcements') || '[]') as Notification[];
        const newAnnouncementId = `global-${appState.announcementTimestamp}`;

        // Check if this announcement already exists
        if (!existingAnnouncements.some(a => a.id === newAnnouncementId)) {
            const newAnnouncement: Notification = {
                id: newAnnouncementId,
                leadId: 'global',
                customerName: 'Non-Urgent Announcement',
                joNumber: appState.announcementSender || 'Admin',
                noteContent: appState.announcementText,
                notifyAt: appState.announcementTimestamp,
                isRead: false // Always new when it comes from appState
            };
            const updatedAnnouncements = [...existingAnnouncements, newAnnouncement];
            localStorage.setItem('global-announcements', JSON.stringify(updatedAnnouncements));
            setGlobalAnnouncements(updatedAnnouncements);
        }
    }
  }, [appState]);

  const handlePopoverOpenChange = (isOpen: boolean) => {
    if (isOpen) {
        const unreadGlobal = globalAnnouncements.filter(a => !a.isRead);
        if (unreadGlobal.length > 0) {
            const updatedAnnouncements = globalAnnouncements.map(a => ({...a, isRead: true}));
            localStorage.setItem('global-announcements', JSON.stringify(updatedAnnouncements));
            setGlobalAnnouncements(updatedAnnouncements);
        }
    }
    if (!isOpen) setShowAll(false);
  };

  const unreadCount = useMemo(() => {
    const localUnread = notifications.filter(n => !n.isRead).length;
    const globalUnread = globalAnnouncements.filter(n => !n.isRead).length;
    return localUnread + globalUnread;
  }, [notifications, globalAnnouncements]);

  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500); // Duration of the animation
      return () => clearTimeout(timer);
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const handleMarkAsRead = (notificationId: string) => {
    if (notificationId.startsWith('global-')) {
        const updatedAnnouncements = globalAnnouncements.map(n => n.id === notificationId ? { ...n, isRead: true } : n);
        localStorage.setItem('global-announcements', JSON.stringify(updatedAnnouncements));
        setGlobalAnnouncements(updatedAnnouncements);
    } else {
        const allStoredNotifications: Notification[] = JSON.parse(localStorage.getItem('jo-notifications') || '[]');
        const newStoredNotifications = allStoredNotifications.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
        );
        localStorage.setItem('jo-notifications', JSON.stringify(newStoredNotifications));
        loadLocalNotifications(); // Reload to update state
    }
  };

  const handleMarkAllAsRead = () => {
    const allStoredNotifications: Notification[] = JSON.parse(localStorage.getItem('jo-notifications') || '[]');
    const newStoredNotifications = allStoredNotifications.map(n => ({...n, isRead: true}));
    localStorage.setItem('jo-notifications', JSON.stringify(newStoredNotifications));
    loadLocalNotifications();

    const updatedAnnouncements = globalAnnouncements.map(a => ({...a, isRead: true}));
    localStorage.setItem('global-announcements', JSON.stringify(updatedAnnouncements));
    setGlobalAnnouncements(updatedAnnouncements);
  };
  
  const sortedNotifications = useMemo(() => {
    return [...notifications, ...globalAnnouncements].sort((a,b) => new Date(b.notifyAt).getTime() - new Date(a.notifyAt).getTime());
  }, [notifications, globalAnnouncements]);

  const displayedNotifications = useMemo(() => {
      if (showAll) {
          return sortedNotifications;
      }
      return sortedNotifications.slice(0, 5);
  }, [sortedNotifications, showAll]);

  return (
    <Popover onOpenChange={handlePopoverOpenChange}>
      <PopoverTrigger asChild>
        <div
          role="button"
          className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-background"
        >
          <Bell className={cn("h-6 w-6", isAnimating && "animate-buzz")} />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0">
              {unreadCount}
            </Badge>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-none shadow-none">
          <CardHeader className="p-4 border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
              {sortedNotifications.length > 0 && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
                        <Check className="mr-1 h-4 w-4"/>
                        Mark all as read
                    </Button>
                  </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {sortedNotifications.length > 0 ? (
                <ScrollArea className="h-80 modern-scrollbar">
                  <div className="p-2 space-y-1">
                    {displayedNotifications.map(n => {
                        const isAnnouncement = n.leadId === 'global';
                        return (
                         <div 
                          key={n.id} 
                          className={cn(
                            'p-3 rounded-lg cursor-pointer hover:bg-accent/50',
                            !n.isRead && (isAnnouncement ? 'bg-primary/10' : 'bg-blue-50')
                          )}
                          onClick={() => handleMarkAsRead(n.id)}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-bold">{n.customerName}</p>
                                    <p className="text-xs text-muted-foreground">from {n.joNumber}</p>
                                    <p className={cn("text-xs mt-1", !n.isRead ? "text-foreground font-semibold" : "text-muted-foreground")}>"{n.noteContent}"</p>
                                </div>
                                {isAnnouncement 
                                    ? <Badge variant="warning" className="ml-2 bg-yellow-200 text-yellow-800">Announcement</Badge> 
                                    : <span className="ml-2 text-destructive text-xs font-semibold whitespace-nowrap">Reminder</span>
                                }
                            </div>
                            <p className={cn("text-xs mt-2", !n.isRead ? "text-blue-600 font-bold" : "text-muted-foreground")}>
                              {format(new Date(n.notifyAt), 'MMM dd, yyyy @ h:mm a')}
                            </p>
                        </div>
                        )
                    })}
                  </div>
                </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                    No new notifications.
                </div>
            )}
          </CardContent>
          {sortedNotifications.length > 5 && !showAll && (
              <CardFooter className="p-2 border-t justify-center">
                  <Button variant="link" className="text-sm h-auto p-0" onClick={() => setShowAll(true)}>
                      Load older notifications
                  </Button>
              </CardFooter>
          )}
        </Card>
      </PopoverContent>
    </Popover>
  );
}
