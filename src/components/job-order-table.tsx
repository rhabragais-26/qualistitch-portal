
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

const salesRepresentatives = ['Myreza', 'Quencess', 'Cath', 'Loise', 'Joanne', 'Thors', 'Francis', 'Junary', 'Kenneth'];

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
  lastModified: string;
  orders: Order[];
  joNumber?: number;
  courier?: string;
}

export function JobOrderTable() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [csrFilter, setCsrFilter] = useState('All');
  const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null);
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
    
    return leads.filter(lead => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ?
        (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
        (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(lowercasedSearchTerm)) ||
        (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(lowercasedSearchTerm)))
        : true;
      
      const matchesCsr = csrFilter === 'All' || lead.salesRepresentative === csrFilter;

      return matchesSearch && matchesCsr;
    });
  }, [leads, searchTerm, csrFilter]);

  const isLoading = isAuthLoading || isLeadsLoading;

  const formatJoNumber = (joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  };

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
             <div className="flex items-center gap-4">
               <Select value={csrFilter} onValueChange={setCsrFilter}>
                <SelectTrigger className="w-[180px] bg-gray-100 text-black placeholder:text-gray-500">
                  <SelectValue placeholder="Filter by CSR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All CSRs</SelectItem>
                  {salesRepresentatives.map(csr => (
                    <SelectItem key={csr} value={csr}>{csr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-full max-w-sm">
                <Input
                  placeholder="Search by customer, company, or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-100 text-black placeholder:text-gray-500"
                />
              </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {isLoading && (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-gray-200" />
            ))}
          </div>
        )}
        {error && (
          <div className="text-red-500 p-4">
            Error loading records: {error.message}
          </div>
        )}
        {!isLoading && !error && (
           <div className="border rounded-md relative h-full flex flex-col">
            <ScrollArea className="flex-1">
              <Table>
                <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-white font-bold align-middle">Customer Name</TableHead>
                    <TableHead className="text-white font-bold align-middle">Company Name</TableHead>
                    <TableHead className="text-white font-bold align-middle">Mobile No.</TableHead>
                    <TableHead className="text-white font-bold align-middle">Landline No.</TableHead>
                    <TableHead className="text-white font-bold align-middle">Courier</TableHead>
                    <TableHead className="text-white font-bold align-middle">CSR</TableHead>
                    <TableHead className="text-white font-bold align-middle">Priority</TableHead>
                    <TableHead className="text-white font-bold align-middle">J.O. No.</TableHead>
                    <TableHead className="text-center text-white font-bold align-middle">Action</TableHead>
                    <TableHead className="text-white font-bold align-middle">Date Created</TableHead>
                    <TableHead className="text-white font-bold align-middle">Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredLeads.map((lead) => {
                  const isJoSaved = !!lead.joNumber;
                  const creationDate = formatDateTime(lead.submissionDateTime);
                  const modifiedDate = formatDateTime(lead.lastModified);
                  return (
                    <TableRow key={lead.id}>
                        <TableCell className="font-medium text-xs align-middle py-2 text-black">{lead.customerName}</TableCell>
                        <TableCell className="text-xs align-middle py-2 text-black">{lead.companyName === '-' ? '' : lead.companyName}</TableCell>
                        <TableCell className="text-xs align-middle py-2 text-black">{lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : ''}</TableCell>
                        <TableCell className="text-xs align-middle py-2 text-black">{lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : ''}</TableCell>
                        <TableCell className="text-xs align-middle py-2 text-black">{lead.courier === '-' ? '' : lead.courier}</TableCell>
                        <TableCell className="text-xs align-middle py-2 text-black">{lead.salesRepresentative}</TableCell>
                        <TableCell className="align-middle py-2">
                           <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                            {lead.priorityType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-xs align-middle py-2 text-black">{formatJoNumber(lead.joNumber)}</TableCell>
                        <TableCell className="text-center align-middle py-2">
                           <Button 
                              size="sm" 
                              className={cn(
                                'h-8 px-3 text-white font-bold',
                                isJoSaved ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'
                              )}
                              onClick={() => handleProcessJobOrder(lead)}
                               onMouseEnter={() => setHoveredLeadId(lead.id)}
                               onMouseLeave={() => setHoveredLeadId(null)}
                            >
                              {isJoSaved ? (hoveredLeadId === lead.id ? 'Edit J.O.' : 'J.O. Saved') : 'Process J.O.'}
                            </Button>
                        </TableCell>
                        <TableCell className="text-xs align-middle py-2 text-black">
                          <div>{creationDate.dateTime}</div>
                          <div className="text-gray-500">{creationDate.dayOfWeek}</div>
                        </TableCell>
                        <TableCell className="text-xs align-middle py-2 text-black">
                          <div>{modifiedDate.dateTime}</div>
                          <div className="text-gray-500">{modifiedDate.dayOfWeek}</div>
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
