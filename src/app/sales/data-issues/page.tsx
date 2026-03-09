
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
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
  // Query for documents where deliveryDate is exactly null.
  const leadsWithNullDeliveryDateQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'leads'), where('deliveryDate', '==', null));
  }, [firestore]);

  // This hook will now only fetch the problematic leads.
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsWithNullDeliveryDateQuery);

  // We still need to filter for those that have a JO number, as that's the context of the error.
  const leadsToDisplay = useMemo(() => {
    if (!leads) return [];
    return leads.filter(lead => lead.joNumber);
  }, [leads]);

  return (
    <Header>
      <main className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Data Integrity Check: Null Delivery Dates</CardTitle>
            <CardDescription>This temporary page lists all Job Orders where the delivery date is null. These records can cause errors on other pages.</CardDescription>
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
                        <TableCell className="font-mono text-red-500">{String(lead.deliveryDate)}</TableCell>
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
                        No Job Orders with null delivery dates found.
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
