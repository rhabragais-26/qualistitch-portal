

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
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { formatDateTime, cn } from '@/lib/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { ChevronDown, Send, FileText } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { addDays, differenceInDays, format } from 'date-fns';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import Image from 'next/image';

type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
}

type DesignDetails = {
  left?: boolean;
  right?: boolean;
  backLogo?: boolean;
  backText?: boolean;
};

type NamedOrder = {
  name: string;
  color: string;
  size: string;
  quantity: number;
  backText: string;
};

type FileObject = {
  name: string;
  url: string;
};

type Layout = {
  layoutImage?: string;
  dstLogoLeft?: string;
  dstLogoRight?: string;
  dstBackLogo?: string;
  dstBackText?: string;
  namedOrders?: NamedOrder[];
  finalLogoDst?: (FileObject | null)[];
  finalBackDesignDst?: (FileObject | null)[];
  finalNamesDst?: (FileObject | null)[];
  sequenceLogo?: (FileObject | null)[];
  sequenceBackDesign?: (FileObject | null)[];
};

type ProductionType = "Pending" | "In-house" | "Outsource 1" | "Outsource 2" | "Outsource 3";

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  orderType: string;
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
  isEmbroideryDone?: boolean;
  isEndorsedToLogistics?: boolean;
  doneProductionTimestamp?: string;
  deliveryDate?: string;
  courier: string;
  location: string;
  recipientName?: string;
  paymentType: string;
  salesRepresentative: string;
  layouts?: Layout[];
}

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

type ProductionSelectField = 'productionType' | 'sewerType';
type CheckboxField = 'isCutting' | 'isEmbroideryDone' | 'isSewing';

const productionOptions: ProductionType[] = ["Pending", "In-house", "Outsource 1", "Outsource 2", "Outsource 3"];

const getStatusColor = (status?: ProductionType) => {
  switch (status) {
    case 'In-house':
      return 'bg-yellow-100 text-yellow-800';
    case 'Outsource 1':
      return 'bg-purple-100 text-purple-800';
    case 'Outsource 2':
        return 'bg-indigo-100 text-indigo-800';
    case 'Outsource 3':
        return 'bg-blue-100 text-blue-800';
    case 'Pending':
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getProductionStatusLabel = (lead: Lead): { text: string; variant: "success" | "warning" | "secondary" | "default" | "destructive" } => {
    if (lead.isEndorsedToLogistics) return { text: "Endorsed to Logistics", variant: "success" };
    if (lead.isDone) return { text: "Done Production", variant: "success" };
    if (lead.isEmbroideryDone) return { text: "Ongoing with Sewer", variant: "warning" };
    if (lead.isCutting) return { text: "Ongoing Embroidery", variant: "warning" };
    return { text: "Pending", variant: "secondary" };
};

const formatJoNumber = (joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
};


export function ProductionQueueTable() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const { toast } = useToast();
  const [uncheckConfirmation, setUncheckConfirmation] = useState<{ leadId: string; field: CheckboxField } | null>(null);

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);
  
  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;
    if (mobile && landline) return `${mobile} / ${landline}`;
    return mobile || landline || null;
  }, []);

  const handleStatusChange = useCallback(async (leadId: string, field: ProductionSelectField, value: string) => {
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
  
  const handleCheckboxChange = useCallback((leadId: string, field: CheckboxField, value: boolean) => {
    if (!value) {
        setUncheckConfirmation({ leadId, field });
        return;
    }
    
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', leadId);
    
    const updateData: {[key:string]: any} = { [field]: value };
    if (field === 'isSewing' && value) {
      updateData.isDone = true;
      updateData.doneProductionTimestamp = new Date().toISOString();
    }

    updateDoc(leadDocRef, updateData).catch((e: any) => {
        console.error(`Error updating ${field}:`, e);
        toast({
            variant: 'destructive',
            title: "Update Failed",
            description: e.message || "Could not update the status.",
        });
    });
  }, [firestore, toast]);
  
  const confirmUncheck = useCallback(async () => {
    if (!uncheckConfirmation || !firestore) return;
    const { leadId, field } = uncheckConfirmation;
    const leadDocRef = doc(firestore, 'leads', leadId);
    try {
        const updateData: {[key:string]: any} = { [field]: false };
        if (field === 'isSewing') {
          updateData.isDone = false;
          updateData.doneProductionTimestamp = null;
        } else if (field === 'isEmbroideryDone') {
            updateData.isSewing = false;
            updateData.isDone = false;
            updateData.sewerType = 'Pending';
            updateData.doneProductionTimestamp = null;
        } else if (field === 'isCutting') {
          updateData.isEmbroideryDone = false;
          updateData.isSewing = false;
          updateData.isDone = false;
          updateData.productionType = 'Pending';
          updateData.sewerType = 'Pending';
          updateData.doneProductionTimestamp = null;
        }
        await updateDoc(leadDocRef, updateData);
    } catch (e: any) {
        console.error(`Error unchecking ${field}:`, e);
        toast({
            variant: 'destructive',
            title: "Update Failed",
            description: e.message || "Could not update the status.",
        });
    } finally {
        setUncheckConfirmation(null);
    }
  }, [uncheckConfirmation, firestore, toast]);
  
  const handleEndorseToLogistics = useCallback(async (leadId: string) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', leadId);
    try {
        await updateDoc(leadDocRef, { isEndorsedToLogistics: true });
        toast({
            title: "Endorsed to Logistics",
            description: "The order has been sent to the logistics team.",
        });
    } catch (e: any) {
        console.error("Error endorsing to logistics:", e);
        toast({
            variant: 'destructive',
            title: "Endorsement Failed",
            description: e.message || "Could not endorse the order.",
        });
    }
  }, [firestore, toast]);
  
  const calculateProductionDeadline = useCallback((lead: Lead) => {
    if (lead.isDone && lead.doneProductionTimestamp) {
        const submissionDate = new Date(lead.submissionDateTime);
        const deadlineDays = lead.priorityType === 'Rush' ? 6 : 10;
        const deadlineDate = addDays(submissionDate, deadlineDays);
        const doneDate = new Date(lead.doneProductionTimestamp);
        const remainingDays = differenceInDays(deadlineDate, doneDate);
        if (remainingDays < 0) {
            return { text: `${Math.abs(remainingDays)} day(s) overdue`, isOverdue: true, isUrgent: false, remainingDays };
        }
        return { text: `${remainingDays} day(s) remaining`, isOverdue: false, isUrgent: false, remainingDays };
    }
    
    const submissionDate = new Date(lead.submissionDateTime);
    const deadlineDays = lead.priorityType === 'Rush' ? 6 : 10;
    const deadlineDate = addDays(submissionDate, deadlineDays);
    const remainingDays = differenceInDays(deadlineDate, new Date());
    
    if (remainingDays < 0) {
      return { text: `${Math.abs(remainingDays)} day(s) overdue`, isOverdue: true, isUrgent: false, remainingDays };
    } else if (remainingDays <= 2) {
      return { text: `${remainingDays} day(s) remaining`, isOverdue: false, isUrgent: true, remainingDays };
    } else {
      return { text: `${remainingDays} day(s) remaining`, isOverdue: false, isUrgent: false, remainingDays };
    }
  }, []);

  const processedLeads = useMemo(() => {
    if (!leads) return [];
  
    const customerOrderStats: { [key: string]: { orders: Lead[], totalQuantity: number } } = {};
  
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

  const productionQueue = useMemo(() => {
    if (!processedLeads) return [];
    
    const sentToProd = processedLeads.filter(lead => lead.isSentToProduction && !lead.isEndorsedToLogistics);
    
    return sentToProd.filter(lead => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ?
        (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
        (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))) ||
        (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))))
        : true;
      
      const joString = formatJoNumber(lead.joNumber);
      const matchesJo = joNumberSearch ? joString.toLowerCase().includes(joNumberSearch.toLowerCase()) : true;
      
      return matchesSearch && matchesJo;
    });
  }, [processedLeads, searchTerm, joNumberSearch]);

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
      <AlertDialog open={!!uncheckConfirmation} onOpenChange={(open) => !open && setUncheckConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Unchecking this box will mark the task as not done. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUncheck}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
                  placeholder="Search customer, company, or contact..."
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
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs text-center">Customer</TableHead>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs text-center">J.O. No.</TableHead>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs text-center">Priority</TableHead>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs text-center">Overdue Status</TableHead>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs text-center">Production Documents</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Start Production</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Production Category</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Done Embroidery</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Sewing Category</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Done Sewing</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Production Status</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Endorsement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {productionQueue?.map((lead) => {
                  const isRepeat = lead.orderNumber > 1;
                  const deadlineInfo = calculateProductionDeadline(lead);
                  const specialOrderTypes = ["MTO", "Stock Design", "Stock (Jacket Only)"];
                  const productionStatus = getProductionStatusLabel(lead);
                  return (
                    <React.Fragment key={lead.id}>
                        <TableRow>
                            <TableCell className="font-medium text-xs align-top py-3 text-black text-center">
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
                            <TableCell className="text-xs align-top py-3 text-black text-center">{formatJoNumber(lead.joNumber)}</TableCell>
                            <TableCell className="align-top py-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                                  {lead.priorityType}
                                </Badge>
                                 <div className={cn("text-gray-500 text-[10px] whitespace-nowrap", specialOrderTypes.includes(lead.orderType) && "font-bold")}>
                                  {lead.orderType}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className={cn(
                              "text-center text-xs align-top py-3 font-medium",
                              deadlineInfo.isOverdue && "text-red-500",
                              deadlineInfo.isUrgent && "text-amber-600",
                              !deadlineInfo.isOverdue && !deadlineInfo.isUrgent && "text-green-600"
                            )}>
                              {deadlineInfo.text}
                            </TableCell>
                            <TableCell className="text-xs align-top py-3 text-black text-center">
                              <Collapsible>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" className="h-8 px-2 flex items-center gap-1 text-black hover:bg-gray-100">
                                    <FileText className="h-4 w-4" />
                                    View Documents
                                    <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-180" />
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <ProductionDocuments lead={lead} />
                                </CollapsibleContent>
                              </Collapsible>
                            </TableCell>
                            <TableCell className="text-center align-top py-3">
                               <Checkbox
                                checked={lead.isCutting || false}
                                onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isCutting', !!checked)}
                              />
                            </TableCell>
                            <TableCell className="text-center align-top py-3">
                              <Select
                                value={lead.productionType || 'Pending'}
                                onValueChange={(value) => handleStatusChange(lead.id, 'productionType', value)}
                                disabled={!lead.isCutting || lead.isEmbroideryDone}
                              >
                                <SelectTrigger className={cn("w-auto min-w-[120px] text-xs h-8 mx-auto font-semibold disabled:opacity-100", getStatusColor(lead.productionType))}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {productionOptions.map(option => (
                                      <SelectItem key={option} value={option}>{option}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-center align-top py-3">
                               <Checkbox
                                checked={lead.isEmbroideryDone || false}
                                onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isEmbroideryDone', !!checked)}
                                disabled={!lead.isCutting}
                              />
                            </TableCell>
                            <TableCell className="text-center align-top py-3">
                               <Select
                                value={lead.sewerType || 'Pending'}
                                onValueChange={(value) => handleStatusChange(lead.id, 'sewerType', value)}
                                disabled={!lead.isEmbroideryDone || lead.isSewing}
                               >
                                <SelectTrigger className={cn("w-auto min-w-[120px] text-xs h-8 mx-auto font-semibold disabled:opacity-100", getStatusColor(lead.sewerType))}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                   {productionOptions.map(option => (
                                      <SelectItem key={option} value={option}>{option}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-center align-top py-3">
                              <Checkbox
                                checked={lead.isSewing || false}
                                onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isSewing', !!checked)}
                                disabled={!lead.isEmbroideryDone}
                              />
                            </TableCell>
                            <TableCell className="text-center align-top py-3">
                               <Badge variant={productionStatus.variant}>{productionStatus.text}</Badge>
                            </TableCell>
                            <TableCell className="text-center align-top py-3">
                                 <Button
                                    size="sm"
                                    onClick={() => handleEndorseToLogistics(lead.id)}
                                    disabled={!lead.isDone}
                                    className={cn(
                                        "h-auto px-3 py-3 text-white font-bold text-xs bg-teal-600 disabled:bg-gray-400 transition-all duration-300 ease-in-out transform hover:scale-105"
                                    )}
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    <span className='whitespace-normal break-words'>Send to Logistics</span>
                                </Button>
                            </TableCell>
                        </TableRow>
                    </React.Fragment>
                )})}
                </TableBody>
            </Table>
          </div>
      </CardContent>
    </Card>
  );
}

const ProductionDocuments = React.memo(({ lead }: { lead: Lead }) => {
  const totalQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);

  const getContactDisplay = () => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || 'N/A';
  };
  
  const finalFiles = [
    ...(lead.layouts?.[0]?.finalLogoDst?.filter(f => f).map(f => ({ ...f, type: 'Logo (DST)' })) || []),
    ...(lead.layouts?.[0]?.finalBackDesignDst?.filter(f => f).map(f => ({ ...f, type: 'Back Design (DST)' })) || []),
    ...(lead.layouts?.[0]?.finalNamesDst?.filter(f => f).map(f => ({ ...f, type: 'Name (DST)' })) || []),
  ];

  return (
    <div className="p-4 bg-gray-100 border-t-2 border-gray-300 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-primary">Job Order Form Preview</h3>
        <Card className="p-6 bg-white text-black text-xs">
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <p><strong>Client:</strong> {lead.customerName}</p>
              <p><strong>Recipient:</strong> {lead.recipientName || lead.customerName}</p>
              <p><strong>Date of Transaction:</strong> {formatDateTime(lead.submissionDateTime).dateTime}</p>
              <p><strong>Delivery Date:</strong> {lead.deliveryDate ? format(new Date(lead.deliveryDate), 'MMMM d, yyyy') : 'N/A'}</p>
            </div>
            <div className="text-right">
              <p><strong>J.O. No:</strong> {formatJoNumber(lead.joNumber)}</p>
              <p><strong>CSR:</strong> {lead.salesRepresentative}</p>
              <p><strong>Courier:</strong> {lead.courier}</p>
              <p><strong>Payment:</strong> {lead.paymentType}</p>
            </div>
          </div>
          <p className="mt-2"><strong>Delivery Address:</strong> {lead.location}</p>
          <p><strong>Contact:</strong> {getContactDisplay()}</p>
          
          <h4 className="font-bold mt-4 mb-2 text-sm">Order Details</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 px-2">Product</TableHead>
                <TableHead className="h-8 px-2">Color</TableHead>
                <TableHead className="h-8 px-2">Size</TableHead>
                <TableHead className="h-8 px-2 text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lead.orders.map((order, index) => (
                <TableRow key={index}>
                  <TableCell className="py-1 px-2">{order.productType}</TableCell>
                  <TableCell className="py-1 px-2">{order.color}</TableCell>
                  <TableCell className="py-1 px-2">{order.size}</TableCell>
                  <TableCell className="py-1 px-2 text-right">{order.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-right font-bold mt-2">Total Quantity: {totalQuantity}</p>
        </Card>

      </div>
      <div className="space-y-4">
        {lead.layouts?.some(l => l.layoutImage) && (
            <div>
                <h3 className="font-bold text-lg text-primary mb-2">Layout</h3>
                <div className="grid grid-cols-2 gap-2">
                    {lead.layouts.map((layout, index) => (
                        layout.layoutImage && <Image key={index} src={layout.layoutImage} alt={`Layout ${index+1}`} width={200} height={150} className="rounded-md border object-contain"/>
                    ))}
                </div>
            </div>
        )}
        {lead.layouts?.some(l => l.sequenceLogo?.some(s => s) || l.sequenceBackDesign?.some(s => s)) && (
          <div>
            <h3 className="font-bold text-lg text-primary mb-2">Sequence</h3>
            <div className="grid grid-cols-2 gap-2">
              {lead.layouts?.[0]?.sequenceLogo?.map((seq, index) => seq && (
                <Image key={`seq-logo-${index}`} src={seq.url} alt={`Sequence Logo ${index + 1}`} width={200} height={150} className="rounded-md border object-contain"/>
              ))}
              {lead.layouts?.[0]?.sequenceBackDesign?.map((seq, index) => seq && (
                <Image key={`seq-back-${index}`} src={seq.url} alt={`Sequence Back Design ${index + 1}`} width={200} height={150} className="rounded-md border object-contain"/>
              ))}
            </div>
          </div>
        )}
        {finalFiles.length > 0 && (
          <div>
            <h3 className="font-bold text-lg text-primary mb-2">Final Program Files</h3>
             <ul className="space-y-1 text-sm list-disc list-inside">
              {finalFiles.map((file, index) => (
                file && <li key={index} className="truncate"><strong>{file.type}:</strong> {file.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
});
ProductionDocuments.displayName = 'ProductionDocuments';
    
