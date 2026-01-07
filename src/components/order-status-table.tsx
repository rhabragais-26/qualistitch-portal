
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
import React, { useState, useMemo } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { differenceInDays, addDays } from 'date-fns';
import { cn, formatDateTime } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import Image from 'next/image';

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
}

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

type OrderStatusTableProps = {
    leads: Lead[];
    operationalCases: OperationalCase[];
}

export function OrderStatusTable({ leads, operationalCases }: OrderStatusTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [openCustomerDetails, setOpenCustomerDetails] = useState<string | null>(null);
  const [imageInView, setImageInView] = useState<string | null>(null);
  
  const toggleLeadDetails = (leadId: string) => {
    setOpenLeadId(openLeadId === leadId ? null : leadId);
  };

  const toggleCustomerDetails = (leadId: string) => {
    setOpenCustomerDetails(openCustomerDetails === leadId ? null : leadId);
  };

  const calculateDeadline = (lead: Lead) => {
    const submissionDate = new Date(lead.submissionDateTime);
    const deadlineDays = lead.priorityType === 'Rush' ? 7 : 22;
    const deadlineDate = addDays(submissionDate, deadlineDays);
    const remainingDays = differenceInDays(deadlineDate, new Date());
    
    if (remainingDays < 0) {
      return { text: `${Math.abs(remainingDays)} day(s) overdue`, isOverdue: true, isUrgent: false };
    } else if (remainingDays <= 3) {
      return { text: `${remainingDays} day(s) remaining`, isOverdue: false, isUrgent: true };
    } else {
      return { text: `${remainingDays} day(s) remaining`, isOverdue: false, isUrgent: false };
    }
  };

  const getProgrammingStatus = (lead: Lead) => {
    if (lead.isFinalProgram) return { text: "Final Program Uploaded", variant: "success" as const };
    if (lead.isFinalApproval) return { text: "Final Program Approved", variant: "success" as const };
    if (lead.isRevision) return { text: "Under Revision", variant: "destructive" as const };
    if (lead.isLogoTesting) return { text: "Done Testing", variant: "warning" as const };
    if (lead.isInitialApproval) return { text: "Initial Program Approved", variant: "default" as const };
    if (lead.isUnderProgramming) return { text: "Done Initial Program", variant: "default" as const };
    if (lead.joNumber) return { text: "Pending Initial Program", variant: "secondary" as const };
    return { text: "Pending J.O.", variant: "secondary" as const };
  };

  const getItemPreparationStatus = (lead: Lead): { text: string; variant: "success" | "warning" | "secondary" } => {
    if (lead.isSentToProduction) return { text: 'Sent to Production', variant: 'success' };
    if (lead.isPreparedForProduction) return { text: 'Prepared', variant: 'warning' };
    return { text: 'Pending', variant: 'secondary' };
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

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return leads.filter(lead => {
      const matchesSearch = searchTerm ?
        (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
        (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(lowercasedSearchTerm.replace(/-/g, ''))) ||
        (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(lowercasedSearchTerm.replace(/-/g, ''))))
        : true;
      return matchesSearch;
    });
  }, [leads, searchTerm]);
  
  const leadsWithCases = useMemo(() => {
    if (!filteredLeads || !operationalCases) return [];
    return filteredLeads.map(lead => {
      const matchingCase = operationalCases.find(c => c.joNumber === formatJoNumber(lead.joNumber) && !c.isArchived && !c.isDeleted);
      return { ...lead, operationalCase: matchingCase };
    });
  }, [filteredLeads, operationalCases]);

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
              <CardTitle className="text-black">Order Status</CardTitle>
              <CardDescription className="text-gray-600">
                Here are all the ordered items per customer.
              </CardDescription>
            </div>
             <div className="w-full max-w-sm">
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
                    <TableHead className="text-white font-bold align-middle">Customer</TableHead>
                    <TableHead className="text-center text-white font-bold align-middle">Ordered Items</TableHead>
                    <TableHead className="text-center text-white font-bold align-middle">Days Remaining/Overdue</TableHead>
                    <TableHead className="text-center text-white font-bold align-middle">Programming Status</TableHead>
                    <TableHead className="text-center text-white font-bold align-middle">Item Preparation</TableHead>
                    <TableHead className="text-center text-white font-bold align-middle">Operational Case</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {leadsWithCases.map((lead) => {
                  const deadlineInfo = calculateDeadline(lead);
                  const programmingStatus = getProgrammingStatus(lead);
                  const itemPreparationStatus = getItemPreparationStatus(lead);
                  return (
                  <React.Fragment key={lead.id}>
                    <TableRow>
                        <TableCell className="font-medium text-xs align-top py-2 text-black w-[250px]">
                           <Collapsible open={openCustomerDetails === lead.id} onOpenChange={() => toggleCustomerDetails(lead.id)}>
                                <CollapsibleTrigger asChild>
                                    <div className="flex items-center cursor-pointer">
                                        <span>{lead.customerName}</span>
                                        <ChevronDown className="h-4 w-4 ml-1 transition-transform [&[data-state=open]]:rotate-180" />
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="pt-2 text-gray-500 space-y-1 text-xs">
                                    {lead.companyName && lead.companyName !== '-' && <div><strong>Company:</strong> {lead.companyName}</div>}
                                    {getContactDisplay(lead) && <div><strong>Contact:</strong> {getContactDisplay(lead)}</div>}
                                </CollapsibleContent>
                            </Collapsible>
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                          <Button variant="ghost" size="sm" onClick={() => toggleLeadDetails(lead.id)} className="h-8 px-2 text-black hover:bg-gray-200">
                            View
                            {openLeadId === lead.id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                          </Button>
                        </TableCell>
                        <TableCell className={cn(
                          "text-center text-xs align-middle py-2 font-medium",
                          deadlineInfo.isOverdue && "text-red-600",
                          deadlineInfo.isUrgent && "text-amber-600",
                          !deadlineInfo.isOverdue && !deadlineInfo.isUrgent && "text-green-600"
                        )}>{deadlineInfo.text}</TableCell>
                        <TableCell className="text-center text-xs align-middle py-2 font-medium">
                          <Badge variant={programmingStatus.variant as any}>{programmingStatus.text}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs align-middle py-2 font-medium">
                          <Badge variant={itemPreparationStatus.variant as any}>{itemPreparationStatus.text}</Badge>
                        </TableCell>
                         <TableCell className="text-center text-xs align-middle py-2 font-medium">
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
                    </TableRow>
                    {openLeadId === lead.id && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={7}>
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
                )})}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
      </CardContent>
    </Card>
  );
}
