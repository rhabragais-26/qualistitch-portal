
'use client';

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
import { Skeleton } from './ui/skeleton';
import React, { useState, useMemo, useCallback } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, X, FileText } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { differenceInDays, addDays, format } from 'date-fns';
import { cn, formatDateTime, toTitleCase, formatJoNumber as formatJoNumberUtil } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import Image from 'next/image';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Progress } from './ui/progress';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';


type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
  design?: DesignDetails;
  remarks?: string;
}

type DesignDetails = {
  left?: boolean;
  right?: boolean;
  backLogo?: boolean;
  backText?: boolean;
};

type NamedOrder = {
  id: string;
  name: string;
  color: string;
  size: string;
  quantity: number;
  backText: string;
}

type FileObject = {
  name: string;
  url: string;
};

type Layout = {
  id: string;
  layoutImage?: string;
  dstLogoLeft?: string;
  dstLogoRight?: string;
  dstBackLogo?: string;
  dstBackText?: string;
  namedOrders?: NamedOrder[];
  finalProgrammedLogo?: (FileObject | null)[];
  finalProgrammedBackDesign?: (FileObject | null)[];
};


type ProductionType = "Pending" | "In-house" | "Outsource";

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  location: string;
  scesFullName?: string;
  orderType: string;
  orders: Order[];
  priorityType: 'Rush' | 'Regular';
  submissionDateTime: string;
  joNumber?: number;
  salesRepresentative: string;
  isUnderProgramming?: boolean;
  isInitialApproval?: boolean;
  isLogoTesting?: boolean;
  isRevision?: boolean;
  isFinalApproval?: boolean;
  isFinalProgram?: boolean;
  isPreparedForProduction?: boolean;
  isSentToProduction?: boolean;
  productionType?: ProductionType;
  sewerType?: ProductionType;
  isTrimming?: boolean;
  isDone?: boolean;
  operationalCase?: OperationalCase;
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  shippedTimestamp?: string;
  deliveredTimestamp?: string;
  isSalesAuditRequested?: boolean;
  isQualityApproved?: boolean;
  isRecheckingQuality?: boolean;
  isPacked?: boolean;
  adjustedDeliveryDate?: string;
  deliveryDate?: string;
  layouts?: Layout[];
  isEndorsedToLogistics?: boolean;
  isCutting?: boolean;
  isEmbroideryDone?: boolean;
  isSewing?: boolean;
  finalApprovalTimestamp?: string;
  forceNewCustomer?: boolean;
  recipientName?: string;
  courier?: string;
  paymentType?: string;
}

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

type OperationalCase = {
  id: string;
  joNumber: string;
  caseType: string;
  remarks: string;
  image?: string;
  submissionDateTime: string;
  customerName: string;
  contactNumber?: string;
  landlineNumber?: string;
  quantity?: number;
  isArchived?: boolean;
  isDeleted?: boolean;
};

type UserProfileInfo = {
  uid: string;
  firstName: string;
  lastName: string;
  nickname: string;
  position?: string;
};

const hasLayoutContent = (layout: Layout) => {
    return layout.layoutImage || 
           layout.dstLogoLeft || 
           layout.dstLogoRight || 
           layout.dstBackLogo || 
           layout.dstBackText || 
           (layout.namedOrders && layout.namedOrders.length > 0 && layout.namedOrders.some(o => o.name || o.backText));
};

export function OrderStatusTable({ filterType = 'ONGOING' }: { filterType?: 'ONGOING' | 'COMPLETED' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const [overallStatusFilter, setOverallStatusFilter] = useState('All');
  const [overdueStatusFilter, setOverdueStatusFilter] = useState('All');
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [imageInView, setImageInView] = useState<string | null>(null);
  const [viewingJoLead, setViewingJoLead] = useState<Lead | null>(null);
  const [openCustomerDetails, setOpenCustomerDetails] = useState<string | null>(null);

  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const operationalCasesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'operationalCases')) : null, [firestore]);
  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  
  const { data: leads, isLoading: areLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery);
  const { data: operationalCases, isLoading: areCasesLoading, error: casesError } = useCollection<OperationalCase>(operationalCasesQuery);
  const { data: usersData, isLoading: areUsersLoading, error: usersError } = useCollection<UserProfileInfo>(usersQuery);


  const isLoading = areLeadsLoading || areCasesLoading || areUsersLoading;
  const error = leadsError || casesError || usersError;

  const toggleCustomerDetails = useCallback((leadId: string) => {
    setOpenCustomerDetails(prev => (prev === leadId ? null : leadId));
  }, []);
  
  const toggleLeadDetails = useCallback((leadId: string) => {
    setOpenLeadId(openLeadId === leadId ? null : leadId);
  }, [openLeadId]);

  const calculateDeadline = useCallback((lead: Lead) => {
    const getDeadline = () => {
      if (lead.adjustedDeliveryDate) return new Date(lead.adjustedDeliveryDate);
      if (lead.deliveryDate) return new Date(lead.deliveryDate);
      
      const startDate = lead.finalApprovalTimestamp 
          ? new Date(lead.finalApprovalTimestamp) 
          : new Date(lead.submissionDateTime);
      const deadlineDays = lead.priorityType === 'Rush' ? 7 : 22;
      return addDays(startDate, deadlineDays);
    };
    const deadlineDate = getDeadline();

    let statusText: React.ReactNode;
    let remainingDays: number;
    let isOverdue = false;
    let isUrgent = false;

    if (lead.shipmentStatus === 'Delivered' && lead.deliveredTimestamp) {
        const deliveredDate = new Date(lead.deliveredTimestamp);
        remainingDays = differenceInDays(deadlineDate, deliveredDate);
        statusText = <><span className="font-bold">Delivered:</span> {formatDateTime(lead.deliveredTimestamp).dateTimeShort}</>;
        if (remainingDays < 0) {
            isOverdue = true;
        }
    } else if (lead.shipmentStatus === 'Shipped' && lead.shippedTimestamp) {
        statusText = <><span className="font-bold">Shipped:</span> {formatDateTime(lead.shippedTimestamp).dateTimeShort}</>;
        remainingDays = 0; 
    } else {
        remainingDays = differenceInDays(deadlineDate, new Date());
        if (remainingDays < 0) {
            isOverdue = true;
            statusText = <><span className="font-bold">{Math.abs(remainingDays)} day(s)</span> overdue</>;
        } else if (remainingDays <= 3) {
            isUrgent = true;
            statusText = <><span className="font-bold">{remainingDays} day(s)</span> remaining</>;
        } else {
            statusText = <><span className="font-bold">{remainingDays} day(s)</span> remaining</>;
        }
    }
    
    const adjustedDateText = lead.adjustedDeliveryDate ? (
        <div className="text-xs mt-1">
            <span className="text-black">Customer's chosen delivery date: </span><strong className="text-black">{format(new Date(lead.adjustedDeliveryDate), 'MMM dd, yyyy')}</strong>
        </div>
    ) : null;

    return { 
        text: <>{statusText}{adjustedDateText}</>, 
        isOverdue, 
        isUrgent, 
        remainingDays 
    };
  }, []);

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

  const getItemPreparationStatus = useCallback((lead: Lead): { text: string; variant: "success" | "warning" | "secondary" } => {
    const isClientOrPatchOnly = lead.orders.every(o => o.productType === 'Client Owned' || o.productType === 'Patches');
    if (isClientOrPatchOnly) {
      return { text: 'Skipped', variant: 'secondary' };
    }
    if (lead.orderType === 'Stock (Jacket Only)' && lead.isEndorsedToLogistics) {
      return { text: 'Sent to Logistics', variant: 'success' };
    }
    if (lead.isSentToProduction) return { text: 'Sent to Production', variant: 'success' };
    if (lead.isPreparedForProduction) return { text: 'Prepared', variant: 'warning' };
    return { text: 'Pending', variant: 'secondary' };
  }, []);

  const getProductionStatus = useCallback((lead: Lead): { text: string; variant: "success" | "warning" | "secondary" } => {
    if (['Stock (Jacket Only)', 'Stock Design', 'Item Sample'].includes(lead.orderType)) {
      return { text: "Skipped", variant: "secondary" };
    }
    if (lead.isEndorsedToLogistics) return { text: "Endorsed to Logistics", variant: "success" };
    if (lead.isDone) return { text: "Done Production", variant: "success" };
    if (lead.isTrimming) return { text: "Trimming/Cleaning", variant: "warning" };
    if (lead.isSewing) return { text: "Done Sewing", variant: "warning" };
    if (lead.isEmbroideryDone) return { text: "Endorsed to Sewer", variant: "warning" };
    if(lead.isCutting) return { text: "Ongoing Embroidery", variant: "warning" };
    return { text: 'Pending', variant: 'secondary' };
  }, []);

  const getShipmentStatus = (lead: Lead): { text: string; variant: "default" | "secondary" | "destructive" | "warning" | "success" } => {
    if (lead.shipmentStatus === 'Delivered') return { text: 'Delivered', variant: 'success' };
    if (lead.shipmentStatus === 'Shipped') return { text: 'Shipped', variant: 'success' };
    if (lead.isPacked) return { text: "Already Packed", variant: "default" };
    if (lead.isSalesAuditRequested) return { text: "On-going Audit", variant: "warning" };
    if (lead.isQualityApproved) return { text: "Approved Quality", variant: "default" };
    if (lead.isRecheckingQuality) return { text: "Re-checking Quality", variant: "destructive" };
    return { text: lead.shipmentStatus || 'Pending', variant: 'secondary' };
  }

  const getOverallStatus = useCallback((lead: Lead): { text: string; variant: "destructive" | "success" | "warning" | "secondary" } => {
    if (lead.shipmentStatus === 'Shipped' || lead.shipmentStatus === 'Delivered') {
        return { text: 'COMPLETED', variant: 'success' };
    }
    if (!lead.joNumber) {
        return { text: 'PENDING', variant: 'secondary' };
    }
    return { text: 'ONGOING', variant: 'warning' };
  }, []);
  
  const getProgressValue = useCallback((lead: Lead): number => {
    const skipsProduction = ['Stock (Jacket Only)', 'Stock Design', 'Item Sample'].includes(lead.orderType);

    if (lead.shipmentStatus === 'Shipped' || lead.shipmentStatus === 'Delivered') return 100;
    if (lead.isPacked) return 95;
    
    if (skipsProduction && lead.isEndorsedToLogistics) {
        return 90;
    }
    
    if (lead.isDone) return 90;
    if (lead.isTrimming) return 85;
    if (lead.isSewing) return 70;
    if (lead.isEmbroideryDone) return 50;
    if (lead.isCutting) return 40;
    if (lead.isSentToProduction) return 40;
    
    if (lead.isFinalProgram) return 30;
    if (lead.isFinalApproval) return 20;
    if (lead.isRevision) return 15;
    if (lead.isLogoTesting) return 15;
    if (lead.isInitialApproval) return 10;
    if (lead.isUnderProgramming) return 5;
    if (lead.joNumber) return 0;
    return 0;
  }, []);

  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || null;
  }, []);

  const processedLeads = useMemo(() => {
    if (!leads) return [];
  
    const customerOrderGroups: { [key: string]: { orders: Lead[] } } = {};
  
    leads.forEach(lead => {
      if (!Array.isArray(lead.orders)) {
          return; 
      }
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

  const filteredLeads = useMemo(() => {
    if (!processedLeads) return [];
    
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    const filtered = processedLeads.filter(lead => {
        if (filterType === 'COMPLETED') {
            if (lead.shipmentStatus !== 'Delivered') return false;
        } else { // ONGOING
            if (lead.shipmentStatus === 'Delivered') return false;
        }


      const matchesSearch = searchTerm ?
        (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
        (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(lowercasedSearchTerm.replace(/-/g, ''))) ||
        (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(lowercasedSearchTerm.replace(/-/g, ''))))
        : true;
      
      const joString = formatJoNumberUtil(lead.joNumber);
      const matchesJo = joNumberSearch ? joString.toLowerCase().includes(joNumberSearch.toLowerCase()) : true;

      const overallStatus = getOverallStatus(lead).text;
      const matchesOverallStatus = overallStatusFilter === 'All' || overallStatus === overallStatusFilter;
      
      const deadlineInfo = calculateDeadline(lead);
      const matchesOverdueStatus = overdueStatusFilter === 'All' ||
        (overdueStatusFilter === 'Overdue' && deadlineInfo.isOverdue) ||
        (overdueStatusFilter === 'Nearly Overdue' && !deadlineInfo.isOverdue && deadlineInfo.isUrgent);

      return matchesSearch && matchesJo && matchesOverallStatus && matchesOverdueStatus;
    });

    return filtered.sort((a, b) => {
        const aDeadline = calculateDeadline(a);
        const bDeadline = calculateDeadline(b);
        return aDeadline.remainingDays - bDeadline.remainingDays;
    });

  }, [processedLeads, searchTerm, joNumberSearch, overallStatusFilter, overdueStatusFilter, formatJoNumberUtil, getOverallStatus, calculateDeadline, filterType]);
  
  const activeCasesByJo = useMemo(() => {
    if (!operationalCases) return new Map();
    const map = new Map<string, string>();
    operationalCases.forEach(c => {
        if (!c.isArchived && !c.isDeleted) {
            map.set(c.joNumber, c.caseType);
        }
    });
    return map;
  }, [operationalCases]);

  const leadsWithCases = useMemo(() => {
    if (!filteredLeads) return [];
    return filteredLeads.map(lead => {
      const matchingCase = operationalCases?.find(c => c.joNumber === formatJoNumberUtil(lead.joNumber) && !c.isArchived && !c.isDeleted);
      return { ...lead, operationalCase: matchingCase };
    });
  }, [filteredLeads, operationalCases, formatJoNumberUtil]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full bg-gray-200" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading records: {error.message}</div>;
  }

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col border-none">
       {imageInView && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center animate-in fade-in"
          onClick={() => setImageInView(null)}
        >
          <div className="relative h-[90vh] w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image src={imageInView} alt="Enlarged Case Image" layout="fill" objectFit="contain" />
             <Button
                variant="ghost"
                size="icon"
                onClick={() => setImageInView(null)}
                className="absolute top-4 right-4 text-white hover:bg-white/10 hover:text-white"
            >
                <X className="h-6 w-6" />
                <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>
      )}
      {viewingJoLead && (
        <Dialog open={!!viewingJoLead} onOpenChange={() => setViewingJoLead(null)}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Job Order: {formatJoNumberUtil(viewingJoLead.joNumber)}</DialogTitle>
                    <DialogDescription>Read-only view of the job order form.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="pr-6">
                    <div className="p-4 bg-white text-black">
                        {(() => {
                            const lead = viewingJoLead;
                            const scesProfile = usersData?.find(u => u.nickname === lead.salesRepresentative);
                            const scesFullName = scesProfile ? toTitleCase(`${scesProfile.firstName} ${scesProfile.lastName}`) : toTitleCase(lead.salesRepresentative);
                            const totalQuantity = lead.orders.reduce((sum: any, order: any) => sum + order.quantity, 0);
                            const contactDisplay = getContactDisplay(lead);
                            
                            const deliveryDate = lead.adjustedDeliveryDate ? format(new Date(lead.adjustedDeliveryDate), "MMM dd, yyyy") : (lead.deliveryDate ? format(new Date(lead.deliveryDate), "MMM dd, yyyy") : format(addDays(new Date(lead.submissionDateTime), lead.priorityType === 'Rush' ? 7 : 22), "MMM dd, yyyy"));

                            const layoutsToPrint = lead.layouts?.filter(l => hasLayoutContent(l as Layout)) || [];
                            
                            return (
                              <>
                                <div className="p-10 mx-auto max-w-4xl print-page">
                                  <div className="text-left mb-4">
                                      <p className="font-bold"><span className="text-primary">J.O. No:</span> <span className="inline-block border-b border-black">{formatJoNumberUtil(lead.joNumber)}</span></p>
                                  </div>
                                  <h1 className="text-2xl font-bold text-center mb-6 border-b-4 border-black pb-2">JOB ORDER FORM</h1>

                                  <div className="grid grid-cols-3 gap-x-8 text-sm mb-6 border-b border-black pb-4">
                                      <div className="space-y-1">
                                          <p><strong>Client Name:</strong> {lead.customerName}</p>
                                          <p><strong>Contact No:</strong> {contactDisplay}</p>
                                          <p><strong>Delivery Address:</strong> <span className="whitespace-pre-wrap">{lead.location}</span></p>
                                      </div>
                                      <div className="space-y-1">
                                          <p><strong>Date of Transaction:</strong> {format(new Date(lead.submissionDateTime), 'MMM dd, yyyy')}</p>
                                          <p><strong>Type of Order:</strong> {lead.orderType}</p>
                                          <p><strong>Terms of Payment:</strong> {lead.paymentType}</p>
                                          <p><strong>SCES Name:</strong> {scesFullName}</p>
                                      </div>
                                      <div className="space-y-1">
                                          <p><strong>Recipient's Name:</strong> {lead.recipientName || lead.customerName}</p>
                                          <p><strong>Courier:</strong> {lead.courier}</p>
                                          <p><strong>Delivery Date:</strong> {deliveryDate || 'N/A'}</p>
                                      </div>
                                  </div>

                                  <h2 className="text-xl font-bold text-center mb-4">ORDER DETAILS</h2>
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-gray-200">
                                        <TableHead className="border border-black p-0.5 text-center align-middle" colSpan={3}>Item Description</TableHead>
                                        <TableHead className="border border-black p-0.5 text-center align-middle" rowSpan={2}>Qty</TableHead>
                                        <TableHead className="border border-black p-0.5 text-center align-middle" colSpan={2}>Front Design</TableHead>
                                        <TableHead className="border border-black p-0.5 text-center align-middle" colSpan={2}>Back Design</TableHead>
                                        <TableHead className="border border-black p-0.5 text-center align-middle" rowSpan={2}>Remarks</TableHead>
                                      </TableRow>
                                      <TableRow className="bg-gray-200">
                                        <TableHead className="border border-black p-0.5 font-medium text-center align-middle">Type of Product</TableHead>
                                        <TableHead className="border border-black p-0.5 font-medium text-center align-middle">Color</TableHead>
                                        <TableHead className="border border-black p-0.5 font-medium text-center align-middle">Size</TableHead>
                                        <TableHead className="border border-black p-0.5 font-medium w-12 text-center align-middle">Left</TableHead>
                                        <TableHead className="border border-black p-0.5 font-medium w-12 text-center align-middle">Right</TableHead>
                                        <TableHead className="border border-black p-0.5 font-medium w-12 text-center align-middle">Logo</TableHead>
                                        <TableHead className="border border-black p-0.5 font-medium w-12 text-center align-middle">Text</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {lead.orders.map((order: any, index: number) => (
                                        <TableRow key={index}>
                                          <TableCell className="border border-black p-0.5 text-center align-middle">{order.productType}</TableCell>
                                          <TableCell className="border border-black p-0.5 text-center align-middle">{order.color}</TableCell>
                                          <TableCell className="border border-black p-0.5 text-center">{order.size}</TableCell>
                                          <TableCell className="border border-black p-0.5 text-center">{order.quantity}</TableCell>
                                          <TableCell className="border border-black p-0.5 text-center">
                                              <Checkbox className="mx-auto disabled:opacity-100" checked={order.design?.left || false} disabled />
                                          </TableCell>
                                          <TableCell className="border border-black p-0.5 text-center">
                                            <Checkbox className="mx-auto disabled:opacity-100" checked={order.design?.right || false} disabled />
                                          </TableCell>
                                          <TableCell className="border border-black p-0.5 text-center">
                                            <Checkbox className="mx-auto disabled:opacity-100" checked={order.design?.backLogo || false} disabled />
                                          </TableCell>
                                          <TableCell className="border border-black p-0.5 text-center">
                                            <Checkbox className="mx-auto disabled:opacity-100" checked={order.design?.backText || false} disabled />
                                          </TableCell>
                                          <TableCell className="border border-black p-0.5">
                                            <p className="text-xs">{order.remarks}</p>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                       <TableRow>
                                          <TableCell colSpan={3} className="text-right font-bold p-0.5">TOTAL</TableCell>
                                          <TableCell className="text-center font-bold p-0.5">{totalQuantity} PCS</TableCell>
                                          <TableCell colSpan={5}></TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                  <div className="text-xs mb-2 pt-2">
                                    <p className="text-xs mb-2 italic"><strong>Note:</strong> Specific details for logo and back text on the next page</p>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-x-16 gap-y-4 text-xs mt-2">
                                      <div className="space-y-1">
                                          <p className="font-bold italic">Prepared by:</p>
                                          <p className="pt-8 border-b border-black text-center font-semibold">{scesFullName}</p>
                                          <p className="text-center font-bold">Sales &amp; Customer Engagement Specialist</p>
                                          <p className="text-center">(Name &amp; Signature, Date)</p>
                                      </div>
                                       <div className="space-y-1">
                                          <p className="font-bold italic">Noted by:</p>
                                          <p className="pt-8 border-b border-black text-center font-semibold">Myreza Banawon</p>
                                          <p className="text-center font-bold">Sales Head</p>
                                          <p className="text-center">(Name &amp; Signature, Date)</p>
                                      </div>

                                      <div className="col-span-2 mt-0">
                                          <p className="font-bold italic">Approved by:</p>
                                      </div>


                                      <div className="space-y-1">
                                          <p className="pt-8 border-b border-black"></p>
                                          <p className="text-center font-semibold">Programming</p>
                                          <p className="text-center">(Name &amp; Signature, Date)</p>
                                      </div>
                                      <div className="space-y-1">
                                          <p className="pt-8 border-b border-black"></p>
                                          <p className="text-center font-semibold">Inventory</p>
                                          <p className="text-center">(Name &amp; Signature, Date)</p>
                                      </div>
                                      <div className="space-y-1">
                                          <p className="pt-8 border-b border-black"></p>
                                          <p className="text-center font-semibold">Production Line Leader</p>
                                          <p className="text-center">(Name &amp; Signature, Date)</p>
                                      </div>
                                      <div className="space-y-1">
                                          <p className="pt-8 border-b border-black"></p>
                                          <p className="text-center font-semibold">Production Supervisor</p>
                                          <p className="text-center">(Name &amp; Signature, Date)</p>
                                      </div>
                                       <div className="space-y-1">
                                          <p className="pt-8 border-b border-black"></p>
                                          <p className="text-center font-semibold">Quality Control</p>
                                          <p className="text-center">(Name &amp; Signature, Date)</p>
                                      </div>
                                      <div className="space-y-1">
                                          <p className="pt-8 border-b border-black"></p>
                                          <p className="text-center font-semibold">Logistics</p>
                                          <p className="text-center">(Name &amp; Signature, Date)</p>
                                      </div>
                                       <div className="col-span-2 mx-auto w-1/2 space-y-1 pt-4">
                                          <p className="pt-8 border-b border-black"></p>
                                          <p className="text-center font-semibold">Operations Supervisor</p>
                                          <p className="text-center">(Name &amp; Signature, Date)</p>
                                      </div>
                                  </div>
                                </div>
                                {layoutsToPrint.map((layout, layoutIndex) => (
                                    <div key={layoutIndex} className="p-10 mx-auto max-w-4xl print-page mt-8 pt-8 border-t-4 border-dashed border-gray-300">
                                      <div className="text-left mb-4">
                                          <p className="font-bold"><span className="text-primary">J.O. No:</span> <span className="inline-block border-b border-black">{formatJoNumberUtil(lead.joNumber)}</span> - Layout {layoutIndex + 1}</p>
                                      </div>
                                      
                                       {layout.layoutImage && (
                                         <div className="relative w-full h-[500px] border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center mb-4">
                                            <Image 
                                                src={layout.layoutImage} 
                                                alt={`Layout ${layoutIndex + 1}`} 
                                                layout="fill"
                                                objectFit="contain"
                                            />
                                          </div>
                                        )}
                                      
                                      <h2 className="text-2xl font-bold text-center mb-4">
                                        {layoutsToPrint.length > 1 ? `LAYOUT #${layoutIndex + 1}` : "LAYOUT"}
                                      </h2>
                                        <table className="w-full border-collapse border border-black mb-6">
                                            <tbody>
                                                <tr>
                                                    <td className="border border-black p-2 w-1/2"><strong>DST LOGO LEFT:</strong><p className="mt-1 whitespace-pre-wrap">{layout.dstLogoLeft}</p></td>
                                                    <td className="border border-black p-2 w-1/2"><strong>DST BACK LOGO:</strong><p className="mt-1 whitespace-pre-wrap">{layout.dstBackLogo}</p></td>
                                                </tr>
                                                <tr>
                                                    <td className="border border-black p-2 w-1/2"><strong>DST LOGO RIGHT:</strong><p className="mt-1 whitespace-pre-wrap">{layout.dstLogoRight}</p></td>
                                                    <td className="border border-black p-2 w-1/2"><strong>DST BACK TEXT:</strong><p className="mt-1 whitespace-pre-wrap">{layout.dstBackText}</p></td>
                                                </tr>
                                            </tbody>
                                        </table>
                            
                                        <h2 className="text-2xl font-bold text-center mb-4">NAMES</h2>
                                        <table className="w-full border-collapse border border-black text-xs">
                                          <thead>
                                            <tr className="bg-gray-200">
                                              <th className="border border-black p-1 text-center align-middle">No.</th>
                                              <th className="border border-black p-1 text-center align-middle">Names</th>
                                              <th className="border border-black p-1 text-center align-middle">Color</th>
                                              <th className="border border-black p-1 text-center align-middle">Sizes</th>
                                              <th className="border border-black p-1 text-center align-middle">Qty</th>
                                              <th className="border border-black p-1 text-center align-middle">BACK TEXT</th>
                                            </tr>
                                          </thead>
                                          <TableBody>
                                            {layout.namedOrders?.map((order, orderIndex) => (
                                              <TableRow key={orderIndex}>
                                                <TableCell className="border border-black p-1 text-center align-middle">{orderIndex + 1}</TableCell>
                                                <TableCell className="border border-black p-1 text-center align-middle">{order.name}</TableCell>
                                                <TableCell className="border border-black p-1 text-center align-middle">{order.color}</TableCell>
                                                <TableCell className="border border-black p-1 text-center align-middle">{order.size}</TableCell>
                                                <TableCell className="border border-black p-1 text-center align-middle">{order.quantity}</TableCell>
                                                <TableCell className="border border-black p-1 text-center align-middle">{order.backText}</TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </table>
                                    </div>
                                  ))}
                              </>
                            )
                        })()}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
      )}
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-black">{filterType === 'COMPLETED' ? 'Completely Delivered Orders' : 'Overall Order Status & Progress'}</CardTitle>
              <CardDescription className="text-gray-600">
                {filterType === 'COMPLETED'
                  ? 'Here are all the orders that have been successfully delivered.'
                  : 'Here is the overall status and progress of all customer orders.'
                }
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Filter by Overall Status:</span>
                    <Select value={overallStatusFilter} onValueChange={setOverallStatusFilter}>
                        <SelectTrigger className="w-auto bg-gray-100 text-black placeholder:text-gray-500">
                        <SelectValue placeholder="Filter by Overall Status" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="All">All Statuses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="ONGOING">Ongoing</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                    <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Filter by Overdue Status:</span>
                    <Select value={overdueStatusFilter} onValueChange={setOverdueStatusFilter}>
                        <SelectTrigger className="w-auto bg-gray-100 text-black placeholder:text-gray-500">
                        <SelectValue placeholder="Filter by Overdue Status" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="All">All Overdue Statuses</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                        <SelectItem value="Nearly Overdue">Nearly Overdue</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Search:</span>
                        <Input
                            placeholder="J.O. No..."
                            value={joNumberSearch}
                            onChange={(e) => setJoNumberSearch(e.target.value)}
                            className="bg-gray-100 text-black placeholder:text-gray-500 w-40"
                        />
                    </div>
                    <Input
                    placeholder="Search customer, company, or contact..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-100 text-black placeholder:text-gray-500"
                    />
                </div>
                <div className="w-full text-right">
                  {filterType === 'COMPLETED' ? (
                    <Link href="/order-status" className="text-sm text-primary hover:underline">
                      View Ongoing Orders
                    </Link>
                  ) : (
                    <Link href="/order-status/completed" className="text-sm text-primary hover:underline">
                      View Completely Delivered Orders
                    </Link>
                  )}
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
           <div className="border rounded-md relative h-full">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-white font-bold align-middle px-2 text-center w-[200px]">Customer</TableHead>
                    <TableHead className="text-white font-bold align-middle w-[150px] text-center px-2">J.O. No.</TableHead>
                    <TableHead className="text-white font-bold align-middle w-[150px] text-center px-2">SCES</TableHead>
                    <TableHead className="text-center text-white font-bold align-middle w-[150px] px-2">Priority Type</TableHead>
                    <TableHead className="text-center text-white font-bold align-middle w-[150px] px-2">Ordered Items</TableHead>
                    <TableHead className="text-center text-white font-bold align-middle w-[400px] px-2">Order Fulfillment Progress</TableHead>
                    <TableHead className="text-center text-white font-bold align-middle w-[150px] px-2">Overdue Status</TableHead>
                    <TableHead className="text-center text-white font-bold align-middle w-[150px] px-2">Operational Case</TableHead>
                    <TableHead className="text-center text-white font-bold align-middle w-[120px] px-2">Overall Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {leadsWithCases.map((lead) => {
                  const isRepeat = !lead.forceNewCustomer && lead.orderNumber > 0;
                  const deadlineInfo = calculateDeadline(lead);
                  const programmingStatus = getProgrammingStatus(lead);
                  const itemPreparationStatus = getItemPreparationStatus(lead);
                  const productionStatus = getProductionStatus(lead);
                  const shipmentStatus = getShipmentStatus(lead);
                  const overallStatus = getOverallStatus(lead);
                  const totalQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
                  const isCollapsibleOpen = openLeadId === lead.id;
                  const progress = getProgressValue(lead);
                  const finalProgrammedLogo = lead.layouts?.[0]?.finalProgrammedLogo;
                  const finalProgrammedBackDesign = lead.layouts?.[0]?.finalProgrammedBackDesign;
                  const scesProfile = usersData?.find(u => u.nickname === lead.salesRepresentative);

                  return (
                    <React.Fragment key={lead.id}>
                        <TableRow>
                            <TableCell className="text-xs align-middle py-3 text-black text-center w-[200px] px-2">
                                <div className="flex items-center justify-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => toggleCustomerDetails(lead.id)} className="h-5 px-1 mr-1">
                                    {openCustomerDetails === lead.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                    <div className='flex flex-col items-center'>
                                        <span className="font-bold">{toTitleCase(lead.customerName)}</span>
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
                                            <div className="mt-1 space-y-0.5 text-gray-500 text-[11px] font-normal text-center">
                                                {lead.companyName && lead.companyName !== '-' && <div>{toTitleCase(lead.companyName)}</div>}
                                                {getContactDisplay(lead) && <div>{getContactDisplay(lead)}</div>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-xs align-middle text-center py-2 text-black w-[150px] px-2">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <div className="flex items-center justify-center">
                                  <span>{formatJoNumberUtil(lead.joNumber)}</span>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-black hover:text-black hover:bg-transparent" onClick={() => setViewingJoLead(lead)}>
                                          <FileText className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>View Job Order Form</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                {lead.layouts?.[0]?.layoutImage && (
                                    <div className="relative w-24 h-16 mt-1 border rounded-md cursor-pointer" onClick={() => setImageInView(lead.layouts![0].layoutImage!)}>
                                        <Image src={lead.layouts[0].layoutImage} alt="Layout Thumbnail" layout="fill" objectFit="contain" />
                                    </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs align-middle text-center py-2 text-black w-[150px] px-2">
                                <div>{lead.salesRepresentative}</div>
                                {scesProfile?.position && <div className="text-gray-500 text-[10px]">({scesProfile.position})</div>}
                            </TableCell>
                            <TableCell className="align-middle py-3 text-center px-2 w-[150px]">
                               <div className='flex flex-col items-center gap-1'>
                                <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                                    {lead.priorityType}
                                </Badge>
                                <div className="text-gray-500 text-sm font-bold mt-1">{lead.orderType}</div>
                               </div>
                            </TableCell>
                            <TableCell className="text-center align-middle py-3 px-2 w-[150px]">
                               <div onClick={() => toggleLeadDetails(lead.id)} className="inline-flex items-center justify-center gap-2 cursor-pointer rounded-md px-3 py-1 hover:bg-gray-100 mt-1">
                                    <span className="font-semibold text-sm">{totalQuantity} items</span>
                                    {isCollapsibleOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                </div>
                            </TableCell>
                             <TableCell className="align-middle py-3 px-2 w-[400px]">
                                <div className="border rounded-md p-2 mt-1">
                                    <div className="relative pt-4">
                                        <div
                                            className="absolute top-0 px-2 py-1 text-xs text-white font-bold bg-[hsl(var(--chart-1))] rounded-md shadow-lg"
                                            style={{
                                                left: `${Math.min(progress, 100)}%`,
                                                transform: 'translateX(-50%)',
                                                display: progress > 0 ? 'block' : 'none',
                                            }}
                                        >
                                            {progress}%
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-[4px] border-t-[hsl(var(--chart-1))]"></div>
                                        </div>
                                        <div className="h-2 w-full bg-gray-300 rounded-full overflow-hidden mt-4">
                                            <div
                                                className="h-full bg-[hsl(var(--chart-1))] rounded-full striped-progress"
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-xs mt-2">
                                        <div className="flex flex-col items-center gap-1">
                                            <p className="font-semibold text-gray-500">Programming</p>
                                            <Badge variant={programmingStatus.variant as any} className="text-center justify-center w-full whitespace-normal break-words">{programmingStatus.text}</Badge>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <p className="font-semibold text-gray-500">Item Prep</p>
                                            <Badge variant={itemPreparationStatus.variant as any} className="text-center justify-center">{itemPreparationStatus.text}</Badge>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                          <p className="font-semibold text-gray-500">Production</p>
                                          <Badge variant={productionStatus.variant as any} className="text-center justify-center whitespace-normal break-words">
                                            {productionStatus.text}
                                          </Badge>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <p className="font-semibold text-gray-500">Shipment</p>
                                            <Badge variant={shipmentStatus.variant as any} className="text-center justify-center">{shipmentStatus.text}</Badge>
                                        </div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className={cn(
                              "text-center text-xs align-middle py-3 px-2 w-[150px]",
                                (lead.shipmentStatus === 'Shipped' || lead.shipmentStatus === 'Delivered')
                                ? "text-green-600 font-medium"
                                : deadlineInfo.isOverdue
                                ? "text-red-500 font-bold"
                                : deadlineInfo.isUrgent
                                ? "text-amber-600 font-bold"
                                : ""
                            )}>{deadlineInfo.text}</TableCell>
                            <TableCell className="text-center text-xs align-middle py-3 font-medium px-2 w-[150px]">
                                {lead.operationalCase ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Badge variant="destructive" className="cursor-pointer">{lead.operationalCase.caseType}</Badge>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-4 bg-blue-50 shadow-xl border">
                                      <div className="flex gap-4">
                                        <div className="flex-1 space-y-2">
                                          <div className="space-y-1">
                                            <h4 className="font-medium leading-none">{lead.operationalCase.caseType}</h4>
                                            <p className="text-sm text-muted-foreground">
                                              Case for J.O. {formatJoNumberUtil(parseInt(lead.operationalCase.joNumber.split('-')[2], 10))}
                                            </p>
                                          </div>
                                          <div className="grid gap-2 text-sm">
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium">Quantity:</span>
                                              <span className="font-semibold">{lead.operationalCase.quantity}</span>
                                            </div>
                                            <div className="flex flex-col items-start gap-1">
                                              <span className="font-medium">Remarks:</span>
                                              <p className="whitespace-pre-wrap bg-background p-2 rounded-md text-sm w-full">{lead.operationalCase.remarks}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium">Recorded:</span>
                                              <span className="text-xs">{formatDateTime(lead.operationalCase.submissionDateTime).dateTime}</span>
                                            </div>
                                          </div>
                                        </div>
                                        {lead.operationalCase.image && (
                                          <div className="flex-shrink-0 w-48 h-48">
                                            <div
                                              className="relative w-full h-full cursor-pointer"
                                              onClick={() => {if (lead.operationalCase?.image) setImageInView(lead.operationalCase.image!)}}
                                            >
                                              <Image
                                                src={lead.operationalCase.image}
                                                alt="Case Image"
                                                layout="fill"
                                                objectFit="contain"
                                                className="rounded-md"
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                    <span className="text-muted-foreground">-</span>
                                )}
                            </TableCell>
                            <TableCell className="text-center align-middle p-1 font-medium px-2 w-[120px]">
                                <Badge variant={overallStatus.variant} className="uppercase rounded-md text-sm">{overallStatus.text}</Badge>
                            </TableCell>
                        </TableRow>
                        {isCollapsibleOpen && (
                          <TableRow>
                              <TableCell colSpan={13} className="p-0">
                                <div className="p-4 bg-blue-50 rounded-md my-2 grid grid-cols-2 gap-4 max-w-4xl mx-auto">
                                    <div>
                                      <h4 className="font-semibold text-black mb-2 text-center">Ordered Items</h4>
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
                                              <TableCell className="py-1 px-2 text-xs text-black align-middle">{order.productType}</TableCell>
                                              <TableCell className="py-1 px-2 text-xs text-black align-middle">{order.color}</TableCell>
                                              <TableCell className="py-1 px-2 text-xs text-black align-middle">{order.size}</TableCell>
                                              <TableCell className="py-1 px-2 text-xs text-black text-right align-middle">{order.quantity}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                        {lead.orders && lead.orders.length > 1 && (
                                          <TableFooter>
                                              <TableRow>
                                              <TableCell colSpan={3} className="text-right font-bold text-black pt-1 px-2">Total Quantity</TableCell>
                                              <TableCell className="font-bold text-black text-right pt-1 px-2">{totalQuantity}</TableCell>
                                              </TableRow>
                                          </TableFooter>
                                        )}
                                      </Table>
                                    </div>
                                    {(finalProgrammedLogo?.some(f => f?.url) || finalProgrammedBackDesign?.some(f => f?.url)) && (
                                        <div>
                                            <h4 className="font-semibold text-black mb-2 text-center">Final Programmed Designs</h4>
                                            <div className="flex gap-2 flex-wrap justify-center">
                                                {finalProgrammedLogo?.map((file, index) => file?.url && (
                                                    <div key={`fp-logo-${index}`} className="relative w-24 h-24 border rounded-md cursor-pointer" onClick={() => setImageInView(file.url)}>
                                                        <Image src={file.url} alt={`Final Programmed Logo ${index + 1}`} layout="fill" objectFit="contain" />
                                                    </div>
                                                ))}
                                                {finalProgrammedBackDesign?.map((file, index) => file?.url && (
                                                    <div key={`fp-back-${index}`} className="relative w-24 h-24 border rounded-md cursor-pointer" onClick={() => setImageInView(file.url)}>
                                                        <Image src={file.url} alt={`Final Programmed Back Design ${index + 1}`} layout="fill" objectFit="contain" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                              </TableCell>
                            </TableRow>
                        )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

    