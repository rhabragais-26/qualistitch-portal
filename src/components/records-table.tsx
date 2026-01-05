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
import React, { useState } from 'react';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from '@/lib/utils';

export function RecordsTable() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'), orderBy('submissionDateTime', 'desc'));
  }, [firestore, user]);

  const { data: leads, isLoading: isLeadsLoading, error } = useCollection(leadsQuery);

  const isLoading = isAuthLoading || isLeadsLoading;

  const toggleLeadDetails = (leadId: string) => {
    setOpenLeadId(openLeadId === leadId ? null : leadId);
  };

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
                  <TableHead className="text-center">Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads?.map((lead) => (
                  <Collapsible asChild key={lead.id} open={openLeadId === lead.id} onOpenChange={() => toggleLeadDetails(lead.id)}>
                    <>
                      <TableRow>
                        <TableCell className="text-sm align-middle">
                          {new Date(lead.submissionDateTime).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm align-middle">{lead.customerName}</TableCell>
                        <TableCell className="text-sm align-middle">{lead.contactNumber}</TableCell>
                        <TableCell className="text-sm align-middle">{lead.location}</TableCell>
                        <TableCell className="text-sm align-middle">{lead.csr}</TableCell>
                        <TableCell className="align-middle">
                          <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                            {lead.priorityType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm align-middle">{lead.paymentType}</TableCell>
                        <TableCell className="text-sm align-middle">{lead.orderType}</TableCell>
                        <TableCell className="text-center align-middle">
                          <CollapsibleTrigger asChild>
                             <Button variant="ghost" size="sm">
                              View
                              {openLeadId === lead.id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={9} className="p-0">
                            <div className="p-4 bg-muted/50">
                               <h4 className="font-semibold mb-2">Ordered Items</h4>
                               <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Product Type</TableHead>
                                    <TableHead>Color</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Quantity</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {lead.orders?.map((order: any, index: number) => (
                                    <TableRow key={index}>
                                      <TableCell>{order.productType}</TableCell>
                                      <TableCell>{order.color}</TableCell>
                                      <TableCell>{order.size}</TableCell>
                                      <TableCell>{order.quantity}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
