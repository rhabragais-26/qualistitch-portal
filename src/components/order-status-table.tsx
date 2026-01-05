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
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
}

type Lead = {
  id: string;
  customerName: string;
  contactNumber: string;
  landlineNumber?: string;
  orders: Order[];
}

export function OrderStatusTable() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'), orderBy('submissionDateTime', 'desc'));
  }, [firestore, user]);

  const { data: leads, isLoading: isLeadsLoading, error } = useCollection<Lead>(leadsQuery);

  const toggleLeadDetails = (leadId: string) => {
    setOpenLeadId(openLeadId === leadId ? null : leadId);
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
              <CardTitle className="text-black">Order Status</CardTitle>
              <CardDescription className="text-gray-600">
                Here are all the ordered items per customer.
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
                    <TableHead className="text-white">Customer Name</TableHead>
                    <TableHead className="text-white">Mobile No.</TableHead>
                    <TableHead className="text-white">Landline No.</TableHead>
                    <TableHead className="text-center text-white">Ordered Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredLeads.map((lead) => (
                  <React.Fragment key={lead.id}>
                    <TableRow>
                        <TableCell className="font-medium text-xs align-top py-2 text-black">{lead.customerName}</TableCell>
                        <TableCell className="text-xs align-top py-2 text-black">{lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : ''}</TableCell>
                        <TableCell className="text-xs align-top py-2 text-black">{lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : ''}</TableCell>
                        <TableCell className="text-center align-top py-2">
                          <Button variant="ghost" size="sm" onClick={() => toggleLeadDetails(lead.id)} className="h-8 px-2 text-black hover:bg-gray-200">
                            View
                            {openLeadId === lead.id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                          </Button>
                        </TableCell>
                    </TableRow>
                    {openLeadId === lead.id && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={4}>
                          <div className="p-2">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="py-1 px-2 text-black font-bold">Product</TableHead>
                                  <TableHead className="py-1 px-2 text-black font-bold">Color</TableHead>
                                  <TableHead className="py-1 px-2 text-black font-bold">Size</TableHead>
                                  <TableHead className="py-1 px-2 text-black font-bold text-right">Quantity</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {lead.orders.map((order, index) => (
                                  <TableRow key={index} className="border-0">
                                    <TableCell className="py-1 px-2 text-xs text-black">{order.productType}</TableCell>
                                    <TableCell className="py-1 px-2 text-xs text-black">{order.color}</TableCell>
                                    <TableCell className="py-1 px-2 text-xs text-black">{order.size}</TableCell>
                                    <TableCell className="py-1 px-2 text-xs text-black text-right">{order.quantity}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
