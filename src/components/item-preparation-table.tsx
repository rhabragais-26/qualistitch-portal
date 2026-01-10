
'use client';

import { doc, updateDoc, collection, query } from 'firebase/firestore';
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
import { Button } from './ui/button';
import { Check, ChevronDown, Send } from 'lucide-react';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn, formatDateTime } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { addDays } from 'date-fns';

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
  orderType: string;
  submissionDateTime: string;
  isUnderProgramming?: boolean;
  isInitialApproval?: boolean;
  isLogoTesting?: boolean;
  isRevision?: boolean;
  isFinalApproval?: boolean;
  isFinalProgram?: boolean;
  isPreparedForProduction?: boolean;
  isSentToProduction?: boolean;
  isEndorsedToLogistics?: boolean;
  sentToProductionTimestamp?: string;
}

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

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

const ItemPreparationTableMemo = React.memo(function ItemPreparationTable() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { toast } = useToast();

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

  const [confirmingLead, setConfirmingLead] = useState<Lead | null>(null);
  const [leadToSend, setLeadToSend] = useState<Lead | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const getProgrammingStatus = useCallback((lead: Lead): { text: string, variant: "success" | "destructive" | "warning" | "default" | "secondary" } => {
    if (lead.isFinalProgram) return { text: "Final Program Uploaded", variant: "success" as const };
    if (lead.isFinalApproval) return { text: "Final Program Approved", variant: "default" as const };
    if (lead.isRevision) return { text: "Under Revision", variant: "warning" as const };
    if (lead.isLogoTesting) return { text: "Done Testing", variant: "warning" as const };
    if (lead.isInitialApproval) return { text: "Initial Program Approved", variant: "default" as const };
    if (lead.isUnderProgramming) return { text: "Done Initial Program", variant: "default" as const };
    if (lead.joNumber) return { text: "Pending Initial Program", variant: "secondary" as const };
    return { text: "Pending J.O.", variant: "secondary" as const };
  }, []);

  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || null;
  }, []);

  const formatJoNumber = useCallback((joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  }, []);

  const handleOpenPreparedDialog = useCallback((lead: Lead) => {
    setConfirmingLead(lead);
    setCheckedItems({});
  }, []);

  const handleUpdateStatus = useCallback(async (leadId: string, field: 'isPreparedForProduction' | 'isSentToProduction' | 'isEndorsedToLogistics') => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', leadId);
    
    const updateData: { [key: string]: any } = { [field]: true };

    if (field === 'isSentToProduction' || field === 'isEndorsedToLogistics') {
      updateData.sentToProductionTimestamp = new Date().toISOString();
    }

    try {
        await updateDoc(leadDocRef, updateData);
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
  }, [firestore, toast]);

  const handleConfirmPrepared = useCallback(async () => {
    if (!confirmingLead) return;
    await handleUpdateStatus(confirmingLead.id, 'isPreparedForProduction');
    setConfirmingLead(null);
  }, [confirmingLead, handleUpdateStatus]);
  
  const handleCheckboxChange = useCallback((index: number, checked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [index]: checked }));
  }, []);

  const areAllItemsChecked = useMemo(() => {
    if (!confirmingLead) return false;
    return confirmingLead.orders.length === Object.keys(checkedItems).filter(key => checkedItems[parseInt(key)]).length;
  }, [confirmingLead, checkedItems]);

  const handleConfirmSendToProd = useCallback(async () => {
    if (!leadToSend) return;
    await handleUpdateStatus(leadToSend.id, 'isSentToProduction');
    setLeadToSend(null);
  }, [leadToSend, handleUpdateStatus]);
  
  const handleConfirmSendToLogistics = useCallback(async () => {
    if (!leadToSend) return;
    await handleUpdateStatus(leadToSend.id, 'isEndorsedToLogistics');
    setLeadToSend(null);
  }, [leadToSend, handleUpdateStatus]);


  const processedLeads = useMemo(() => {
    if (!leads) return [];
  
    const customerOrderStats: { [key: string]: { orders: Lead[], totalCustomerQuantity: number } } = {};
  
    leads.forEach(lead => {
      const name = lead.customerName.toLowerCase();
      if (!customerOrderStats[name]) {
        customerOrderStats[name] = { orders: [], totalQuantity: 0 };
      }
      customerOrderStats[name].orders.push(lead);
      const orderQuantity = lead.orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
      customerOrderStats[name].totalQuantity += orderQuantity;
    });
  
    const enrichedLeads: EnrichedLead[] = [];
  
    Object.values(customerOrderStats).forEach(({ orders, totalQuantity }) => {
      orders.sort((a, b) => new Date(a.submissionDateTime).getTime() - new Date(b.submissionDateTime).getTime());
      orders.forEach((lead, index) => {
        enrichedLeads.push({
          ...lead,
          orderNumber: index + 1,
          totalCustomerQuantity: totalQuantity,
        });
      });
    });
  
    return enrichedLeads;
  }, [leads]);


  const jobOrders = React.useMemo(() => {
    if (!processedLeads) return [];
    
    const leadsWithJo = processedLeads.filter(lead => lead.joNumber);
    
    return leadsWithJo.filter(lead => {
      if (lead.orderType === 'Stock (Jacket Only)') {
          return true; // Always include "Stock (Jacket Only)" in this table
      }

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
  }, [processedLeads, searchTerm, joNumberSearch, statusFilter, formatJoNumber, getProgrammingStatus]);

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
                     <span className="font-bold text-teal-700">{order.quantity}x</span> ( Color: <span className="font-bold text-teal-700">{order.color}</span> | Size: <span className="font-bold text-teal-700">{order.size}</span> )
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

      {leadToSend && (
          <AlertDialog open={!!leadToSend} onOpenChange={() => setLeadToSend(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Handover</AlertDialogTitle>
                      <AlertDialogDescription>
                          Are you sure the items for J.O. {formatJoNumber(leadToSend.joNumber)} have been handed over to the {leadToSend.orderType === 'Stock (Jacket Only)' ? 'logistics' : 'production'} team?
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={leadToSend.orderType === 'Stock (Jacket Only)' ? handleConfirmSendToLogistics : handleConfirmSendToProd}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      )}

      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-black">Item Preparation for Production</CardTitle>
            <CardDescription className="text-gray-600">
              Job orders ready for item preparation for production.
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
      <CardContent>
           <div className="border rounded-md">
            <Table>
                <TableHeader className="bg-neutral-800">
                  <TableRow>
                    <TableHead className="text-white font-bold align-middle py-1 text-xs px-2 text-center">Customer</TableHead>
                    <TableHead className="text-white font-bold align-middle py-1 text-xs px-2 text-center">J.O. No.</TableHead>
                    <TableHead className="text-white font-bold align-middle py-1 text-xs px-2 text-center">Programming Status</TableHead>
                    <TableHead className="text-white font-bold align-middle py-1 text-xs px-2">Product Type</TableHead>
                    <TableHead className="text-white font-bold align-middle py-1 text-xs px-2">Color</TableHead>
                    <TableHead className="text-white font-bold align-middle py-1 text-xs px-2 text-center">Size</TableHead>
                    <TableHead className="text-white font-bold align-middle py-1 text-xs px-2 text-center">Qty</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-1 text-xs px-2">Preparation Status</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-1 text-xs px-2">Production Endorsement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {jobOrders?.map((lead) => {
                  const isRepeat = lead.orderNumber > 1;
                  const totalQuantity = lead.orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
                  const numOrders = lead.orders.length;
                  const programmingStatus = getProgrammingStatus(lead);
                  const isStockJacketOnly = lead.orderType === 'Stock (Jacket Only)';

                  return (
                    <React.Fragment key={lead.id}>
                      {lead.orders.map((order, orderIndex) => (
                          <TableRow key={`${lead.id}-${orderIndex}`} className={orderIndex === 0 ? "border-t-2 border-black" : ""}>
                              {orderIndex === 0 && (
                                  <TableCell rowSpan={numOrders + 1} className="font-medium text-xs align-middle py-3 text-black border-b-2 border-black text-center">
                                      <Collapsible>
                                          <CollapsibleTrigger asChild>
                                              <div className="flex items-center justify-center cursor-pointer">
                                                  <span>{lead.customerName}</span>
                                                  <ChevronDown className="h-4 w-4 ml-1 transition-transform [&[data-state=open]]:rotate-180" />
                                              </div>
                                          </CollapsibleTrigger>
                                          <CollapsibleContent className="pt-2 text-gray-500 space-y-1">
                                              {lead.companyName && lead.companyName !== '-' && <div><strong>Company:</strong> {lead.companyName}</div>}
                                              {getContactDisplay(lead) && <div><strong>Contact:</strong> {getContactDisplay(lead)}</div>}
                                          </CollapsibleContent>
                                      </Collapsible>
                                       {isRepeat ? (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div className="flex items-center justify-center gap-1.5 cursor-pointer mt-1">
                                                  <span className="text-xs text-yellow-600 font-semibold">Repeat Buyer</span>
                                                  <span className="flex items-center justify-center h-5 w-5 rounded-full border-2 border-yellow-600 text-yellow-700 text-[10px] font-bold">
                                                    {lead.orderNumber}
                                                  </span>
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>Total of {lead.totalCustomerQuantity} items ordered.</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        ) : (
                                          <div className="text-xs text-blue-600 font-semibold mt-1">New Customer</div>
                                        )}
                                  </TableCell>
                              )}
                              {orderIndex === 0 && (
                                  <TableCell rowSpan={numOrders + 1} className="text-xs align-middle py-3 text-black border-b-2 border-black text-center">
                                    <div>{formatJoNumber(lead.joNumber)}</div>
                                  </TableCell>
                              )}
                              {orderIndex === 0 && (
                                  <TableCell rowSpan={numOrders + 1} className="align-middle py-3 border-b-2 border-black text-center">
                                  <Badge variant={programmingStatus.variant as any}>{programmingStatus.text}</Badge>
                                  </TableCell>
                              )}
                            <TableCell className="py-1 px-2 text-xs text-black">{order.productType}</TableCell>
                              <TableCell className="py-1 px-2 text-xs text-black">{order.color}</TableCell>
                              <TableCell className="py-1 px-2 text-xs text-black text-center">{order.size}</TableCell>
                              <TableCell className="py-1 px-2 text-xs text-black text-center">{order.quantity}</TableCell>
                              {orderIndex === 0 && (
                                  <TableCell rowSpan={numOrders + 1} className="text-center align-middle py-2 border-b-2 border-black">
                                  {lead.isPreparedForProduction ? (
                                        <div className="flex items-center justify-center text-sm text-green-600 font-semibold">
                                            <Check className="mr-2 h-4 w-4" /> Prepared
                                        </div>
                                      ) : (
                                          <Button
                                              size="sm"
                                              onClick={() => handleOpenPreparedDialog(lead)}
                                              className="h-7 px-2"
                                              disabled={!isStockJacketOnly && programmingStatus.text === 'Pending Initial Program'}
                                          >
                                              Prepared
                                          </Button>
                                      )}
                                  </TableCell>
                              )}
                              {orderIndex === 0 && (
                                  <TableCell rowSpan={numOrders + 1} className="text-center align-middle py-2 border-b-2 border-black">
                                      {lead.isSentToProduction || lead.isEndorsedToLogistics ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="flex items-center text-sm text-green-600 font-semibold">
                                                <Check className="mr-2 h-4 w-4" /> Sent
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                <div>{formatDateTime(lead.sentToProductionTimestamp!).dateTimeShort}</div>
                                            </div>
                                        </div>
                                      ) : (
                                          <Button
                                              size="sm"
                                              onClick={() => setLeadToSend(lead)}
                                              disabled={!lead.isPreparedForProduction}
                                              className={cn("h-7 px-2", !lead.isPreparedForProduction && "bg-gray-400")}
                                          >
                                              <Send className="mr-2 h-4 w-4" /> 
                                              {isStockJacketOnly ? 'Send to Logistics' : 'Send to Prod'}
                                          </Button>
                                      )}
                                  </TableCell>
                              )}
                          </TableRow>
                      ))}
                      {/* Total Row */}
                      <TableRow className="border-b-2 border-black bg-gray-50">
                          <TableCell colSpan={3} className="py-1 px-2 text-xs font-bold text-right">Total Quantity</TableCell>
                          <TableCell className="py-1 px-2 text-xs text-center font-bold">{totalQuantity}</TableCell>
                      </TableRow>
                    </React.Fragment>
                )})}
                </TableBody>
            </Table>
          </div>
      </CardContent>
    </Card>
  );
});
ItemPreparationTableMemo.displayName = 'ItemPreparationTable';

export { ItemPreparationTableMemo as ItemPreparationTable };
