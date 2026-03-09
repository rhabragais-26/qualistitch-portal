'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Header } from '@/components/header';
import { formatJoNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

type Lead = {
  id: string;
  joNumber?: number;
  customerName: string;
  deliveryDate: string | null;
  submissionDateTime: string;
  city?: string;
  salesRepresentative: string;
};

export default function DataIssuesPage() {
  const firestore = useFirestore();
  
  // Query for all leads.
  const allLeadsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'leads'));
  }, [firestore]);

  // This hook will now fetch all leads.
  const { data: leads, isLoading, error } = useCollection<Lead>(allLeadsQuery);

  const leadsToDisplay = useMemo(() => {
    if (!leads) return [];
    return leads
      .sort((a, b) => {
        const dateA = new Date(a.submissionDateTime).getTime();
        const dateB = new Date(b.submissionDateTime).getTime();
        return dateB - dateA;
      });
  }, [leads]);

  return (
    <Header>
      <main className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
            <CardDescription>A list of all orders for review.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>City/Municipality</TableHead>
                    <TableHead>SCES</TableHead>
                    <TableHead>Submission Date</TableHead>
                    <TableHead>J.O. Number</TableHead>
                    <TableHead>Delivery Date Value</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-24 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-destructive">
                        Error loading data: {error.message}. You may need to create a Firestore index for this query. Check the browser console for a link.
                      </TableCell>
                    </TableRow>
                  ) : leadsToDisplay.length > 0 ? (
                    leadsToDisplay.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell>{lead.customerName}</TableCell>
                        <TableCell>{lead.city || 'N/A'}</TableCell>
                        <TableCell>{lead.salesRepresentative}</TableCell>
                        <TableCell>{format(new Date(lead.submissionDateTime), 'MMM-dd-yy')}</TableCell>
                        <TableCell>{formatJoNumber(lead.joNumber)}</TableCell>
                        <TableCell className={`font-mono ${lead.deliveryDate === null || lead.deliveryDate === '' ? 'text-red-500 font-bold' : ''}`}>
                          {lead.deliveryDate === null ? 'null' : lead.deliveryDate === '' ? '"" (empty string)' : lead.deliveryDate ? format(new Date(lead.deliveryDate), 'MMM-dd-yy') : 'undefined'}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/job-order/${lead.id}`}>
                              Edit J.O.
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No orders found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </Header>
  );
}
