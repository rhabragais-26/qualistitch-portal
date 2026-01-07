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
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Check, ChevronDown, Send } from 'lucide-react';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

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

  const [confirmingLead, setConfirmingLead] = useState<Lead | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  
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

  const handleOpenPreparedDialog = (lead: Lead) => {
    setConfirmingLead(lead);
    setCheckedItems({});
  };

  const handleConfirmPrepared = async () => {
    if (!confirmingLead) return;
    await handleUpdateStatus(confirmingLead.id, 'isPreparedForProduction');
    setConfirmingLead(null);
  };
  
  const handleCheckboxChange = (index: number, checked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [index]: checked }));
  };

  const areAllItemsChecked = useMemo(() => {
    if (!confirmingLead) return false;
    return confirmingLead.orders.length === Object.keys(checkedItems).filter(key => checkedItems[parseInt(key)]).length;
  }, [confirmingLead, checkedItems]);


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
       {confirmingLead && (
        <AlertDialog open={!!confirmingLead} onOpenChange={() => setConfirmingLead(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are the prepared items correct?</AlertDialogTitle>
              <AlertDialogDescription>
                Please check all items to confirm they have been prepared correctly.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="max-h-60 overflow-y-auto my-4 space-y-2 pr-2">
              {confirmingLead.orders.map((order, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 rounded-md border">
                  <Checkbox
                    id={`item-${index}`}
                    checked={checkedItems[index] || false}
                    onCheckedChange={(checked) => handleCheckboxChange(index, !!checked)}
                  />
                  <Label htmlFor={`item-${index}`} className="text-sm font-normal flex-1 cursor-pointer">
                    <span className="font-bold text-teal-700">{order.quantity}x</span> {order.productType} ( Color: <span className="font-bold text-teal-700">{order.color}</span> | Size: <span className="font-bold text-teal-700">{order.size}</span> )
                  </Label>
                </div>
              ))}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>No</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmPrepared} disabled={!areAllItemsChecked}>
                Yes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-black">Production Preparation</CardTitle>
            <CardDescription className="text-gray-600">
              Job orders ready for production preparation.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Filter Program Status:</span>
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
              </div>
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
                    <TableHead rowSpan={2} className="text-white font-bold align-middle w-[20%]">Customer</TableHead>
                    <TableHead rowSpan={2} className="text-white font-bold align-middle">J.O. No.</TableHead>
                    <TableHead rowSpan={2} className="text-white font-bold align-middle">Programming Status</TableHead>
                    <TableHead colSpan={4} className="text-white font-bold align-middle text-center">Ordered Items</TableHead>
                    <TableHead rowSpan={2} className="text-white font-bold align-middle text-center">Preparation Status</TableHead>
                    <TableHead rowSpan={2} className="text-white font-bold align-middle text-center">Production Endorsement</TableHead>
                  </TableRow>
                   <TableRow>
                        <TableHead className="text-white font-bold text-xs">Product Type</TableHead>
                        <TableHead className="text-white font-bold text-xs">Color</TableHead>
                        <TableHead className="text-white font-bold text-xs">Size</TableHead>
                        <TableHead className="text-white font-bold text-xs text-right">Qty</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {jobOrders?.map((lead, leadIndex) => {
                  const programmingStatus = getProgrammingStatus(lead);
                  return (
                  <React.Fragment key={lead.id}>
                    {lead.orders.map((order, orderIndex) => (
                         <TableRow key={`${lead.id}-${orderIndex}`}>
                            {orderIndex === 0 && (
                                <TableCell rowSpan={lead.orders.length} className="font-medium text-xs align-top py-3 text-black">
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
                            )}
                            {orderIndex === 0 && (
                                <TableCell rowSpan={lead.orders.length} className="text-xs align-top py-3 text-black">{formatJoNumber(lead.joNumber)}</TableCell>
                            )}
                             {orderIndex === 0 && (
                                <TableCell rowSpan={lead.orders.length} className="align-top py-3">
                                <Badge variant={programmingStatus.variant as any}>{programmingStatus.text}</Badge>
                                </TableCell>
                            )}
                           <TableCell className="py-1 px-2 text-xs text-black">{order.productType}</TableCell>
                            <TableCell className="py-1 px-2 text-xs text-black">{order.color}</TableCell>
                            <TableCell className="py-1 px-2 text-xs text-black">{order.size}</TableCell>
                            <TableCell className="py-1 px-2 text-xs text-black text-right">{order.quantity}</TableCell>
                            {orderIndex === 0 && (
                                <TableCell rowSpan={lead.orders.length} className="text-center align-middle py-2">
                                {lead.isPreparedForProduction ? (
                                        <div className="flex items-center justify-center text-green-600 font-semibold">
                                            <Check className="mr-2 h-4 w-4" /> Prepared
                                        </div>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={() => handleOpenPreparedDialog(lead)}
                                        >
                                            Prepared
                                        </Button>
                                    )}
                                </TableCell>
                            )}
                             {orderIndex === 0 && (
                                <TableCell rowSpan={lead.orders.length} className="text-center align-middle py-2">
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
                            )}
                         </TableRow>
                    ))}
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
