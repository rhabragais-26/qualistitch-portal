'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
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

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'leads'), orderBy('submissionDateTime', 'desc'));
  }, [firestore]);

  const { data: leads, isLoading, error } = useCollection(leadsQuery);

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
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Contact No.</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>CSR</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Order Type</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads?.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>{lead.customerName}</TableCell>
                    <TableCell>{lead.contactNumber}</TableCell>
                    <TableCell>{lead.location}</TableCell>
                    <TableCell>{lead.csr}</TableCell>
                    <TableCell>
                      <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                        {lead.priorityType}
                      </Badge>
                    </TableCell>
                    <TableCell>{lead.paymentType}</TableCell>
                    <TableCell>{lead.orderType}</TableCell>
                    <TableCell>
                      {new Date(lead.submissionDateTime).toLocaleDateString()}
                    </TableCell>
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
