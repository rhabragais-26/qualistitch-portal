
'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
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
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Check, ChevronDown, Send } from 'lucide-react';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

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
  orders: Order[];
  joNumber?: number;
  isUnderProgramming?: boolean;
  isInitialApproval?: boolean;
  isLogoTesting?: boolean;
  isRevision?: boolean;
  isFinalApproval?: boolean;
  isFinalProgram?: boolean;
  isPreparedForProduction?: boolean;
  isSentToProduction?: boolean;
}

const programmingStatusOptions = [
    'All',
    'Final Program Uploaded',
    'Final Program Approved',
    'Under Revision',
    'Done Testing',
    'Initial Program Approved',
    'Done Initial Program',
    'Pending Initial Program'
];

export function ProdPreparationTable() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { toast } = useToast();
  
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'), orderBy('submissionDateTime', 'desc'));
  }, [firestore, user]);

  const { data: leads, isLoading: isLeadsLoading, error } = useCollection<Lead>(leadsQuery);

  const getProgrammingStatus = (lead: Lead): { text: string, variant: "success" | "destructive" | "warning" | "default" | "secondary" } => {
    if (lead.isFinalProgram) return { text: "Final Program Uploaded", variant: "success" as const };
    if (lead.isFinalApproval) return { text: "Final Program Approved", variant: "success" as const };
    if (lead.isRevision) return { text: "Under Revision", variant: "destructive" as const };
    if (lead.isLogoTesting) return { text: "Done Testing", variant: "warning" as const };
    if (lead.isInitialApproval) return { text: "Initial Program Approved", variant: "default" as const };
    if (lead.isUnderProgramming) return { text: "Done Initial Program", variant: "default" as const };
    if (lead.joNumber) return { text: "Pending Initial Program", variant: "secondary" as const };
    return { text: "Pending J.O.", variant: "secondary" as const };
  };

  const getContactDisplay = (lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || null;
  };

  const formatJoNumber = (joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  };

  const handleUpdateStatus = async (leadId: string, field: 'isPreparedForProduction' | 'isSentToProduction') => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', leadId);
    try {
        await updateDoc(leadDocRef, { [field]: true });
        toast({
            title: "Status Updated",
            description: "The production status has been updated successfully.",
        });
    } catch (e: any) {
        console.error(`Error updating ${field}:`, e);
        toast({
            variant: 'destructive',
            title: "Update Failed",
            description: e.message || "Could not update the status.",
        });
    }
  };


  const jobOrders = React.useMemo(() => {
    if (!leads) return [];
    
    const leadsWithJo = leads.filter(lead => lead.joNumber);
    
    return leadsWithJo.filter(lead => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ?
        (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
        (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))) ||
        (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))))
        : true;
      
      const joString = lead.joNumber?.toString().padStart(5, '0') || '';
      const formattedJoString = formatJoNumber(lead.joNumber);
      const matchesJo = joNumberSearch ? 
        (joString.includes(joNumberSearch) || formattedJoString.toLowerCase().includes(joNumberSearch.toLowerCase()))
        : true;
        
      const currentStatus = getProgrammingStatus(lead).text;
      const matchesStatus = statusFilter === 'All' || currentStatus === statusFilter;
      
      return matchesSearch && matchesJo && matchesStatus;
    });
  }, [leads, searchTerm, joNumberSearch, statusFilter]);

  const isLoading = isAuthLoading || isLeadsLoading;

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-black">Production Preparation</CardTitle>
            <CardDescription className="text-gray-600">
              Job orders ready for production preparation.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px] bg-gray-100 text-black placeholder:text-gray-500">
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                    {programmingStatusOptions.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="w-full max-w-xs">
                <Input
                  placeholder="Search customer, company, contact..."
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
      <CardContent className="flex-1 overflow-auto">
        {isLoading && (
          <div className="space-y-2 p-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-gray-200" />
            ))}
          </div>
        )}
        {error && (
          <div className="text-red-500 p-4">
            Error loading job orders: {error.message}
          </div>
        )}
        {!isLoading && !error && (
           <div className="border rounded-md h-full">
            <Table>
                <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-white font-bold align-middle w-[20%]">Customer</TableHead>
                    <TableHead className="text-white font-bold align-middle">J.O. No.</TableHead>
                    <TableHead className="text-white font-bold align-middle">Programming Status</TableHead>
                    <TableHead className="text-white font-bold align-middle w-[30%]">Ordered Items</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">Preparation Status</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">Production Endorsement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {jobOrders?.map((lead) => {
                  const programmingStatus = getProgrammingStatus(lead);
                  return (
                  <React.Fragment key={lead.id}>
                    <TableRow>
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
                           <Badge variant={programmingStatus.variant as any}>{programmingStatus.text}</Badge>
                        </TableCell>
                        <TableCell className="align-top py-1">
                            <Table className="bg-transparent">
                                <TableBody>
                                {lead.orders.map((order, index) => (
                                    <TableRow key={index} className="border-0 hover:bg-gray-50">
                                    <TableCell className="py-1 px-2 text-xs text-black w-1/3">{order.productType}</TableCell>
                                    <TableCell className="py-1 px-2 text-xs text-black w-1/3">{order.color}</TableCell>
                                    <TableCell className="py-1 px-2 text-xs text-black w-1/6">{order.size}</TableCell>
                                    <TableCell className="py-1 px-2 text-xs text-black text-right w-1/6">{order.quantity}</TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                        </TableCell>
                         <TableCell className="text-center align-middle py-2">
                           {lead.isPreparedForProduction ? (
                                <div className="flex items-center justify-center text-green-600 font-semibold">
                                    <Check className="mr-2 h-4 w-4" /> Prepared
                                </div>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={() => handleUpdateStatus(lead.id, 'isPreparedForProduction')}
                                >
                                    Prepared
                                </Button>
                            )}
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                            {lead.isSentToProduction ? (
                                <div className="flex items-center justify-center font-semibold text-gray-500">
                                    Sent
                                </div>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={() => handleUpdateStatus(lead.id, 'isSentToProduction')}
                                    disabled={!lead.isFinalProgram}
                                    className={cn(!lead.isFinalProgram && "bg-gray-400")}
                                >
                                    <Send className="mr-2 h-4 w-4" /> Send to Prod
                                </Button>
                            )}
                        </TableCell>
                    </TableRow>
                  </React.Fragment>
                )})}
                </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
    