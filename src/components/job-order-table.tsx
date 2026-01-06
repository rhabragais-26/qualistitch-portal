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
import { Skeleton } from './ui/skeleton';
import React, { useState, useMemo } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { useRouter } from 'next/navigation';

type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
}

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  salesRepresentative: string;
  priorityType: 'Rush' | 'Regular';
  submissionDateTime: string;
  orders: Order[];
  joNumber?: number;
  courier?: string;
}

export function JobOrderTable() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'), orderBy('submissionDateTime', 'desc'));
  }, [firestore, user]);

  const { data: leads, isLoading: isLeadsLoading, error } = useCollection<Lead>(leadsQuery);

  const handleProcessJobOrder = (lead: Lead) => {
    router.push(`/job-order/${lead.id}`);
  };

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (!searchTerm) return leads;
    
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return leads.filter(lead =>
      lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
      (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(lowercasedSearchTerm)) ||
      (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(lowercasedSearchTerm))
    );
  }, [leads, searchTerm]);

  const isLoading = isAuthLoading || isLeadsLoading;

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-black">Process Job Order</CardTitle>
              <CardDescription className="text-gray-600">
                Search for a lead and process their job order.
              </CardDescription>
            </div>
             <div className="w-full max-w-sm">
              <Input
                placeholder="Search by customer name, mobile no, or landline..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-100 text-black placeholder:text-gray-500"
              />
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {isLoading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-gray-200" />
            ))}
          </div>
        )}
        {error && (
          <div className="text-red-500">
            Error loading records: {error.message}
          </div>
        )}
        {!isLoading && !error && (
          <div className="h-full">
            <ScrollArea className="h-full w-full border rounded-md">
              <Table>
                <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-white font-bold">Customer Name</TableHead>
                    <TableHead className="text-white font-bold">Company Name</TableHead>
                    <TableHead className="text-white font-bold">Mobile No.</TableHead>
                    <TableHead className="text-white font-bold">Landline No.</TableHead>
                    <TableHead className="text-white font-bold">Courier</TableHead>
                    <TableHead className="text-white font-bold">CSR</TableHead>
                    <TableHead className="text-white font-bold">Priority</TableHead>
                    <TableHead className="text-center text-white font-bold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredLeads.map((lead) => {
                  const isJoSaved = !!lead.joNumber;
                  return (
                    <TableRow key={lead.id}>
                        <TableCell className="font-medium text-xs align-top py-2 text-black">{lead.customerName}</TableCell>
                        <TableCell className="text-xs align-top py-2 text-black">{lead.companyName === '-' ? '' : lead.companyName}</TableCell>
                        <TableCell className="text-xs align-top py-2 text-black">{lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : ''}</TableCell>
                        <TableCell className="text-xs align-top py-2 text-black">{lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : ''}</TableCell>
                        <TableCell className="text-xs align-top py-2 text-black">{lead.courier === '-' ? '' : lead.courier}</TableCell>
                        <TableCell className="text-xs align-top py-2 text-black">{lead.salesRepresentative}</TableCell>
                        <TableCell className="text-xs align-top py-2 text-black">{lead.priorityType}</TableCell>
                        <TableCell className="text-center align-top py-2">
                           <Button 
                              size="sm" 
                              className="h-8 px-3 text-white font-bold"
                              onClick={() => handleProcessJobOrder(lead)}
                              style={isJoSaved ? { backgroundColor: 'hsl(var(--accent))' } : {}}
                            >
                              {isJoSaved ? 'Edit J.O.' : 'Process J.O.'}
                            </Button>
                        </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
