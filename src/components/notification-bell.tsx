
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

type JoNoteNotification = {
  id: string; // noteId or global announcement timestamp
  leadId: string;
  customerName: string;
  joNumber: string; // For JO notes, this is JO number.
  noteContent: string;
  notifyAt: string; // ISO string
  isRead: boolean;
};

type GlobalAnnouncement = {
  id: string; 
  leadId: 'global';
  customerName: string; // Title like 'Non-Urgent Announcement'
  joNumber: string; // Sender
  noteContent: string;
  notifyAt: string; // ISO string
  isRead: boolean;
}

type ProgressNotification = {
    id: string;
    leadId: string;
    joNumber: string;
    customerName: string;
    companyName?: string;
    contactNumber?: string;
    message: string;
    overdueStatus: React.ReactNode;
    isRead: boolean;
    timestamp: string;
    isDisapproved: boolean;
};

type Notification = JoNoteNotification | GlobalAnnouncement | ProgressNotification;


type AppState = {
  announcementText?: string;
  announcementType?: 'banner' | 'notification';
  announcementTimestamp?: string;
  announcementSender?: string;
};

export function NotificationBell() {
  const [joNoteNotifications, setJoNoteNotifications] = useState<JoNoteNotification[]>([]);
  const [globalAnnouncements, setGlobalAnnouncements] = useState<GlobalAnnouncement[]>([]);
  const [progressNotifications, setProgressNotifications] = useState<ProgressNotification[]>([]);

  const [showAll, setShowAll] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevUnreadCountRef = useRef(0);
  const firestore = useFirestore();
  const appStateRef = useMemoFirebase(() => (firestore ? doc(firestore, 'appState', 'global') : null), [firestore]);
  const { data: appState } = useDoc<AppState>(appStateRef);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const lastProcessedAnnouncementTimestamp = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
          Notification.requestPermission().then(permission => {
              setNotificationPermission(permission);
          });
      } else {
          setNotificationPermission(Notification.permission);
      }
    }
  }, []);

  const loadLocalNotifications = () => {
    const storedJoNotes = JSON.parse(localStorage.getItem('jo-notifications') || '[]') as JoNoteNotification[];
    const now = new Date();
    const triggeredJoNotes = storedJoNotes.filter(n => isPast(new Date(n.notifyAt)));
    setJoNoteNotifications(triggeredJoNotes);

    const storedProgress = JSON.parse(localStorage.getItem('progress-notifications') || '[]') as ProgressNotification[];
    setProgressNotifications(storedProgress);
  };

  const loadGlobalAnnouncements = () => {
    const stored = JSON.parse(localStorage.getItem('global-announcements') || '[]') as GlobalAnnouncement[];
    setGlobalAnnouncements(stored);
  };

  useEffect(() => {
    loadLocalNotifications();
    loadGlobalAnnouncements();
    const interval = setInterval(loadLocalNotifications, 30000); // Check every 30 seconds
    
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'jo-notifications' || event.key === 'progress-notifications') {
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
    if (
        appState?.announcementType === 'notification' &&
        appState.announcementText &&
        appState.announcementTimestamp &&
        appState.announcementTimestamp !== lastProcessedAnnouncementTimestamp.current
    ) {
        lastProcessedAnnouncementTimestamp.current = appState.announcementTimestamp;

        const existingAnnouncements = JSON.parse(localStorage.getItem('global-announcements') || '[]') as GlobalAnnouncement[];
        const newAnnouncementId = `global-${appState.announcementTimestamp}`;

        if (!existingAnnouncements.some(a => a.id === newAnnouncementId)) {
            const newAnnouncement: GlobalAnnouncement = {
                id: newAnnouncementId,
                leadId: 'global',
                customerName: 'Non-Urgent Announcement',
                joNumber: appState.announcementSender || 'Admin',
                noteContent: appState.announcementText,
                notifyAt: appState.announcementTimestamp,
                isRead: false
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

  const sortedNotifications = useMemo(() => {
    const allNotifs: Notification[] = [
        ...joNoteNotifications, 
        ...globalAnnouncements, 
        ...progressNotifications.map(p => ({ ...p, notifyAt: p.timestamp }))
    ];
    return allNotifs.sort((a,b) => new Date(b.notifyAt).getTime() - new Date(a.notifyAt).getTime());
  }, [joNoteNotifications, globalAnnouncements, progressNotifications]);

  const unreadCount = useMemo(() => {
    const localUnread = joNoteNotifications.filter(n => !n.isRead).length;
    const globalUnread = globalAnnouncements.filter(n => !n.isRead).length;
    const progressUnread = progressNotifications.filter(n => !n.isRead).length;
    return localUnread + globalUnread + progressUnread;
  }, [joNoteNotifications, globalAnnouncements, progressNotifications]);

  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current) {
      // Check if a notification was fired very recently by another tab
      const lastFired = parseInt(localStorage.getItem('lastNotificationFiredAt') || '0', 10);
      const now = Date.now();
      
      // If a notification was fired in the last 2 seconds, suppress this one
      if (now - lastFired < 2000) {
          prevUnreadCountRef.current = unreadCount; // Still update the count to prevent future firing
          return;
      }

      // This tab will fire the notification. Record the timestamp.
      localStorage.setItem('lastNotificationFiredAt', now.toString());

      setIsAnimating(true);

      if (notificationPermission === 'granted') {
        const newNotificationsCount = unreadCount - prevUnreadCountRef.current;
        const latestNotification = sortedNotifications[0];
        let title = 'New Notification';
        let body = `You have ${newNotificationsCount} new notification(s).`;
        
        if (latestNotification) {
            if ('message' in latestNotification) { // Progress Notification
                title = `Progress: ${latestNotification.joNumber}`;
                body = latestNotification.message;
            } else if (latestNotification.leadId === 'global') { // Global Announcement
                title = `Announcement from ${latestNotification.joNumber}`;
                body = latestNotification.noteContent;
            } else { // JO Note Reminder
                title = `Reminder: ${latestNotification.joNumber}`;
                body = latestNotification.noteContent;
            }
        }

        const notification = new Notification(title, {
            body: body,
        });

        setTimeout(() => notification.close(), 5000);
      }

      const timer = setTimeout(() => setIsAnimating(false), 500); 
      return () => clearTimeout(timer);
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount, notificationPermission, sortedNotifications]);

  const handleMarkAsRead = (notificationId: string) => {
    if (notificationId.startsWith('global-')) {
        const updatedAnnouncements = globalAnnouncements.map(n => n.id === notificationId ? { ...n, isRead: true } : n);
        localStorage.setItem('global-announcements', JSON.stringify(updatedAnnouncements));
        setGlobalAnnouncements(updatedAnnouncements);
    } else if (notificationId.startsWith('progress-')) {
        const updatedProgress = progressNotifications.map(n => n.id === notificationId ? { ...n, isRead: true } : n);
        localStorage.setItem('progress-notifications', JSON.stringify(updatedProgress));
        setProgressNotifications(updatedProgress);
    }
    else {
        const allStoredNotifications: JoNoteNotification[] = JSON.parse(localStorage.getItem('jo-notifications') || '[]');
        const newStoredNotifications = allStoredNotifications.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
        );
        localStorage.setItem('jo-notifications', JSON.stringify(newStoredNotifications));
        loadLocalNotifications(); // Reload to update state
    }
  };

  const handleMarkAllAsRead = () => {
    const allStoredJoNotes: JoNoteNotification[] = JSON.parse(localStorage.getItem('jo-notifications') || '[]');
    const newStoredJoNotes = allStoredJoNotes.map(n => ({...n, isRead: true}));
    localStorage.setItem('jo-notifications', JSON.stringify(newStoredJoNotes));
    loadLocalNotifications();

    const updatedAnnouncements = globalAnnouncements.map(a => ({...a, isRead: true}));
    localStorage.setItem('global-announcements', JSON.stringify(updatedAnnouncements));
    setGlobalAnnouncements(updatedAnnouncements);

    const updatedProgress = progressNotifications.map(n => ({...n, isRead: true}));
    localStorage.setItem('progress-notifications', JSON.stringify(updatedProgress));
    setProgressNotifications(updatedProgress);
  };
  
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
      <PopoverContent onOpenAutoFocus={(event) => event.preventDefault()} className="w-96 p-0" align="end">
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
                        const isAnnouncement = 'leadId' in n && n.leadId === 'global';
                        const isProgress = 'message' in n;
                        const isNote = !isAnnouncement && !isProgress;

                        if (isProgress) {
                            const notification = n as ProgressNotification;
                            return (
                                <div 
                                    key={notification.id} 
                                    className={cn(
                                        'p-3 rounded-lg cursor-pointer hover:bg-accent/50 bg-muted/30',
                                        !notification.isRead && 'bg-blue-50'
                                    )}
                                    onClick={() => handleMarkAsRead(notification.id)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-bold">{notification.joNumber}</p>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                <p>{notification.customerName}</p>
                                                {notification.companyName && notification.companyName !== '-' && <p>{notification.companyName}</p>}
                                                {notification.contactNumber && <p>{notification.contactNumber}</p>}
                                            </div>
                                            <p className={cn("text-sm mt-2", !notification.isRead ? "text-foreground font-semibold" : "text-muted-foreground")}>
                                                {notification.message}
                                            </p>
                                            <p className={cn("text-xs mt-1", notification.isDisapproved ? "text-destructive font-bold" : "text-gray-500")}>
                                                {notification.overdueStatus}
                                            </p>
                                        </div>
                                        <Badge variant={notification.isDisapproved ? 'destructive' : 'success'}>Progress</Badge>
                                    </div>
                                    <p className={cn("text-xs mt-2", !notification.isRead ? "text-blue-600 font-bold" : "text-muted-foreground")}>
                                        {format(new Date(notification.timestamp), 'MMM dd, yyyy @ h:mm a')}
                                    </p>
                                </div>
                            )
                        }

                        const notification = n as JoNoteNotification | GlobalAnnouncement;
                        return (
                         <div 
                          key={notification.id} 
                          className={cn(
                            'p-3 rounded-lg cursor-pointer hover:bg-accent/50 bg-muted/30',
                             !notification.isRead && (isAnnouncement ? 'bg-yellow-100' : 'bg-blue-50')
                          )}
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-bold">{isAnnouncement ? 'Non-Urgent Announcement' : notification.joNumber}</p>
                                    <p className="text-xs text-muted-foreground">from {notification.joNumber}</p>
                                    <p className={cn("text-xs mt-1", !notification.isRead ? "text-foreground font-semibold" : "text-muted-foreground")}>"{notification.noteContent}"</p>
                                </div>
                                {isAnnouncement 
                                    ? <Badge variant="warning" className="ml-2 bg-yellow-200 text-yellow-800">Announcement</Badge> 
                                    : <span className="ml-2 text-destructive text-xs font-semibold whitespace-nowrap">Reminder</span>
                                }
                            </div>
                            <p className={cn("text-xs mt-2", !notification.isRead ? "text-blue-600 font-bold" : "text-muted-foreground")}>
                              {format(new Date(notification.notifyAt), 'MMM dd, yyyy @ h:mm a')}
                            </p>
                        </div>
                        )
                    })}
                  </div>
                </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-80 text-sm text-muted-foreground">
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
