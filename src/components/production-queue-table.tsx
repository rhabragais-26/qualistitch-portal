'use client';

import { collection, query, doc, updateDoc } from 'firebase/firestore';
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
import React, { useState, useMemo, useCallback } from 'react';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { formatDateTime } from '@/lib/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
}

type ProductionType = "Pending" | "In-house" | "Outsource";

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  orders: Order[];
  joNumber?: number;
  isSentToProduction?: boolean;
  priorityType: 'Rush' | 'Regular';
  submissionDateTime: string;
  isCutting?: boolean;
  isSewing?: boolean;
  isTrimming?: boolean;
  isDone?: boolean;
  productionType?: ProductionType;
  sewerType?: ProductionType;
}

type ProductionCheckboxField = keyof Pick<Lead, 'isTrimming' | 'isDone'>;
type ProductionSelectField = 'productionType' | 'sewerType';

export function ProductionQueueTable() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const { toast } = useToast();

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);
  
  const formatJoNumber = useCallback((joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  }, []);

  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;
    if (mobile && landline) return `${mobile} / ${landline}`;
    return mobile || landline || null;
  }, []);

  const handleStatusChange = useCallback(async (leadId: string, field: ProductionCheckboxField | ProductionSelectField, value: boolean | string) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', leadId);
    try {
      await updateDoc(leadDocRef, { [field]: value });
      toast({
        title: "Status Updated",
        description: "The production status has been updated.",
      });
    } catch (e: any) {
      console.error(`Error updating ${field}:`, e);
      toast({
        variant: 'destructive',
        title: "Update Failed",
        description: e.message || "Could not update the status.",
      });
    }
  }, [firestore, toast]);

  const productionQueue = useMemo(() => {
    if (!leads) return [];
    
    const sentToProd = leads.filter(lead => lead.isSentToProduction);
    
    return sentToProd.filter(lead => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ?
        (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)))
        : true;
      
      const joString = formatJoNumber(lead.joNumber);
      const matchesJo = joNumberSearch ? joString.toLowerCase().includes(joNumberSearch.toLowerCase()) : true;
      
      return matchesSearch && matchesJo;
    });
  }, [leads, searchTerm, joNumberSearch, formatJoNumber]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-gray-200" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading job orders: {error.message}</div>;
  }

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-black">Production Queue</CardTitle>
            <CardDescription className="text-gray-600">
              Job orders ready for production.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
              <div className="w-full max-w-xs">
                <Input
                  placeholder="Search customer, company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-100 text-black placeholder:text-gray-500"
                />
              </div>
              <div className="w-full max-w-xs">
                 <Input
                  placeholder="Search by J.O. No..."
                  value={joNumberSearch}
                  onChange={(e) => setJoNumberSearch(e.target.value)}
                  className="bg-gray-100 text-black placeholder:text-gray-500"
                />
              </div>
            </div>
        </div>
      </CardHeader>
      <CardContent>
           <div className="border rounded-md">
            <Table>
                <TableHeader className="bg-neutral-800">
                  <TableRow>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs">Customer</TableHead>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs">J.O. No.</TableHead>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs">Priority</TableHead>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs">Date Sent</TableHead>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs">Ordered Items</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Cutting</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Sewing</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Trimming</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Done</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {productionQueue?.map((lead) => (
                  <TableRow key={lead.id}>
                      <TableCell className="font-medium text-xs align-top py-3 text-black">
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                              <div className="flex items-center cursor-pointer">
                                  <span>{lead.customerName}</span>
                                  <ChevronDown className="h-4 w-4 ml-1 transition-transform [&[data-state=open]]:rotate-180" />
                              </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2 text-gray-500 space-y-1">
                              {lead.companyName && lead.companyName !== '-' && <div><strong>Company:</strong> {lead.companyName}</div>}
                              {getContactDisplay(lead) && <div><strong>Contact:</strong> {getContactDisplay(lead)}</div>}
                          </CollapsibleContent>
                        </Collapsible>
                      </TableCell>
                      <TableCell className="text-xs align-top py-3 text-black">{formatJoNumber(lead.joNumber)}</TableCell>
                      <TableCell className="align-top py-3">
                        <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                          {lead.priorityType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs align-top py-3 text-black">{formatDateTime(lead.submissionDateTime).dateTime}</TableCell>
                      <TableCell className="text-xs align-top py-3 text-black">
                        <ul className="space-y-1">
                          {lead.orders.map((order, index) => (
                            <li key={index}>
                              {order.quantity}x {order.productType} ({order.color}, {order.size})
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <Select value={lead.productionType || 'Pending'} onValueChange={(value) => handleStatusChange(lead.id, 'productionType', value)}>
                          <SelectTrigger className="w-[120px] text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="In-house">In-house</SelectItem>
                            <SelectItem value="Outsource">Outsource</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <Select value={lead.sewerType || 'Pending'} onValueChange={(value) => handleStatusChange(lead.id, 'sewerType', value)}>
                          <SelectTrigger className="w-[120px] text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="In-house">In-house</SelectItem>
                            <SelectItem value="Outsource">Outsource</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <Checkbox checked={lead.isTrimming} onCheckedChange={(checked) => handleStatusChange(lead.id, 'isTrimming', !!checked)} />
                      </TableCell>
                       <TableCell className="text-center align-middle">
                        <Checkbox checked={lead.isDone} onCheckedChange={(checked) => handleStatusChange(lead.id, 'isDone', !!checked)} />
                      </TableCell>
                  </TableRow>
                ))}
                </TableBody>
            </Table>
          </div>
      </CardContent>
    </Card>
  );
}
