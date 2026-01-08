
'use client';

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
import React, { useState, useMemo, useCallback } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { differenceInDays, addDays } from 'date-fns';
import { cn, formatDateTime } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import Image from 'next/image';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Progress } from './ui/progress';

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
  orderType: string;
  orders: Order[];
  priorityType: 'Rush' | 'Regular';
  submissionDateTime: string;
  joNumber?: number;
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

export function OrderStatusTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const [overallStatusFilter, setOverallStatusFilter] = useState('All');
  const [overdueStatusFilter, setOverdueStatusFilter] = useState('All');
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [openCustomerDetails, setOpenCustomerDetails] = useState<string | null>(null);
  const [imageInView, setImageInView] = useState<string | null>(null);

  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const operationalCasesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'operationalCases')) : null, [firestore]);
  
  const { data: leads, isLoading: areLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery);
  const { data: operationalCases, isLoading: areCasesLoading, error: casesError } = useCollection<OperationalCase>(operationalCasesQuery);

  const isLoading = areLeadsLoading || areCasesLoading;
  const error = leadsError || casesError;
  
  const toggleLeadDetails = useCallback((leadId: string) => {
    setOpenLeadId(openLeadId === leadId ? null : leadId);
  }, [openLeadId]);

  const toggleCustomerDetails = useCallback((leadId: string) => {
    setOpenCustomerDetails(openCustomerDetails === leadId ? null : leadId);
  }, [openCustomerDetails]);

  const calculateDeadline = useCallback((lead: Lead) => {
    if (lead.shipmentStatus === 'Shipped' && lead.shippedTimestamp) {
        return { text: `Shipped: ${formatDateTime(lead.shippedTimestamp).dateTimeShort}`, isOverdue: false, isUrgent: false, remainingDays: Infinity };
    }

    const submissionDate = new Date(lead.submissionDateTime);
    const deadlineDays = lead.priorityType === 'Rush' ? 7 : 22;
    const deadlineDate = addDays(submissionDate, deadlineDays);
    const remainingDays = differenceInDays(deadlineDate, new Date());
    
    if (remainingDays < 0) {
      return { text: `${Math.abs(remainingDays)} day(s) overdue`, isOverdue: true, isUrgent: false, remainingDays };
    } else if (remainingDays <= 3) {
      return { text: `${remainingDays} day(s) remaining`, isOverdue: false, isUrgent: true, remainingDays };
    } else {
      return { text: `${remainingDays} day(s) remaining`, isOverdue: false, isUrgent: false, remainingDays };
    }
  }, []);

  const getProgrammingStatus = useCallback((lead: Lead) => {
    if (lead.isFinalProgram) return { text: "Final Program Uploaded", variant: "success" as const };
    if (lead.isFinalApproval) return { text: "Final Program Approved", variant: "success" as const };
    if (lead.isRevision) return { text: "Under Revision", variant: "warning" as const };
    if (lead.isLogoTesting) return { text: "Done Testing", variant: "warning" as const };
    if (lead.isInitialApproval) return { text: "Initial Program Approved", variant: "default" as const };
    if (lead.isUnderProgramming) return { text: "Done Initial Program", variant: "default" as const };
    if (lead.joNumber) return { text: "Pending Initial Program", variant: "secondary" as const };
    return { text: "Pending J.O.", variant: "secondary" as const };
  }, []);

  const getItemPreparationStatus = useCallback((lead: Lead): { text: string; variant: "success" | "warning" | "secondary" } => {
    if (lead.isSentToProduction) return { text: 'Sent to Production', variant: 'success' };
    if (lead.isPreparedForProduction) return { text: 'Prepared', variant: 'warning' };
    return { text: 'Pending', variant: 'secondary' };
  }, []);

  const getProductionStatus = useCallback((lead: Lead): { text: string; variant: "success" | "warning" | "destructive" | "secondary" } => {
    if (lead.isDone) return { text: 'Done Production', variant: 'success' };
    if (lead.sewerType && lead.sewerType !== 'Pending') {
      return { text: `Ongoing with Sewer (${lead.sewerType})`, variant: 'warning' };
    }
    if (lead.productionType && lead.productionType !== 'Pending') {
      return { text: `Ongoing Production (${lead.productionType})`, variant: 'warning' };
    }
    return { text: 'Pending', variant: 'secondary' };
  }, []);

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
    if (lead.shipmentStatus === 'Shipped' || lead.shipmentStatus === 'Delivered') return 100;
    if (lead.shipmentStatus === 'Packed') return 95;
    
    if (lead.isDone) return 90;
    if (lead.isTrimming) return 85;
    if (lead.sewerType && lead.sewerType !== 'Pending') return 70;
    if (lead.productionType && lead.productionType !== 'Pending') return 50;

    if (lead.isSentToProduction) return 40;
    if (lead.isPreparedForProduction) return 35;

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
  
  const formatJoNumber = useCallback((joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
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

  const filteredLeads = useMemo(() => {
    if (!processedLeads) return [];
    
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    const filtered = processedLeads.filter(lead => {
      const matchesSearch = searchTerm ?
        (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
        (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(lowercasedSearchTerm.replace(/-/g, ''))) ||
        (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(lowercasedSearchTerm.replace(/-/g, ''))))
        : true;
      
      const joString = formatJoNumber(lead.joNumber);
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

  }, [processedLeads, searchTerm, joNumberSearch, overallStatusFilter, overdueStatusFilter, formatJoNumber, getOverallStatus, calculateDeadline]);
  
  const leadsWithCases = useMemo(() => {
    if (!filteredLeads || !operationalCases) return [];
    return filteredLeads.map(lead => {
      const matchingCase = operationalCases.find(c => c.joNumber === formatJoNumber(lead.joNumber) && !c.isArchived && !c.isDeleted);
      return { ...lead, operationalCase: matchingCase };
    });
  }, [filteredLeads, operationalCases, formatJoNumber]);

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
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
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
                <span className="sr-only">Close image view</span>
            </Button>
          </div>
        </div>
      )}
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-black">Overall Order Status</CardTitle>
              <CardDescription className="text-gray-600">
                Here is the overall status of all customer orders.
              </CardDescription>
            </div>
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
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
           <div className="border rounded-md relative h-full">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-white font-bold align-middle w-[250px]">Customer</TableHead>
                    <TableHead className="text-white font-bold align-middle w-[400px] text-center">Progress</TableHead>
                    <TableHead className="text-center text-white font-bold align-middle w-[120px]">Order Details</TableHead>
                    <TableHead className="text-center text-white font-bold align-middle w-[150px]">Deadline</TableHead>
                    <TableHead className="text-center text-white font-bold align-middle w-[150px]">Operational Case</TableHead>
                    <TableHead className="text-center text-white font-bold align-middle w-[120px]">Overall Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {leadsWithCases.map((lead) => {
                  const deadlineInfo = calculateDeadline(lead);
                  const programmingStatus = getProgrammingStatus(lead);
                  const itemPreparationStatus = getItemPreparationStatus(lead);
                  const productionStatus = getProductionStatus(lead);
                  const overallStatus = getOverallStatus(lead);
                  const totalQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
                  const isCollapsibleOpen = openLeadId === lead.id;
                  const isRepeat = lead.orderNumber > 1;
                  const progress = getProgressValue(lead);
                  
                  return (
                    <React.Fragment key={lead.id}>
                        <TableRow className="border-b-2 border-gray-300">
                            <TableCell className="font-medium align-top py-3 text-black text-sm">
                                <div className="flex items-center cursor-pointer font-bold" onClick={() => toggleCustomerDetails(lead.id)}>
                                    <span>{lead.customerName}</span>
                                    <ChevronDown className="h-4 w-4 ml-1 transition-transform [&[data-state=open]]:rotate-180" data-state={openCustomerDetails === lead.id ? 'open' : 'closed'} />
                                </div>
                                 <p className="text-xs text-gray-500 font-normal">{formatJoNumber(lead.joNumber)}</p>
                                {isRepeat ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center gap-1.5 cursor-pointer mt-1">
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
                                {openCustomerDetails === lead.id && (
                                  <div className="mt-1 space-y-0.5 text-gray-500 text-[11px] font-normal">
                                      {lead.companyName && lead.companyName !== '-' && <div>{lead.companyName}</div>}
                                      {getContactDisplay(lead) && <div>{getContactDisplay(lead)}</div>}
                                  </div>
                                )}
                            </TableCell>
                            <TableCell className="align-top py-4">
                                <div className="flex flex-col gap-2">
                                   <div className="relative w-full pt-6">
                                      {progress > 0 && (
                                        <span
                                            className="absolute text-xs font-bold text-[color:hsl(var(--chart-6))]"
                                            style={{ 
                                              left: `calc(${Math.min(progress, 100)}% - 14px)`,
                                              bottom: 'calc(100% - 0.25rem)'
                                            }}
                                        >
                                            {progress}%
                                        </span>
                                      )}
                                      <Progress value={progress} className="h-2 w-full" indicatorClassName="bg-[hsl(var(--chart-6))]" />
                                  </div>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div className="flex flex-col items-center gap-1">
                                            <p className="font-semibold text-gray-500">Programming</p>
                                            <Badge variant={programmingStatus.variant as any}>{programmingStatus.text}</Badge>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <p className="font-semibold text-gray-500">Item Prep</p>
                                            <Badge variant={itemPreparationStatus.variant as any}>{itemPreparationStatus.text}</Badge>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <p className="font-semibold text-gray-500">Production</p>
                                            <Badge variant={productionStatus.variant as any}>{productionStatus.text}</Badge>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <p className="font-semibold text-gray-500">Shipment</p>
                                            <Badge variant="secondary">{lead.shipmentStatus || 'Pending'}</Badge>
                                        </div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-center align-top py-3">
                              <div className='flex flex-col items-center gap-1'>
                                <Badge className={cn(lead.priorityType === 'Rush' && 'bg-red-500 text-white')}>
                                    {lead.priorityType}
                                </Badge>
                                <div className="text-gray-500 text-[10px] mt-1 whitespace-nowrap">{lead.orderType}</div>
                                <div onClick={() => toggleLeadDetails(lead.id)} className="inline-flex items-center justify-center gap-2 cursor-pointer rounded-md px-3 py-1 hover:bg-gray-100 mt-1">
                                    <span className="font-semibold text-sm">{totalQuantity} items</span>
                                    {isCollapsibleOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className={cn(
                              "text-center text-xs align-top py-3 font-medium",
                              deadlineInfo.isOverdue && "text-red-500",
                              deadlineInfo.isUrgent && "text-amber-600",
                              !deadlineInfo.isOverdue && !deadlineInfo.isUrgent && "text-green-600"
                            )}>{deadlineInfo.text}</TableCell>
                            <TableCell className="text-center text-xs align-top py-3 font-medium">
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
                                              Case for J.O. {lead.operationalCase.joNumber}
                                            </p>
                                          </div>
                                          <div className="grid gap-2 text-sm">
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium">Quantity:</span>
                                              <span className="font-semibold">{lead.operationalCase.quantity}</span>
                                            </div>
                                            <div className="flex flex-col items-start gap-1">
                                              <span className="font-medium">Remarks:</span>
                                              <p className="whitespace-pre-wrap bg-background p-2 rounded-md text-xs w-full">{lead.operationalCase.remarks}</p>
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
                                              onClick={() => setImageInView(lead.operationalCase!.image!)}
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
                            <TableCell className="text-center align-top py-3 font-medium">
                                <Badge variant={overallStatus.variant} className="uppercase rounded-md text-sm">{overallStatus.text}</Badge>
                            </TableCell>
                        </TableRow>
                        {isCollapsibleOpen && (
                          <TableRow>
                              <TableCell colSpan={11}>
                              <div className="p-2 bg-gray-50">
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
