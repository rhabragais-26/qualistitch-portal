'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Header } from '@/components/header';
import { formatJoNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

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
  const [joFilter, setJoFilter] = useState('All');
  
  // Query for all leads.
  const allLeadsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'leads'));
  }, [firestore]);

  // This hook will now fetch all leads.
  const { data: leads, isLoading, error } = useCollection<Lead>(allLeadsQuery);

  const leadsToDisplay = useMemo(() => {
    if (!leads) return [];
    
    let filtered = leads;

    if (joFilter === 'With JO') {
      filtered = filtered.filter(lead => !!lead.joNumber);
    } else if (joFilter === 'Without JO') {
      filtered = filtered.filter(lead => !lead.joNumber);
    }

    return filtered
      .sort((a, b) => {
        const dateA = new Date(a.submissionDateTime).getTime();
        const dateB = new Date(b.submissionDateTime).getTime();
        return dateB - dateA;
      });
  }, [leads, joFilter]);

  return (
    <Header>
      <main className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
             <div className="flex justify-between items-center">
              <div>
                <CardTitle>All Orders Review</CardTitle>
                <CardDescription>A list of all orders for data integrity review.</CardDescription>
              </div>
              <Select value={joFilter} onValueChange={setJoFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by J.O." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Orders</SelectItem>
                  <SelectItem value="With JO">With J.O.</SelectItem>
                  <SelectItem value="Without JO">Without J.O.</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submission Date</TableHead>
                    <TableHead>J.O. Number</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>City/Municipality</TableHead>
                    <TableHead>SCES</TableHead>
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
                        <TableCell>{format(new Date(lead.submissionDateTime), 'MMM-dd-yy')}</TableCell>
                        <TableCell className={cn(!lead.joNumber && 'text-red-500 font-bold')}>
                          {formatJoNumber(lead.joNumber)}
                        </TableCell>
                        <TableCell>{lead.customerName}</TableCell>
                        <TableCell>{lead.city || 'N/A'}</TableCell>
                        <TableCell>{lead.salesRepresentative}</TableCell>
                        <TableCell className={cn('font-mono', !lead.deliveryDate && 'text-red-500 font-bold')}>
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
