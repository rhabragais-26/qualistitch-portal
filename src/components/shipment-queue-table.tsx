

'use client';

import { doc, updateDoc, collection, query, setDoc, getDocs, where } from 'firebase/firestore';
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
import React, { useState, useMemo, useCallback, useEffect, ChangeEvent } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Check, ChevronDown, RefreshCcw, AlertTriangle, Send, Plus, Trash2, ChevronUp } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn, formatDateTime, toTitleCase, formatJoNumber as formatJoNumberUtil } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Input } from './ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { addDays, differenceInDays, format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
}

type Layout = {
  layoutImage?: string | null;
  waybillNumbers?: string[];
  isWaybillPrinted?: boolean;
};

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber?: string;
  landlineNumber?: string;
  courier: string;
  joNumber?: number;
  orders: Order[];
  submissionDateTime: string;
  deliveryDate?: string;
  priorityType: 'Rush' | 'Regular';
  isEndorsedToLogistics?: boolean;
  endorsedToLogisticsTimestamp?: string;
  isSalesAuditRequested?: boolean;
  salesAuditRequestedTimestamp?: string;
  isSalesAuditComplete?: boolean;
  salesAuditCompleteTimestamp?: string;
  isWaybillPrinted?: boolean;
  waybillNumbers?: string[];
  isQualityApproved?: boolean;
  qualityApprovedTimestamp?: string;
  isRecheckingQuality?: boolean;
  isPacked?: boolean;
  packedTimestamp?: string;
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  shippedTimestamp?: string;
  deliveredTimestamp?: string;
  adjustedDeliveryDate?: string | null;
  orderType?: string;
  isJoHardcopyReceived?: boolean;
  joHardcopyReceivedTimestamp?: string;
  isJoPrinted?: boolean;
  isDone?: boolean;
  photoshootDate?: string;
  layouts?: Layout[];
  forceNewCustomer?: boolean;
}

type OperationalCase = {
  id: string;
  joNumber: string;
  caseType: string;
  isArchived?: boolean;
  isDeleted?: boolean;
};

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

type ShipmentQueueTableProps = {
  isReadOnly: boolean;
  filterType?: 'ONGOING' | 'COMPLETED';
};

const ShipmentQueueTableRowGroup = React.memo(function ShipmentQueueTableRowGroup({
    lead,
    isRepeat,
    getContactDisplay,
    toggleCustomerDetails,
    openCustomerDetails,
    isReadOnly,
    isCompleted,
    activeCasesByJo,
    formatJoNumber,
    handleRequestSalesAudit,
    handleApproveQuality,
    setDisapprovingLead,
    packingLead,
    setPackingLead,
    handleWaybillPrintedChange,
    handleOpenWaybillDialog,
    waybillNumbers,
    setShippingLead,
    setDeliveringLead,
}: {
    lead: EnrichedLead;
    isRepeat: boolean;
    getContactDisplay: (lead: Lead) => string | null;
    toggleCustomerDetails: (leadId: string) => void;
    openCustomerDetails: string | null;
    isReadOnly: boolean;
    isCompleted: boolean;
    activeCasesByJo: Map<string, string>;
    formatJoNumber: (joNumber: number | undefined) => string;
    handleRequestSalesAudit: (lead: Lead) => void;
    handleApproveQuality: (lead: Lead) => void;
    setDisapprovingLead: React.Dispatch<React.SetStateAction<Lead | null>>;
    packingLead: { lead: Lead; isPacking: boolean } | null;
    setPackingLead: React.Dispatch<React.SetStateAction<{ lead: Lead; isPacking: boolean; } | null>>;
    handleWaybillPrintedChange: (leadId: string, checked: boolean) => void;
    handleOpenWaybillDialog: (lead: Lead) => void;
    waybillNumbers: Record<string, string[]>;
    setShippingLead: React.Dispatch<React.SetStateAction<Lead | null>>;
    setDeliveringLead: React.Dispatch<React.SetStateAction<Lead | null>>;
}) {
    const status = getStatus(lead);
    const deliveryDate = lead.adjustedDeliveryDate ? new Date(lead.adjustedDeliveryDate) : (lead.deliveryDate ? new Date(lead.deliveryDate) : addDays(new Date(lead.submissionDateTime), lead.priorityType === 'Rush' ? 7 : 22));
    
    let daysOverdue: number | null = null;
    if (lead.shipmentStatus === 'Shipped' && lead.shippedTimestamp) {
        const shippedDate = new Date(lead.shippedTimestamp);
        const overdueDaysAtShipment = differenceInDays(shippedDate, deliveryDate);
        if (overdueDaysAtShipment > 0) {
            daysOverdue = overdueDaysAtShipment;
        }
    } else if (lead.shipmentStatus !== 'Shipped' && lead.shipmentStatus !== 'Delivered') {
        const currentOverdueDays = differenceInDays(new Date(), deliveryDate);
        if (currentOverdueDays > 0) {
            daysOverdue = currentOverdueDays;
        }
    }
    
    return (
        <React.Fragment>
            <TableRow>
                <TableCell className="text-xs text-left">
                    <div className="flex items-center justify-start gap-1">
                        <span>{formatJoNumber(lead.joNumber)}</span>
                        {activeCasesByJo.has(formatJoNumber(lead.joNumber)) && (
                        <TooltipProvider>
                            <Tooltip>
                            <TooltipTrigger>
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{activeCasesByJo.get(formatJoNumber(lead.joNumber))}</p>
                            </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        )}
                    </div>
                </TableCell>
                <TableCell className="text-xs">
                    <Collapsible>
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center cursor-pointer">
                                <ChevronDown className="h-4 w-4 mr-1 transition-transform [&[data-state=open]]:rotate-180" />
                                <span className="font-bold">{lead.customerName}</span>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-1 pl-6 text-gray-500 text-[11px] font-normal">
                            {lead.companyName && lead.companyName !== '-' && <div>{toTitleCase(lead.companyName)}</div>}
                            {getContactDisplay(lead) && <div>{getContactDisplay(lead)}</div>}
                        </CollapsibleContent>
                    </Collapsible>
                    {isRepeat ? (
                        <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 cursor-pointer mt-1 ml-5">
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
                        <div className="text-xs text-blue-600 font-semibold mt-1 ml-5">New Customer</div>
                    )}
                </TableCell>
                <TableCell className="text-center align-middle py-2">
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Checkbox
                        checked={lead.isJoHardcopyReceived || false}
                        onCheckedChange={(checked) => handleWaybillPrintedChange(lead.id, !!checked)}
                        disabled={isReadOnly || isCompleted}
                        className={isReadOnly || isCompleted ? 'disabled:opacity-100' : ''}
                        />
                        {lead.joHardcopyReceivedTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.joHardcopyReceivedTimestamp).dateTimeShort}</div>}
                    </div>
                </TableCell>
                <TableCell className="text-center">
                    {lead.isQualityApproved ? (
                        <div className="flex flex-col items-center justify-center gap-1">
                            <div className="flex items-center font-bold text-green-600 text-xs">
                                <Check className="h-4 w-4 mr-1" />
                                Approved
                            </div>
                            {lead.qualityApprovedTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.qualityApprovedTimestamp).dateTimeShort}</div>}
                        </div>
                    ) : (
                        <div className="flex gap-2 justify-center">
                            <Button size="sm" className={cn("h-7 text-xs bg-green-600 hover:bg-green-700 text-white font-bold", isReadOnly || isCompleted ? "disabled:opacity-100" : "")} onClick={() => handleApproveQuality(lead)} disabled={(lead.orderType !== 'Stock (Jacket Only)' && !lead.isJoHardcopyReceived) || isReadOnly || isCompleted}>Approve</Button>
                            <Button size="sm" variant="destructive" className={cn("h-7 text-xs font-bold", isReadOnly || isCompleted ? "disabled:opacity-100" : "")} onClick={() => setDisapprovingLead(lead)} disabled={(lead.orderType !== 'Stock (Jacket Only)' && !lead.isJoHardcopyReceived) || isReadOnly || isCompleted}>Disapprove</Button>
                        </div>
                    )}
                </TableCell>
                <TableCell className="text-xs text-center">
                    {lead.photoshootDate ? format(new Date(lead.photoshootDate), 'MMM-dd') : '-'}
                </TableCell>
                <TableCell className="text-center">
                <div className="flex flex-col items-center justify-center gap-1">
                    <Checkbox
                        checked={!!lead.isPacked}
                        onCheckedChange={(checked) => {
                        setPackingLead({ lead, isPacking: !!checked });
                        }}
                        disabled={!lead.isQualityApproved || isReadOnly || isCompleted}
                        className={isReadOnly || isCompleted ? 'disabled:opacity-100' : ''}
                    />
                    {lead.isPacked && lead.packedTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.packedTimestamp).dateTimeShort}</div>}
                </div>
                </TableCell>
                <TableCell className="text-center">
                    {lead.isSalesAuditRequested ? (
                        <div className="flex flex-col items-center justify-center gap-1">
                            <span className="text-orange-500 font-bold text-xs">Requested</span>
                            {lead.salesAuditRequestedTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.salesAuditRequestedTimestamp).dateTimeShort}</div>}
                        </div>
                    ) : lead.isSalesAuditComplete ? (
                        <div className="flex flex-col items-center justify-center gap-1">
                            <span className="text-blue-600 font-bold text-xs">Done Audit</span>
                            {lead.salesAuditCompleteTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.salesAuditCompleteTimestamp).dateTimeShort}</div>}
                        </div>
                    ) : (
                        <Button size="sm" className={cn("h-7 text-xs font-bold", isReadOnly || isCompleted ? "disabled:opacity-100" : "")} onClick={() => handleRequestSalesAudit(lead)} disabled={!lead.isPacked || isReadOnly || isCompleted}>
                            Request Audit from Sales
                        </Button>
                    )}
                </TableCell>
                <TableCell className={cn("text-xs text-center", lead.adjustedDeliveryDate && "font-bold")}>
                    {format(deliveryDate, "MMM dd, yyyy")}
                    {lead.adjustedDeliveryDate && <div className="text-gray-500 text-[10px]">(Adjusted)</div>}
                    {daysOverdue !== null && daysOverdue > 0 && <div className="text-red-500 font-medium">({daysOverdue} days overdue)</div>}
                </TableCell>
                <TableCell className="text-xs text-center">{lead.courier}</TableCell>
                <TableCell className="text-center">
                    <Checkbox
                        checked={lead.isWaybillPrinted}
                        onCheckedChange={(checked) => handleWaybillPrintedChange(lead.id, !!checked)}
                        disabled={isReadOnly || isCompleted || !lead.isSalesAuditComplete}
                        className={isReadOnly || isCompleted ? 'disabled:opacity-100' : ''}
                    />
                </TableCell>
                <TableCell>
                    <div className="relative">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-left font-normal h-8"
                            onClick={() => handleOpenWaybillDialog(lead)}
                            disabled={!lead.isWaybillPrinted || isReadOnly || isCompleted}
                        >
                            Add Waybill No.
                        </Button>
                        {(waybillNumbers[lead.id]?.length || 0) > 0 && (
                            <Badge className="absolute -top-2 -right-2">{waybillNumbers[lead.id].length}</Badge>
                        )}
                    </div>
                </TableCell>
                <TableCell className="text-xs text-center">
                <Badge variant={status.variant}>{status.text}</Badge>
                </TableCell>
                <TableCell className="text-center">
                    {filterType === 'COMPLETED' ? (
                        lead.shipmentStatus === 'Delivered' ? (
                            <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center text-sm text-green-600 font-semibold">
                                    <Check className="mr-2 h-4 w-4" /> Delivered
                                </div>
                                {lead.deliveredTimestamp && (
                                    <div className="text-xs text-gray-500">
                                        {formatDateTime(lead.deliveredTimestamp).dateTimeShort}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Button
                                size="sm"
                                className={cn("h-7 text-xs font-bold", isReadOnly && "disabled:opacity-100")}
                                onClick={() => setDeliveringLead(lead)}
                                disabled={isReadOnly}
                            >
                                Mark as Delivered
                            </Button>
                        )
                    ) : (
                        <Button
                          size="sm"
                          className={cn("h-7 text-xs font-bold", isReadOnly || isCompleted ? "disabled:opacity-100" : "")}
                          onClick={() => setShippingLead(lead)}
                          disabled={!lead.isSalesAuditComplete || isReadOnly || isCompleted}
                        >
                          Ship Now
                        </Button>
                    )}
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
});
ShipmentQueueTableRowGroup.displayName = 'ShipmentQueueTableRowGroup';

const getStatus = (lead: Lead): { text: string; variant: "default" | "secondary" | "destructive" | "warning" | "success" } => {
    if (lead.shipmentStatus === 'Delivered') return { text: 'Delivered', variant: 'success' };
    if (lead.shipmentStatus === 'Shipped') return { text: 'Shipped', variant: 'success' };
    if (lead.isPacked) return { text: "Already Packed", variant: "default" };
    if (lead.isSalesAuditRequested) return { text: "On-going Audit", variant: "warning" };
    if (lead.isQualityApproved) return { text: "Approved Quality", variant: "default" };
    if (lead.isRecheckingQuality) return { text: "Re-checking Quality", variant: "destructive" };
    return { text: lead.shipmentStatus || 'Pending', variant: 'secondary' };
}

export function ShipmentQueueTable({ isReadOnly, filterType = 'ONGOING' }: ShipmentQueueTableProps) {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads } = useCollection<Lead>(leadsQuery);

  const operationalCasesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'operationalCases')) : null, [firestore]);
  const { data: operationalCases } = useCollection<OperationalCase>(operationalCasesQuery);

  const { toast } = useToast();
  const router = useRouter();
  const [disapprovingLead, setDisapprovingLead] = useState<Lead | null>(null);
  const [packingLead, setPackingLead] = useState<{lead: Lead, isPacking: boolean} | null>(null);
  const [shippingLead, setShippingLead] = useState<Lead | null>(null);
  const [deliveringLead, setDeliveringLead] = useState<Lead | null>(null);
  const [remarks, setRemarks] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [uncheckConfirmation, setUncheckConfirmation] = useState<{ leadId: string; field: 'isJoHardcopyReceived'; } | null>(null);
  const [joReceivedConfirmation, setJoReceivedConfirmation] = useState<string | null>(null);
  const [imageInView, setImageInView] = useState<string | null>(null);
  
  const [waybillNumbers, setWaybillNumbers] = useState<Record<string, string[]>>({});
  const [editingWaybills, setEditingWaybills] = useState<{ leadId: string; numbers: string[] } | null>(null);

  const isCompleted = filterType === 'COMPLETED';
  
  useEffect(() => {
    if(leads) {
        const initialWaybills: Record<string, string[]> = {};
        leads.forEach(lead => {
            if (lead.waybillNumbers) {
                initialWaybills[lead.id] = lead.waybillNumbers;
            }
        });
        setWaybillNumbers(initialWaybills);
    }
  }, [leads]);

  const formatJoNumber = useCallback((joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  }, []);

  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || null;
  }, []);
  
  const handleOpenWaybillDialog = (lead: Lead) => {
    setEditingWaybills({ leadId: lead.id, numbers: waybillNumbers[lead.id] || [''] });
  };
  
  const handleSaveWaybills = () => {
      if (!editingWaybills || !firestore) return;
      const { leadId, numbers } = editingWaybills;
      const filteredNumbers = numbers.filter(n => n.trim() !== '');

      setWaybillNumbers(prev => ({ ...prev, [leadId]: filteredNumbers }));
      
      const leadDocRef = doc(firestore, 'leads', leadId);
      updateDoc(leadDocRef, { waybillNumbers: filteredNumbers }).catch((e: any) => {
          toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
      });

      setEditingWaybills(null);
  };
  
  const handleWaybillPrintedChange = async (leadId: string, checked: boolean) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', leadId);
    try {
      await updateDoc(leadDocRef, {
        isWaybillPrinted: checked,
      });
    } catch (e: any) {
      console.error("Error updating waybill status:", e);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: e.message || "Could not update the waybill status.",
      });
    }
  };

  const handleDisapprove = async () => {
    if (!disapprovingLead || !firestore || !remarks.trim()) {
      toast({
        variant: 'destructive',
        title: 'Remarks are required',
        description: 'Please provide a reason for disapproval.',
      });
      return;
    }

    const caseId = uuidv4();
    const operationalCasesRef = collection(firestore, 'operationalCases');
    const caseDocRef = doc(operationalCasesRef, caseId);
    
    const totalQuantity = disapprovingLead.orders.reduce((sum, item) => sum + item.quantity, 0) || 0;

    const caseData = {
        id: caseId,
        joNumber: formatJoNumber(disapprovingLead.joNumber),
        caseType: 'Quality Errors',
        remarks,
        customerName: disapprovingLead.customerName,
        submissionDateTime: new Date().toISOString(),
        caseItems: disapprovingLead.orders.map(o => ({...o, id: uuidv4()})),
        quantity: totalQuantity,
    };

    try {
        await setDoc(caseDocRef, caseData);
        
        const leadDocRef = doc(firestore, 'leads', disapprovingLead.id);
        await updateDoc(leadDocRef, {
            isEndorsedToLogistics: false,
            isQualityApproved: false,
            isRecheckingQuality: true,
        });

        toast({
            title: 'Order Disapproved',
            description: 'The order has been sent back to production with your remarks.',
        });
        
        const joNumber = formatJoNumber(disapprovingLead.joNumber);
        router.push(`/inventory/operational-cases?joNumber=${joNumber}&source=quality_check`);

        setDisapprovingLead(null);
        setRemarks('');

    } catch (e: any) {
        console.error("Error creating operational case or updating lead:", e);
        toast({
            variant: "destructive",
            title: "Action Failed",
            description: e.message || "Could not complete the disapproval process.",
        });
    }
  };

  const handleRequestSalesAudit = async (lead: Lead) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', lead.id);
    try {
        await updateDoc(leadDocRef, {
            isSalesAuditRequested: true,
            salesAuditRequestedTimestamp: new Date().toISOString(),
        });
        toast({
            title: 'Sales Audit Requested',
            description: `Order for J.O. ${formatJoNumber(lead.joNumber)} has been sent for sales audit.`,
        });
    } catch (e: any) {
        console.error("Error requesting sales audit:", e);
        toast({
            variant: "destructive",
            title: "Request Failed",
            description: e.message || "Could not request sales audit.",
        });
    }
  };
  
  const handleApproveQuality = async (lead: Lead) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', lead.id);
    try {
      await updateDoc(leadDocRef, {
        isQualityApproved: true,
        qualityApprovedTimestamp: new Date().toISOString(),
        isRecheckingQuality: false,
      });
      toast({
        title: 'Quality Approved',
        description: `Order for J.O. ${formatJoNumber(lead.joNumber)} has been approved.`,
      });

      if (lead.isRecheckingQuality) {
        const formattedJo = formatJoNumber(lead.joNumber);
        const matchingCase = operationalCases?.find(
          c => c.joNumber === formattedJo && c.caseType === 'Quality Errors' && !c.isArchived
        );

        if (matchingCase) {
          const caseDocRef = doc(firestore, 'operationalCases', matchingCase.id);
          await updateDoc(caseDocRef, {
            isArchived: true,
          });
          toast({
            title: 'Case Resolved',
            description: `The related "Quality Errors" case has been automatically resolved and archived.`,
          });
        }
      }

    } catch (e: any) {
      console.error("Error approving quality:", e);
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: e.message || "Could not approve the quality check.",
      });
    }
  };

  const confirmPackedChange = useCallback(async (lead: Lead, checked: boolean) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', lead.id);
    try {
      const updateData: any = {
        isPacked: checked,
        packedTimestamp: checked ? new Date().toISOString() : null,
      };

      if(!checked) {
        updateData.isSalesAuditRequested = false;
        updateData.salesAuditRequestedTimestamp = null;
        updateData.isSalesAuditComplete = false;
        updateData.salesAuditCompleteTimestamp = null;
      }

      await updateDoc(leadDocRef, updateData);
    } catch (e: any) {
      console.error("Error updating packed status:", e);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: e.message || "Could not update the packed status.",
      });
    } finally {
        setPackingLead(null);
    }
  }, [firestore, toast]);

  const handleConfirmShip = async () => {
    if (!shippingLead || !firestore) return;

    if (shippingLead.isWaybillPrinted) {
        const waybillNos = waybillNumbers[shippingLead.id];
        if (!waybillNos || waybillNos.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Waybill Number Required',
                description: 'Please enter at least one waybill number before shipping.',
            });
            setShippingLead(null);
            return;
        }
    }

    const leadDocRef = doc(firestore, 'leads', shippingLead.id);
    try {
      await updateDoc(leadDocRef, {
        shipmentStatus: 'Shipped',
        shippedTimestamp: new Date().toISOString(),
      });
      toast({
        title: 'Order Shipped',
        description: `Order for J.O. ${formatJoNumber(shippingLead.joNumber)} has been marked as shipped.`,
      });
    } catch (e: any) {
      console.error("Error shipping order:", e);
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: e.message || "Could not mark the order as shipped.",
      });
    } finally {
      setShippingLead(null);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!deliveringLead || !firestore) return;
    const leadDocRef = doc(firestore, 'leads', deliveringLead.id);
    try {
      await updateDoc(leadDocRef, {
        shipmentStatus: 'Delivered',
        deliveredTimestamp: new Date().toISOString(),
      });
      toast({
        title: 'Order Delivered',
        description: `Order for J.O. ${formatJoNumber(deliveringLead.joNumber)} has been marked as delivered.`,
      });
    } catch (e: any) {
      console.error("Error marking as delivered:", e);
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: e.message || "Could not mark the order as delivered.",
      });
    } finally {
      setDeliveringLead(null);
    }
  };
  
    const handleJoReceivedChange = useCallback((leadId: string, checked: boolean) => {
        const lead = leads?.find((l) => l.id === leadId);
        if (!lead) return;
        
        if (!checked) {
            setUncheckConfirmation({ leadId, field: 'isJoHardcopyReceived' });
        } else {
            setJoReceivedConfirmation(leadId);
        }
    }, [leads]);
    
    const confirmJoReceived = useCallback(async () => {
        if (!joReceivedConfirmation || !firestore) return;
        const leadDocRef = doc(firestore, 'leads', joReceivedConfirmation);
        try {
            await updateDoc(leadDocRef, { 
                isJoHardcopyReceived: true,
                joHardcopyReceivedTimestamp: new Date().toISOString()
            });
        } catch (e: any) {
            console.error("Error updating J.O. receipt status:", e);
            toast({ variant: "destructive", title: "Update Failed", description: e.message || "Could not update the status." });
        } finally {
            setJoReceivedConfirmation(null);
        }
    }, [joReceivedConfirmation, firestore, toast]);

    const confirmUncheck = useCallback(async () => {
        if (!uncheckConfirmation || !firestore) return;
        const { leadId, field } = uncheckConfirmation;
        const leadDocRef = doc(firestore, 'leads', leadId);
        try {
            const timestampField = `${field.replace('is', '').charAt(0).toLowerCase() + field.slice(3)}Timestamp`;
            await updateDoc(leadDocRef, { [field]: false, [timestampField]: null });
        } catch (e: any) {
            console.error(`Error unchecking ${field}:`, e);
            toast({ variant: "destructive", title: "Update Failed", description: e.message || "Could not update the status." });
        } finally {
            setUncheckConfirmation(null);
        }
    }, [uncheckConfirmation, firestore, toast]);

  const processedLeads = useMemo(() => {
    if (!leads) return [];
  
    const customerOrderGroups: { [key: string]: { orders: Lead[] } } = {};
  
    leads.forEach(lead => {
      // Defensive check to ensure lead.orders is an array before using it
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

  const shipmentQueueLeads = useMemo(() => {
    if(!processedLeads) return [];
    
    let relevantLeads;
    if (filterType === 'COMPLETED') {
        relevantLeads = processedLeads.filter(lead => lead.isEndorsedToLogistics && (lead.shipmentStatus === 'Shipped' || lead.shipmentStatus === 'Delivered'));
    } else { // ONGOING
        relevantLeads = processedLeads.filter(lead => lead.isEndorsedToLogistics && lead.shipmentStatus !== 'Shipped' && lead.shipmentStatus !== 'Delivered');
    }

    return relevantLeads.filter(lead => {
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
  }, [processedLeads, searchTerm, joNumberSearch, filterType, formatJoNumber]);

  const [openCustomerDetails, setOpenCustomerDetails] = useState<string | null>(null);
  
  return (
    <>
      <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col border-none">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-black">{filterType === 'COMPLETED' ? 'Completed Shipments' : 'Shipment Queue'}</CardTitle>
                <CardDescription className="text-gray-600">
                {filterType === 'COMPLETED' ? 'Orders that have been shipped or delivered.' : 'Track the status of all shipments.'}
                </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-4">
                    <Input
                        placeholder="Search by J.O. No..."
                        value={joNumberSearch}
                        onChange={(e) => setJoNumberSearch(e.target.value)}
                        className="bg-gray-100 text-black placeholder:text-gray-500 w-48"
                    />
                    <div className="flex-1 min-w-[300px]">
                        <Input
                        placeholder="Search customer, company or contact..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-100 text-black placeholder:text-gray-500"
                        />
                    </div>
                </div>
                <div className="w-full text-right">
                  {filterType === 'COMPLETED' ? (
                      <Link href="/logistics/shipment-queue" className="text-sm text-primary hover:underline">
                          View Shipment Queue
                      </Link>
                  ) : (
                      <Link href="/logistics/completed-shipments" className="text-sm text-primary hover:underline">
                          View Completed Shipments
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
                  <TableHead className="text-white font-bold text-xs text-left">J.O. Number</TableHead>
                  <TableHead className="text-white font-bold text-xs">Customer</TableHead>
                  <TableHead className="text-white font-bold text-xs text-center w-[150px]">Received Printed J.O.?</TableHead>
                  <TableHead className="text-white font-bold text-xs text-center">Quality Check</TableHead>
                  <TableHead className="text-white font-bold text-xs text-center">Photoshoot Request</TableHead>
                  <TableHead className="text-white font-bold text-xs text-center">Packed</TableHead>
                  <TableHead className="text-white font-bold text-xs text-center">Sales Audit</TableHead>
                  <TableHead className="text-white font-bold text-xs text-center">Expected Delivery Date</TableHead>
                  <TableHead className="text-white font-bold text-xs text-center">Courier</TableHead>
                  <TableHead className="text-white font-bold text-xs text-center">Waybill Printed</TableHead>
                  <TableHead className="text-white font-bold text-xs text-center">Waybill No.</TableHead>
                  <TableHead className="text-white font-bold text-xs text-center">Status</TableHead>
                  <TableHead className="text-white font-bold text-xs text-center">{filterType === 'COMPLETED' ? 'Mark as Delivered' : 'Ship Order'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipmentQueueLeads && shipmentQueueLeads.length > 0 ? (
                 shipmentQueueLeads.map((lead) => {
                   const isRepeat = !lead.forceNewCustomer && lead.orderType !== 'Item Sample' && lead.orderNumber > 0;
                   return (
                      <ShipmentQueueTableRowGroup
                          key={lead.id}
                          lead={lead}
                          isRepeat={isRepeat}
                          getContactDisplay={getContactDisplay}
                          toggleCustomerDetails={toggleCustomerDetails}
                          openCustomerDetails={openCustomerDetails}
                          isReadOnly={isReadOnly}
                          isCompleted={isCompleted}
                          activeCasesByJo={activeCasesByJo}
                          formatJoNumber={formatJoNumber}
                          handleRequestSalesAudit={handleRequestSalesAudit}
                          handleApproveQuality={handleApproveQuality}
                          setDisapprovingLead={setDisapprovingLead}
                          packingLead={packingLead}
                          setPackingLead={setPackingLead}
                          handleWaybillPrintedChange={handleWaybillPrintedChange}
                          handleOpenWaybillDialog={handleOpenWaybillDialog}
                          waybillNumbers={waybillNumbers}
                          setShippingLead={setShippingLead}
                          setDeliveringLead={setDeliveringLead}
                      />
                   )
                 })
                ) : (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center text-muted-foreground">
                      {filterType === 'COMPLETED' ? 'No completed shipments found.' : 'No items in the shipment queue.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {disapprovingLead && (
        <Dialog open={!!disapprovingLead} onOpenChange={() => { setDisapprovingLead(null); setRemarks(''); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disapprove Quality for {formatJoNumber(disapprovingLead.joNumber)}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="remarks">Please provide remarks for disapproval:</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g., incorrect embroidery, wrong item size..."
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleDisapprove} disabled={!remarks.trim()}>
                Save and Send Back to Prod
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {packingLead && (
        <AlertDialog open={!!packingLead} onOpenChange={() => setPackingLead(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Action</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {packingLead.isPacking ? 'mark this order as packed' : 'un-pack this order'}?
                {!packingLead.isPacking && " This will also reset the sales audit status."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPackingLead(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => confirmPackedChange(packingLead.lead, packingLead.isPacking)}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {shippingLead && (
        <AlertDialog open={!!shippingLead} onOpenChange={() => setShippingLead(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Shipment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to mark the order for J.O. {formatJoNumber(shippingLead.joNumber)} as shipped? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmShip}>
                Yes, Ship Now
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {deliveringLead && (
        <AlertDialog open={!!deliveringLead} onOpenChange={() => setDeliveringLead(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delivery</AlertDialogTitle>
              <AlertDialogDescription>
                This confirms that the customer has physically received the item. Are you sure you want to mark this order as delivered? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelivery}>
                Yes, Confirm Delivery
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
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
        {editingWaybills && (
          <Dialog open={!!editingWaybills} onOpenChange={(isOpen) => !isOpen && setEditingWaybills(null)}>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Add Waybill Numbers</DialogTitle>
                  </DialogHeader>
                  <div className="py-4 space-y-2">
                      {editingWaybills.numbers.map((number, index) => (
                          <div key={index} className="flex items-center gap-2">
                              <Input
                                  value={number}
                                  onChange={(e) => {
                                      const newNumbers = [...editingWaybills.numbers];
                                      newNumbers[index] = e.target.value;
                                      setEditingWaybills({ ...editingWaybills, numbers: newNumbers });
                                  }}
                                  placeholder={`Waybill No. ${index + 1}`}
                              />
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive h-8 w-8"
                                  onClick={() => {
                                      const newNumbers = editingWaybills.numbers.filter((_, i) => i !== index);
                                      setEditingWaybills({ ...editingWaybills, numbers: newNumbers.length > 0 ? newNumbers : [''] });
                                  }}
                              >
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </div>
                      ))}
                      <Button
                          variant="outline"
                          onClick={() => {
                              setEditingWaybills({ ...editingWaybills, numbers: [...editingWaybills.numbers, ''] });
                          }}
                      >
                          <Plus className="mr-2 h-4 w-4" /> Add another
                      </Button>
                  </div>
                  <DialogFooter>
                      <DialogClose asChild>
                          <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button onClick={handleSaveWaybills}>Save Waybills</Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
        )}
    </>
  );
}
