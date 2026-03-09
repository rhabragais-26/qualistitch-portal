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

type Lead = {
  id: string;
  joNumber?: number;
  customerName: string;
  deliveryDate: string | null;
  submissionDateTime: string;
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

  // Filter for leads that have a JO number.
  const leadsToDisplay = useMemo(() => {
    if (!leads) return [];
    return leads.filter(lead => lead.joNumber);
  }, [leads]);

  return (
    <Header>
      <main className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>All Job Orders</CardTitle>
            <CardDescription>A list of all orders with a J.O. Number for review.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>J.O. Number</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Submission Date</TableHead>
                    <TableHead>Delivery Date Value</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-24 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-destructive">
                        Error loading data: {error.message}. You may need to create a Firestore index for this query. Check the browser console for a link.
                      </TableCell>
                    </TableRow>
                  ) : leadsToDisplay.length > 0 ? (
                    leadsToDisplay.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell>{formatJoNumber(lead.joNumber)}</TableCell>
                        <TableCell>{lead.customerName}</TableCell>
                        <TableCell>{new Date(lead.submissionDateTime).toLocaleDateString()}</TableCell>
                        <TableCell className={`font-mono ${lead.deliveryDate === null || lead.deliveryDate === '' ? 'text-red-500 font-bold' : ''}`}>
                          {lead.deliveryDate === null ? 'null' : lead.deliveryDate === '' ? '"" (empty string)' : lead.deliveryDate ? new Date(lead.deliveryDate).toLocaleDateString() : 'undefined'}
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
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No Job Orders found.
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
