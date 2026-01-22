
'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Bell } from 'lucide-react';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(3); // Placeholder for notification count

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 text-white hover:bg-accent/90">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <Card className="border-none shadow-none">
          <CardHeader className="p-2">
            <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              No new notifications.
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
