

'use client';

import { doc, updateDoc, collection, query } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronDown, Send, ChevronUp } from 'lucide-react';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Input } from './ui/input';
import { cn, formatDateTime, toTitleCase, formatJoNumber } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from './ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { addDays, format } from 'date-fns';

type Order = { productType: string; color: string; size: string; quantity: number; };
type Lead = { id: string; customerName: string; companyName?: string; contactNumber: string; landlineNumber?: string; orders: Order[]; joNumber?: number; orderType: string; submissionDateTime: string; isDigitizingArchived?: boolean; isJoHardcopyReceived?: boolean; joHardcopyReceivedTimestamp?: string; isPreparedForProduction?: boolean; isSentToProduction?: boolean; endorsedToLogisticsTimestamp?: string; isEndorsedToLogistics?: boolean; forceNewCustomer?: boolean; lastModifiedBy?: string; endorsedToLogisticsBy?: string; priorityType: 'Rush' | 'Regular'; };
type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};
type ItemPreparationTableProps = { isReadOnly: boolean; filterType?: 'ONGOING' | 'COMPLETED'; };

// Helper components are often co-located or imported. Assuming they are available.
const ItemPreparationTableRowGroup = React.memo(function ItemPreparationTableRowGroup({ lead, isRepeat, getProgrammingStatus, formatJoNumber, getContactDisplay, handleJoReceivedChange, handleOpenPreparedDialog, setLeadToSend, isReadOnly, filterType, openCustomerDetails, toggleCustomerDetails }: any) {
  const totalQuantity = lead.orders.reduce((sum: number, order: Order) => sum + (order.quantity || 0), 0);
  const numOrders = lead.orders.length;
  const programmingStatus = getProgrammingStatus(lead);
  const shouldSkipProduction = ['Stock (Jacket Only)', 'Stock Design', 'Item Sample'].includes(lead.orderType);
  const isCompleted = filterType === 'COMPLETED';

  return (
      <React.Fragment>
          {lead.orders.map((order: Order, orderIndex: number) => (
              <TableRow key={`${lead.id}-${orderIndex}`} className={orderIndex === 0 ? "border-t-2 border-black" : ""}>
                  {orderIndex === 0 && (
                      <TableCell rowSpan={numOrders + 1} className="font-medium text-xs align-middle py-3 text-black border-b-2 border-black text-center">
                           <div className="flex items-center justify-center">
                            <Button variant="ghost" size="sm" onClick={() => toggleCustomerDetails(lead.id)} className="h-5 px-1 mr-1">
                              {openCustomerDetails === lead.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            <div className='flex flex-col items-center'>
                              <span className="font-medium">{toTitleCase(lead.customerName)}</span>
                              {isRepeat ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1.5 cursor-pointer mt-1">
                                        <span className="text-xs text-yellow-600 font-semibold">Repeat Buyer</span>
                                        <span className="flex items-center justify-center h-5 w-5 rounded-full border-2 border-yellow-600 text-yellow-700 text-[10px] font-bold">
                                          {lead.orderNumber + 1}
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
                              {openCustomerDetails === lead.id && (
                                <div className="mt-1 space-y-0.5 text-gray-500 text-[11px] font-normal">
                                  {lead.companyName && lead.companyName !== '-' && <div>{toTitleCase(lead.companyName)}</div>}
                                  {getContactDisplay(lead) && <div>{getContactDisplay(lead)}</div>}
                                </div>
                              )}
                            </div>
                          </div>
                      </TableCell>
                  )}
                  {orderIndex === 0 && (
                    <TableCell rowSpan={numOrders + 1} className="text-xs align-middle py-3 text-black border-b-2 border-black text-center">
                      <div>{formatJoNumber(lead.joNumber)}</div>
                      <div className="text-gray-500 text-sm font-bold mt-1">{lead.orderType}</div>
                    </TableCell>
                  )}
                  {orderIndex === 0 && <TableCell rowSpan={numOrders + 1} className="align-middle py-3 border-b-2 border-black text-center"><Badge variant={programmingStatus.variant}>{programmingStatus.text}</Badge></TableCell>}
                  {orderIndex === 0 && (
                    <TableCell rowSpan={numOrders + 1} className="align-middle py-3 border-b-2 border-black text-center">
                        <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                            {lead.priorityType}
                        </Badge>
                    </TableCell>
                  )}
                  {orderIndex === 0 && (
                      <TableCell rowSpan={numOrders + 1} className="text-center align-middle py-2 border-b-2 border-black">
                          <div className="flex flex-col items-center justify-center gap-1">
                              <Checkbox
                                  checked={lead.isJoHardcopyReceived || false}
                                  onCheckedChange={(checked) => handleJoReceivedChange(lead.id, !!checked)}
                                  disabled={shouldSkipProduction ? false : !lead.isDigitizingArchived || isReadOnly || isCompleted}
                                  className={isReadOnly || isCompleted ? 'disabled:opacity-100' : ''}
                              />
                              {lead.joHardcopyReceivedTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.joHardcopyReceivedTimestamp).dateTimeShort}</div>}
                          </div>
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
                                  disabled={isReadOnly || isCompleted || !(lead.isJoHardcopyReceived || shouldSkipProduction)}
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
                                  {lead.endorsedToLogisticsTimestamp && (
                                    <div className="text-xs text-gray-500">
                                      <div>{formatDateTime(lead.endorsedToLogisticsTimestamp).dateTimeShort}</div>
                                      {lead.endorsedToLogisticsBy && <div className="font-bold">by {lead.endorsedToLogisticsBy}</div>}
                                    </div>
                                  )}
                              </div>
                          ) : (
                              <Button
                                  size="sm"
                                  onClick={() => setLeadToSend(lead)}
                                  disabled={!lead.isPreparedForProduction || isReadOnly || isCompleted}
                                  className={cn("h-7 px-2", !lead.isPreparedForProduction && "bg-gray-400")}
                              >
                                  {shouldSkipProduction ? 'Send to Logistics' : 'Send to Prod'}
                              </Button>
                          )}
                      </TableCell>
                  )}
              </TableRow>
          ))}
          <TableRow className="border-b-2 border-black bg-gray-50">
              <TableCell colSpan={3} className="py-1 px-2 text-xs font-bold text-right">Total Quantity</TableCell>
              <TableCell className="py-1 px-2 text-xs text-center font-bold">{totalQuantity}</TableCell>
          </TableRow>
      </React.Fragment>
  );
});
ItemPreparationTableRowGroup.displayName = 'ItemPreparationTableRowGroup';


const ItemPreparationTableMemo = React.memo(function ItemPreparationTable({ isReadOnly, filterType = 'ONGOING' }: ItemPreparationTableProps) {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [confirmingLead, setConfirmingLead] = useState<Lead | null>(null);
  const [leadToSend, setLeadToSend] = useState<Lead | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [uncheckConfirmation, setUncheckConfirmation] = useState<{ leadId: string; field: 'isJoHardcopyReceived'; } | null>(null);
  const [joReceivedConfirmation, setJoReceivedConfirmation] = useState<string | null>(null);
  const [openCustomerDetails, setOpenCustomerDetails] = useState<string | null>(null);

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading: areLeadsLoading, error: leadsError, refetch: refetchLeads } = useCollection<Lead>(leadsQuery, undefined, { listen: false });
  
  const isLoading = areLeadsLoading;
  const error = leadsError;


  const getProgrammingStatus = useCallback((lead: Lead): { text: string, variant: "success" | "destructive" | "warning" | "default" | "secondary" } => {
    if (['Stock (Jacket Only)', 'Stock Design', 'Item Sample'].includes(lead.orderType)) {
        return { text: "Skipped", variant: "secondary" };
    }
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

  const handleOpenPreparedDialog = useCallback((lead: Lead) => {
    setConfirmingLead(lead);
    setCheckedItems({});
  }, []);

  const handleUpdateStatus = useCallback(async (leadId: string, field: 'isPreparedForProduction' | 'isSentToProduction' | 'isEndorsedToLogistics' | 'isJoHardcopyReceived', value: boolean) => {
    if (!firestore || !userProfile) return;
    const leadDocRef = doc(firestore, 'leads', leadId);
    
    const updateData: { [key: string]: any } = { 
        [field]: value,
        lastModified: new Date().toISOString(),
        lastModifiedBy: userProfile.nickname,
    };

    if (field === 'isJoHardcopyReceived') {
        updateData.joHardcopyReceivedTimestamp = value ? new Date().toISOString() : null;
    } else if (field === 'isSentToProduction' || field === 'isEndorsedToLogistics') {
      updateData.endorsedToLogisticsTimestamp = new Date().toISOString();
      updateData.endorsedToLogisticsBy = userProfile.nickname;
    }

    try {
        await updateDoc(leadDocRef, updateData);
        toast({
            title: "Status Updated",
            description: "The status has been updated successfully.",
        });
        refetchLeads();
    } catch (e: any) {
        console.error(`Error updating ${field}:`, e);
        toast({
            variant: 'destructive',
            title: "Update Failed",
            description: e.message || "Could not update the status.",
        });
    }
  }, [firestore, toast, refetchLeads, userProfile]);
  
  const handleJoReceivedChange = useCallback((leadId: string, checked: boolean) => {
    const lead = leads?.find((l) => l.id === leadId);
    if (!lead) return;
    const isCurrentlyChecked = lead.isJoHardcopyReceived || false;

    if (!checked && isCurrentlyChecked) {
      setUncheckConfirmation({ leadId, field: 'isJoHardcopyReceived' });
    } else if (checked && !isCurrentlyChecked) {
      setJoReceivedConfirmation(leadId);
    }
  }, [leads]);
  
  const confirmUncheck = useCallback(async () => {
    if (!uncheckConfirmation || !firestore) return;
    const { leadId, field } = uncheckConfirmation;
    const leadDocRef = doc(firestore, 'leads', leadId);
    try {
        const timestampField = `${field.replace('is', '').charAt(0).toLowerCase() + field.slice(3)}Timestamp`;
        await updateDoc(leadDocRef, { [field]: false, [timestampField]: null });
        refetchLeads();
    } catch (e: any) {
        console.error(`Error unchecking ${field}:`, e);
        toast({ variant: "destructive", title: "Update Failed", description: e.message || "Could not update the status." });
    } finally {
        setUncheckConfirmation(null);
    }
  }, [uncheckConfirmation, firestore, toast, refetchLeads]);

  const confirmJoReceived = useCallback(async () => {
    if (!joReceivedConfirmation || !firestore) return;
    await handleUpdateStatus(joReceivedConfirmation, 'isJoHardcopyReceived', true);
    setJoReceivedConfirmation(null);
  }, [joReceivedConfirmation, firestore, handleUpdateStatus]);

  const handleConfirmPrepared = useCallback(async () => {
    if (!confirmingLead) return;
    await handleUpdateStatus(confirmingLead.id, 'isPreparedForProduction', true);
    setConfirmingLead(null);
  }, [confirmingLead, handleUpdateStatus]);
  
  const handleCheckboxChange = useCallback((index: number, checked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [index]: checked }));
  }, []);

  const areAllItemsChecked = useMemo(() => {
    if (!confirmingLead) return false;
    return confirmingLead.orders.length === Object.keys(checkedItems).filter(key => checkedItems[parseInt(key)]).length;
  }, [confirmingLead, checkedItems]);

  const handleConfirmSendTo = useCallback(async () => {
    if (!leadToSend) return;
    const shouldSkipProduction = ['Stock (Jacket Only)', 'Stock Design', 'Item Sample'].includes(leadToSend.orderType);
    if (shouldSkipProduction) {
        await handleUpdateStatus(leadToSend.id, 'isEndorsedToLogistics', true);
    } else {
        await handleUpdateStatus(leadToSend.id, 'isSentToProduction', true);
    }
    setLeadToSend(null);
  }, [leadToSend, handleUpdateStatus]);
  
  const processedLeads = useMemo(() => {
    if (!leads) return [];

    const customerOrderGroups: { [key: string]: { orders: Lead[] } } = {};

    // Group all orders by customer
    leads.forEach(lead => {
        const name = lead.customerName.toLowerCase();
        if (!customerOrderGroups[name]) {
            customerOrderGroups[name] = { orders: [] };
        }
        customerOrderGroups[name].orders.push(lead);
    });

    const enrichedLeads: EnrichedLead[] = [];

    Object.values(customerOrderGroups).forEach(({ orders }) => {
        const sortedOrders = [...orders].sort((a, b) => new Date(a.submissionDateTime).getTime() - new Date(b.submissionDateTime).getTime());
        
        const totalCustomerQuantity = orders.reduce((sum, o) => {
          if (!Array.isArray(o.orders)) return sum;
          return sum + o.orders.reduce((orderSum, item) => orderSum + (item.quantity || 0), 0)
        }, 0);
        
        for (let i = 0; i < sortedOrders.length; i++) {
            const lead = sortedOrders[i];
            
            // Count previous non-sample orders for this customer
            const previousNonSampleOrders = sortedOrders
                .slice(0, i)
                .filter(o => o.orderType !== 'Item Sample');
            
            enrichedLeads.push({
                ...lead,
                orderNumber: previousNonSampleOrders.length,
                totalCustomerQuantity,
            });
        }
    });

    return enrichedLeads;
  }, [leads]);

  
  const jobOrders = useMemo(() => {
    if (!processedLeads) return [];
    
    const orderTypesToSkip = ['Stock (Jacket Only)', 'Item Sample', 'Stock Design'];

    const leadsInQueue = processedLeads.filter(lead => {
        if (filterType === 'COMPLETED') {
            return lead.isSentToProduction || lead.isEndorsedToLogistics;
        }
        
        const isClientOrPatchOnly = lead.orders.every(o => o.productType === 'Client Owned' || o.productType === 'Patches');
        if (isClientOrPatchOnly) {
            return false;
        }
        
        const isReadyForPrep = lead.isDigitizingArchived || ['Stock (Jacket Only)', 'Stock Design', 'Item Sample'].includes(lead.orderType);
        const isNotProcessed = !lead.isSentToProduction && !lead.isEndorsedToLogistics;
        return lead.joNumber && isReadyForPrep && isNotProcessed;
    });
    
    return leadsInQueue.filter(lead => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ?
        (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
        (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))) ||
        (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))))
        : true;
      
      const joString = lead.joNumber?.toString().padStart(5, '0') || '';
      const formattedJoString = formatJoNumber(lead.joNumber).toLowerCase();
      const matchesJo = joNumberSearch ? 
        (joString.includes(joNumberSearch) || formattedJoString.includes(joNumberSearch.toLowerCase()))
        : true;
        
      const currentStatus = getProgrammingStatus(lead).text;
      const matchesStatus = statusFilter === 'All' || currentStatus === statusFilter;
      
      return (matchesSearch && matchesJo && matchesStatus);
    });

  }, [processedLeads, searchTerm, joNumberSearch, statusFilter, formatJoNumber, getProgrammingStatus, filterType]);

  const toggleCustomerDetails = useCallback((leadId: string) => {
    setOpenCustomerDetails(openCustomerDetails === leadId ? null : leadId);
  }, [openCustomerDetails]);

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
    <>
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black border-none">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-black">{filterType === 'COMPLETED' ? 'Completed Endorsements' : 'Item Preparation'}</CardTitle>
            <CardDescription className="text-gray-600">
              {filterType === 'COMPLETED' ? 'Job orders that have been endorsed.' : 'Job orders ready for item preparation.'}
            </CardDescription>
          </div>
            <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-4">
                    <Input
                        placeholder="Search J.O. No..."
                        value={joNumberSearch}
                        onChange={(e) => setJoNumberSearch(e.target.value)}
                        className="bg-gray-100 text-black placeholder:text-gray-500"
                    />
                    <Input
                        placeholder="Search Customer, Company, Contact..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-100 text-black placeholder:text-gray-500"
                    />
                </div>
                 <div className="w-full text-right">
                {filterType === 'COMPLETED' ? (
                  <Link href="/inventory/item-preparation-for-production" className="text-sm text-primary hover:underline">
                    View Item Preparation Queue
                  </Link>
                ) : (
                  <Link href="/inventory/completed-endorsement" className="text-sm text-primary hover:underline">
                    View Completed Endorsements
                  </Link>
                )}
              </div>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-neutral-800">
              <TableRow>
                <TableHead className="text-white font-bold text-xs text-center">Customer</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">J.O. No.</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Programming Status</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Priority</TableHead>
                <TableHead className="text-white font-bold text-xs text-center w-[150px]">Received Printed J.O.?</TableHead>
                <TableHead className="text-white font-bold text-xs">Product Type</TableHead>
                <TableHead className="text-white font-bold text-xs">Color</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Size</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Qty</TableHead>
                <TableHead className="text-white font-bold text-center">Preparation Status</TableHead>
                <TableHead className="text-white font-bold text-center">Endorsement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobOrders && jobOrders.length > 0 ? (
                 jobOrders.map(lead => {
                   const isRepeat = !lead.forceNewCustomer && lead.orderNumber > 0;
                   return (
                      <ItemPreparationTableRowGroup
                        key={lead.id}
                        lead={lead}
                        isRepeat={isRepeat}
                        getProgrammingStatus={getProgrammingStatus}
                        formatJoNumber={formatJoNumber}
                        getContactDisplay={getContactDisplay}
                        handleJoReceivedChange={handleJoReceivedChange}
                        handleOpenPreparedDialog={handleOpenPreparedDialog}
                        setLeadToSend={setLeadToSend}
                        isReadOnly={isReadOnly}
                        filterType={filterType}
                        openCustomerDetails={openCustomerDetails}
                        toggleCustomerDetails={toggleCustomerDetails}
                      />
                   )
                 })
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground text-xs">
                    No items in the audit queue.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    <AlertDialog open={!!confirmingLead} onOpenChange={() => setConfirmingLead(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are the prepared items correct?</AlertDialogTitle>
            <AlertDialogDescription>
              Please check all items to confirm they have been prepared correctly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-60 overflow-y-auto my-4 space-y-2 pr-2">
            {confirmingLead?.orders.map((order, index) => (
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
      {leadToSend && (
          <AlertDialog open={!!leadToSend} onOpenChange={() => setLeadToSend(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Handover</AlertDialogTitle>
                      <AlertDialogDescription>
                          Are you sure the items for J.O. {formatJoNumber(leadToSend.joNumber)} have been handed over to the {['Stock (Jacket Only)', 'Stock Design', 'Item Sample'].includes(leadToSend.orderType) ? 'logistics' : 'production'} team?
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleConfirmSendTo}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      )}
       <AlertDialog open={!!uncheckConfirmation} onOpenChange={(open) => !open && setUncheckConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Unchecking this box will reset the received status. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUncheck}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <AlertDialog open={!!joReceivedConfirmation} onOpenChange={setJoReceivedConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure that the printed J.O. was received and the J.O. number is correct?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmJoReceived}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
ItemPreparationTableMemo.displayName = 'ItemPreparationTableMemo';

export { ItemPreparationTableMemo as ItemPreparationTable };




