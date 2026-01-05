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
  orders: Order[];
}

export function OrderStatusTable() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'), orderBy('submissionDateTime', 'desc'));
  }, [firestore, user]);

  const { data: leads, isLoading: isLeadsLoading, error } = useCollection<Lead>(leadsQuery);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (!searchTerm) return leads;
    
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return leads.filter(lead =>
      lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
      lead.contactNumber.toLowerCase().includes(lowercasedSearchTerm)
    );
  }, [leads, searchTerm]);

  const isLoading = isAuthLoading || isLeadsLoading;

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-card-foreground">Order Status</CardTitle>
              <CardDescription>
                Here are all the ordered items per customer.
              </CardDescription>
            </div>
             <div className="w-full max-w-sm">
              <Input
                placeholder="Search by customer name or contact no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
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
                  <TableHead className="text-card-foreground">Customer Name</TableHead>
                  <TableHead className="text-card-foreground">Contact No.</TableHead>
                  <TableHead className="text-card-foreground">Ordered Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                    <TableCell className="font-medium text-card-foreground align-top">{lead.customerName}</TableCell>
                    <TableCell className="text-card-foreground align-top">{lead.contactNumber}</TableCell>
                    <TableCell>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="py-1 text-card-foreground">Product</TableHead>
                            <TableHead className="py-1 text-card-foreground">Color</TableHead>
                            <TableHead className="py-1 text-card-foreground">Size</TableHead>
                            <TableHead className="py-1 text-card-foreground text-right">Quantity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lead.orders.map((order, index) => (
                            <TableRow key={index} className="border-0">
                              <TableCell className="py-1 text-xs text-card-foreground">{order.productType}</TableCell>
                              <TableCell className="py-1 text-xs text-card-foreground">{order.color}</TableCell>
                              <TableCell className="py-1 text-xs text-card-foreground">{order.size}</TableCell>
                              <TableCell className="py-1 text-xs text-card-foreground text-right">{order.quantity}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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
