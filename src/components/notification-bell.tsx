
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
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

  const handleClearAll = () => {
      localStorage.setItem('jo-notifications', '[]');
      loadNotifications();
  };

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a,b) => new Date(b.notifyAt).getTime() - new Date(a.notifyAt).getTime());
  }, [notifications]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          role="button"
          className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-background"
        >
          <Bell className="h-6 w-6" />
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
                    <Button variant="destructive" size="sm" onClick={handleClearAll}>
                        <Trash2 className="mr-1 h-4 w-4"/>
                        Clear all
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
                <ScrollArea className="h-80">
                  <div className="p-2 space-y-1">
                    {sortedNotifications.map(n => (
                        <div 
                          key={n.id} 
                          className={cn(
                            'p-3 rounded-lg cursor-pointer hover:bg-accent/50',
                            !n.isRead && 'bg-blue-50 font-bold'
                          )}
                          onClick={() => handleMarkAsRead(n.id)}
                        >
                            <p className="text-sm">{n.customerName} ({n.joNumber})</p>
                            <p className={cn("text-xs mt-1", !n.isRead ? "text-foreground" : "text-muted-foreground")}>"{n.noteContent}"</p>
                            <p className={cn("text-xs mt-2", !n.isRead ? "text-blue-600" : "text-gray-500")}>
                              {format(new Date(n.notifyAt), 'MMM dd, yyyy @ h:mm a')}
                            </p>
                        </div>
                    ))}
                  </div>
                </ScrollArea>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
