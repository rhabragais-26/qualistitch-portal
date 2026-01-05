'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';

export function RecordsTable() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'), orderBy('submissionDateTime', 'desc'));
  }, [firestore, user]);

  const { data: leads, isLoading: isLeadsLoading, error } = useCollection(leadsQuery);

  const isLoading = isAuthLoading || isLeadsLoading;

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-gray-500/10 text-black">
      <CardHeader>
        <CardTitle>Lead Records</CardTitle>
        <CardDescription>
          Here are all the lead entries submitted through the form.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {error && (
          <div className="text-red-500">
            Error loading records: {error.message}
          </div>
        )}
        {!isLoading && !error && (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Contact No.</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>CSR</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Order Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads?.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="text-sm">
                      {new Date(lead.submissionDateTime).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">{lead.customerName}</TableCell>
                    <TableCell className="text-sm">{lead.contactNumber}</TableCell>
                    <TableCell className="text-sm">{lead.location}</TableCell>
                    <TableCell className="text-sm">{lead.csr}</TableCell>
                    <TableCell>
                      <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                        {lead.priorityType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{lead.paymentType}</TableCell>
                    <TableCell className="text-sm">{lead.orderType}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
