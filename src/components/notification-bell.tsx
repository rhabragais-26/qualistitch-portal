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

type Notification = {
  id: string; // noteId
  leadId: string;
  customerName: string;
  joNumber: string;
  noteContent: string;
  notifyAt: string; // ISO string
  isRead: boolean;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevUnreadCountRef = useRef(0);

  const loadNotifications = () => {
    const storedNotifications = JSON.parse(localStorage.getItem('jo-notifications') || '[]') as Notification[];
    const now = new Date();
    const triggered = storedNotifications.filter(n => isPast(new Date(n.notifyAt)));
    setNotifications(triggered);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500); // Duration of the animation
      return () => clearTimeout(timer);
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const handleMarkAsRead = (notificationId: string) => {
    const allStoredNotifications: Notification[] = JSON.parse(localStorage.getItem('jo-notifications') || '[]');
    const newStoredNotifications = allStoredNotifications.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
    );
    localStorage.setItem('jo-notifications', JSON.stringify(newStoredNotifications));
    loadNotifications(); // Reload to update state
  };

  const handleMarkAllAsRead = () => {
    const allStoredNotifications: Notification[] = JSON.parse(localStorage.getItem('jo-notifications') || '[]');
    const newStoredNotifications = allStoredNotifications.map(n => ({...n, isRead: true}));
    localStorage.setItem('jo-notifications', JSON.stringify(newStoredNotifications));
    loadNotifications();
  };

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a,b) => new Date(b.notifyAt).getTime() - new Date(a.notifyAt).getTime());
  }, [notifications]);
  
  const displayedNotifications = useMemo(() => {
      if (showAll) {
          return sortedNotifications;
      }
      return sortedNotifications.slice(0, 5);
  }, [sortedNotifications, showAll]);

  return (
    <Popover onOpenChange={(isOpen) => { if (!isOpen) setShowAll(false); }}>
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
              {notifications.length > 0 && (
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
            {notifications.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                    No new notifications.
                </div>
            ) : (
                <ScrollArea className="h-80 modern-scrollbar">
                  <div className="p-2 space-y-1">
                    {displayedNotifications.map(n => (
                        <div 
                          key={n.id} 
                          className={cn(
                            'p-3 rounded-lg cursor-pointer hover:bg-accent/50',
                            !n.isRead && 'bg-blue-50 font-bold'
                          )}
                          onClick={() => handleMarkAsRead(n.id)}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm">{n.customerName} ({n.joNumber})</p>
                                    <p className={cn("text-xs mt-1", !n.isRead ? "text-foreground" : "text-muted-foreground")}>"{n.noteContent}"</p>
                                </div>
                                <span className="ml-2 text-destructive text-xs font-semibold whitespace-nowrap">Reminder</span>
                            </div>
                            <p className={cn("text-xs mt-2", !n.isRead ? "text-blue-600" : "text-muted-foreground")}>
                              {format(new Date(n.notifyAt), 'MMM dd, yyyy @ h:mm a')}
                            </p>
                        </div>
                    ))}
                  </div>
                </ScrollArea>
            )}
          </CardContent>
          {notifications.length > 5 && !showAll && (
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
