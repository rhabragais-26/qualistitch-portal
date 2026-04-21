'use client';

import { Header } from '@/components/header';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

type ActivityLog = {
  id: string;
  timestamp: string;
  userNickname: string;
  action: string;
  details: string;
  leadId?: string;
  joNumber?: number;
};

export default function ActivityLogsPage() {
  const { isAdmin, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const logsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'activityLogs'), orderBy('timestamp', 'desc'));
  }, [firestore]);

  const { data: logs, isLoading, error } = useCollection<ActivityLog>(logsQuery);

  useEffect(() => {
    if (!isUserLoading && !isAdmin) {
      router.replace('/new-order');
    }
  }, [isUserLoading, isAdmin, router]);
  
  if (isUserLoading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
      <Header>
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>A record of all user activities across the portal.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[70vh] border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-neutral-800 z-10">
                    <TableRow>
                      <TableHead className="text-white">Timestamp</TableHead>
                      <TableHead className="text-white">User</TableHead>
                      <TableHead className="text-white">Action</TableHead>
                      <TableHead className="text-white">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [...Array(10)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : error ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-destructive">Error: {error.message}</TableCell></TableRow>
                    ) : logs && logs.length > 0 ? (
                      logs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs whitespace-nowrap">{formatDateTime(log.timestamp).dateTime}</TableCell>
                          <TableCell>{log.userNickname}</TableCell>
                          <TableCell className="font-medium">{log.action}</TableCell>
                          <TableCell>{log.details}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground h-48">
                          No activity logs found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </Header>
  );
}
