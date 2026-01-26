
'use client';

import { collection, query, doc, updateDoc, getDocs, where } from 'firebase/firestore';
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
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Check, ChevronDown, RefreshCcw, AlertTriangle, Send, Plus, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn, formatDateTime, toTitleCase } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import Link from 'next/link';
import { addDays, differenceInDays, format } from 'date-fns';
import { useRouter } from 'next/navigation';
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
  cuttingTimestamp?: string;
  isSewing?: boolean;
  sewingTimestamp?: string;
  isTrimming?: boolean;
  trimmingTimestamp?: string;
  isDone?: boolean;
  productionType?: ProductionType;
  sewerType?: ProductionType;
  isEmbroideryDone?: boolean;
  embroideryDoneTimestamp?: string;
  isEndorsedToLogistics?: boolean;
  endorsedToLogisticsTimestamp?: string;
  doneProductionTimestamp?: string;
  deliveryDate?: string;
  courier: string;
  location: string;
  recipientName?: string;
  paymentType: string;
  salesRepresentative: string;
  layouts?: Layout[];
  isJoHardcopyReceived?: boolean;
  joHardcopyReceivedTimestamp?: string;
  isJoPrinted?: boolean;
  isRecheckingQuality?: boolean;
  isFinalProgram?: boolean;
}

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

type CheckboxField = 'isCutting' | 'isEmbroideryDone' | 'isSewing' | 'isTrimming' | 'isJoHardcopyReceived';

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
    if (lead.isTrimming) return { text: "Trimming/Cleaning", variant: "warning" };
    if (lead.isSewing) return { text: "Done Sewing", variant: "warning" };
    if (lead.isEmbroideryDone) return { text: "Endorsed to Sewer", variant: "warning" };
    if(lead.isCutting) return { text: "Ongoing Embroidery", variant: "warning" };
    return { text: "Pending", variant: "secondary" };
};

const formatJoNumber = (joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
};

const ProductionDocuments = React.memo(({ lead }: { lead: Lead }) => {
  const [imageInView, setImageInView] = useState<string | null>(null);
  
  const finalFiles = [
    ...(lead.layouts?.[0]?.finalLogoDst?.filter(f => f).map(f => ({ ...f, type: 'Logo (DST)' })) || []),
    ...(lead.layouts?.[0]?.finalBackDesignDst?.filter(f => f).map(f => ({ ...f, type: 'Back Design (DST)' })) || []),
    ...(lead.layouts?.[0]?.finalNamesDst?.filter(f => f).map(f => ({ ...f, type: 'Name (DST)' })) || []),
  ];

  const handleJobOrderPrint = () => {
    const jobOrderUrl = `/job-order/${lead.id}/print?view=true`;
    window.open(jobOrderUrl, '_blank', 'width=1200,height=800,scrollbars=yes');
  };

  const handleDownload = async (url: string, name: string) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: name,
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
    } catch (err) {
        console.error('File save failed:', err);
    }
  };

  const hasFilesToDownload = useMemo(() => {
    const sequenceLogoFiles = lead.layouts?.[0]?.sequenceLogo?.some(s => s?.url);
    const sequenceBackFiles = lead.layouts?.[0]?.sequenceBackDesign?.some(s => s?.url);
    return finalFiles.length > 0 || sequenceLogoFiles || sequenceBackFiles;
  }, [finalFiles, lead.layouts]);

  const handleDownloadAll = async () => {
    if (!hasFilesToDownload) return;
    try {
        const dirHandle = await (window as any).showDirectoryPicker();
        
        const filesToDownload: { name: string; url: string; type: string; }[] = [];

        if(finalFiles.length > 0) {
            filesToDownload.push(...finalFiles.filter((f): f is FileObject & { type: string } => !!f));
        }

        const sequenceLogoFiles = lead.layouts?.[0]?.sequenceLogo?.filter((s): s is FileObject => !!s?.url);
        if(sequenceLogoFiles){
            sequenceLogoFiles.forEach((file, index) => {
                filesToDownload.push({ name: `sequence-logo-${index + 1}.png`, url: file.url, type: 'Sequence' });
            });
        }

        const sequenceBackFiles = lead.layouts?.[0]?.sequenceBackDesign?.filter((s): s is FileObject => !!s?.url);
        if(sequenceBackFiles){
            sequenceBackFiles.forEach((file, index) => {
                filesToDownload.push({ name: `sequence-back-${index + 1}.png`, url: file.url, type: 'Sequence' });
            });
        }
        
        for (const file of filesToDownload) {
            if(file) {
                const response = await fetch(file.url);
                const blob = await response.blob();
                const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
            }
        }
    } catch (err) {
        console.error('Download all failed:', err);
    }
  };


  return (
    <>
      {imageInView && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center animate-in fade-in"
          onClick={() => setImageInView(null)}
        >
          <div className="relative h-[90vh] w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image src={imageInView} alt="Enlarged view" layout="fill" objectFit="contain" />
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
      <div className="p-4 bg-gray-100 border-t-2 border-gray-300 grid grid-cols-1 md:grid-cols-2 gap-x-6">
        <div className="space-y-4">
            <div className="space-y-2">
                <h3 className="font-bold text-lg text-primary">Job Order and Layout</h3>
                <Button onClick={handleJobOrderPrint} variant="default" size="lg" className="bg-primary text-white hover:bg-primary/90">
                    Check Job Order and Layout
                </Button>
            </div>
            <div>
                <h3 className="font-bold text-lg text-primary">Final Program Files</h3>
                <div className="max-h-48 overflow-y-auto pr-2 mt-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        {finalFiles.map((file, index) => (
                        file && 
                        <div key={index} className="flex items-center justify-between p-1 bg-white rounded-md border">
                            <span className="truncate text-xs pl-1"><strong>{file.type}:</strong> {file.name}</span>
                            <Button onClick={() => handleDownload(file.url, file.name)} variant="ghost" size="icon" className="h-7 w-7 text-primary">
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                        ))}
                    </div>
                </div>
                <Button onClick={handleDownloadAll} disabled={!hasFilesToDownload} size="sm" className="text-white font-bold mt-2"><Download className="mr-2 h-4 w-4" />Download All</Button>
            </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-lg text-primary">Sequence</h3>
          <div className="flex gap-2 flex-wrap">
              {lead.layouts?.[0]?.sequenceLogo?.map((seq, index) => seq && seq.url && (
              <div key={`seq-logo-${index}`} className="relative cursor-pointer w-32 h-32" onClick={() => setImageInView(seq.url)}>
                  <Image src={seq.url} alt={`Sequence Logo ${index + 1}`} layout="fill" objectFit="contain" className="rounded-md border"/>
              </div>
              ))}
              {lead.layouts?.[0]?.sequenceBackDesign?.map((seq, index) => seq && seq.url && (
                  <div key={`seq-back-${index}`} className="relative cursor-pointer w-32 h-32" onClick={() => setImageInView(seq.url)}>
                  <Image src={seq.url} alt={`Sequence Back Design ${index + 1}`} layout="fill" objectFit="contain" className="rounded-md border"/>
              </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );
});
ProductionDocuments.displayName = 'ProductionDocuments';

const ProductionQueueTableRowGroup = React.memo(function ProductionQueueTableRowGroup({
    lead,
    isRepeat,
    status,
    deadlineInfo,
    isCompleted,
    getContactDisplay,
    handleJoReceivedChange,
    handleCheckboxChange,
    handleStatusChange,
    handleEndorseToLogistics,
    setLeadToReopen,
    toggleLeadDetails,
    openLeadId
}: {
    lead: EnrichedLead;
    isRepeat: boolean;
    status: { text: string; variant: "success" | "warning" | "secondary" | "default" | "destructive" };
    deadlineInfo: { text: React.ReactNode; isOverdue: boolean; isUrgent: boolean; remainingDays: number };
    isCompleted: boolean;
    getContactDisplay: (lead: Lead) => string | null;
    handleJoReceivedChange: (leadId: string, checked: boolean) => void;
    handleCheckboxChange: (leadId: string, field: CheckboxField, checked: boolean) => void;
    handleStatusChange: (leadId: string, field: "productionType" | "sewerType", value: string) => void;
    handleEndorseToLogistics: (leadId: string) => void;
    setLeadToReopen: (lead: Lead) => void;
    toggleLeadDetails: (leadId: string) => void;
    openLeadId: string | null;
}) {
    const totalQuantity = lead.orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
    const numOrders = lead.orders.length;
    const programmingStatus = getProductionStatusLabel(lead);
    const isStockJacketOnly = lead.orderType === 'Stock (Jacket Only)';

    return (
        <React.Fragment>
            <TableRow>
                <TableCell className="text-xs align-middle text-center py-2 text-black">
                    <Collapsible>
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-center cursor-pointer">
                                <ChevronDown className="h-4 w-4 mr-1 transition-transform [&[data-state=open]]:rotate-180" />
                                <span className="font-bold">{toTitleCase(lead.customerName)}</span>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-1 pl-6 text-gray-500 text-[11px] font-normal text-center">
                            {lead.companyName && lead.companyName !== '-' && <div>{toTitleCase(lead.companyName)}</div>}
                            {getContactDisplay(lead) && <div>{getContactDisplay(lead)}</div>}
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
                <TableCell className="text-xs align-middle py-2 text-black text-center">{formatJoNumber(lead.joNumber)}</TableCell>
                <TableCell className="align-middle py-2 text-center">
                    <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                    {lead.priorityType}
                    </Badge>
                </TableCell>
                <TableCell className={cn(
                    "text-center text-xs align-middle py-3",
                    deadlineInfo.isOverdue && "text-red-500",
                    deadlineInfo.isUrgent && "text-amber-600"
                    )}>{deadlineInfo.text}</TableCell>
                <TableCell className="text-center align-middle py-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleLeadDetails(lead.id)}>
                        <FileText className="h-4 w-4" />
                    </Button>
                </TableCell>
                 <TableCell className="text-center align-middle py-2">
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Checkbox
                        checked={lead.isJoHardcopyReceived || false}
                        onCheckedChange={(checked) => handleJoReceivedChange(lead.id, !!checked)}
                        disabled={isCompleted}
                        className={isCompleted ? 'disabled:opacity-100' : ''}
                        />
                        {lead.joHardcopyReceivedTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.joHardcopyReceivedTimestamp).dateTimeShort}</div>}
                    </div>
                </TableCell>
                <TableCell className="text-center align-middle py-2">
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Checkbox
                        checked={lead.isCutting || false}
                        onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isCutting', !!checked)}
                        disabled={!lead.isJoHardcopyReceived || isCompleted}
                        className={isCompleted ? 'disabled:opacity-100' : ''}
                        />
                        {lead.cuttingTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.cuttingTimestamp).dateTimeShort}</div>}
                    </div>
                </TableCell>
                <TableCell className="text-center align-middle py-2">
                    <Select value={lead.productionType || 'Pending'} onValueChange={(value) => handleStatusChange(lead.id, 'productionType', value)} disabled={!lead.isCutting || isCompleted}>
                    <SelectTrigger className={cn("text-xs h-8", getStatusColor(lead.productionType))}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {productionOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </TableCell>
                <TableCell className="text-center align-middle py-2">
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Checkbox
                        checked={lead.isEmbroideryDone || false}
                        onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isEmbroideryDone', !!checked)}
                        disabled={!lead.productionType || lead.productionType === 'Pending' || isCompleted}
                        className={isCompleted ? 'disabled:opacity-100' : ''}
                        />
                        {lead.embroideryDoneTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.embroideryDoneTimestamp).dateTimeShort}</div>}
                    </div>
                </TableCell>
                <TableCell className="text-center align-middle py-2">
                    <Select value={lead.sewerType || 'Pending'} onValueChange={(value) => handleStatusChange(lead.id, 'sewerType', value)} disabled={!lead.isEmbroideryDone || isCompleted}>
                        <SelectTrigger className={cn("text-xs h-8", getStatusColor(lead.sewerType))}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {productionOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </TableCell>
                <TableCell className="text-center align-middle py-2">
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Checkbox
                        checked={lead.isSewing || false}
                        onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isSewing', !!checked)}
                        disabled={!lead.sewerType || lead.sewerType === 'Pending' || isCompleted}
                        className={isCompleted ? 'disabled:opacity-100' : ''}
                        />
                        {lead.sewingTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.sewingTimestamp).dateTimeShort}</div>}
                    </div>
                </TableCell>
                <TableCell className="text-center align-middle py-2">
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Checkbox
                        checked={lead.isTrimming || false}
                        onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isTrimming', !!checked)}
                        disabled={!lead.isSewing || isCompleted}
                        className={isCompleted ? 'disabled:opacity-100' : ''}
                        />
                        {lead.trimmingTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.trimmingTimestamp).dateTimeShort}</div>}
                    </div>
                </TableCell>
                <TableCell className="align-middle py-2 text-center">
                    <Badge variant={status.variant}>{status.text}</Badge>
                </TableCell>
                <TableCell className="text-center align-middle py-2">
                    {isCompleted ? (
                        <div className="flex flex-col items-center gap-1">
                            <Button size="sm" className="h-7 px-3 bg-green-600 text-white font-bold" onClick={() => setLeadToReopen(lead)}><RefreshCcw className="mr-2 h-4 w-4" /> Reopen</Button>
                        </div>
                    ) : (
                        <Button
                            size="sm"
                            className={cn("h-7 px-3 text-white font-bold", lead.isDone ? 'bg-primary hover:bg-primary/90' : 'bg-gray-400')}
                            disabled={!lead.isDone || isCompleted}
                            onClick={() => handleEndorseToLogistics(lead.id)}
                        >
                            <Send className="mr-2 h-4 w-4" /> Endorse
                        </Button>
                    )}
                </TableCell>
            </TableRow>
            {openLeadId === lead.id && (
                <TableRow>
                <TableCell colSpan={14} className="p-0">
                    <ProductionDocuments lead={lead} />
                </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    );
});
ProductionQueueTableRowGroup.displayName = 'ProductionQueueTableRowGroup';

type ProductionQueueTableProps = {
  isReadOnly: boolean;
  filterType?: 'ONGOING' | 'COMPLETED';
};

export function ProductionQueueTable({ isReadOnly, filterType = 'ONGOING' }: ProductionQueueTableProps) {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const { toast } = useToast();
  const [uncheckConfirmation, setUncheckConfirmation] = useState<{ leadId: string; field: CheckboxField } | null>(null);
  const [joReceivedConfirmation, setJoReceivedConfirmation] = useState<string | null>(null);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [leadToReopen, setLeadToReopen] = useState<Lead | null>(null);

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || null;
  }, []);

  const handleStatusChange = useCallback(async (leadId: string, field: "productionType" | "sewerType", value: string) => {
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
    
    const now = new Date().toISOString();
    const timestampField = `${field.replace('is', '').charAt(0).toLowerCase() + field.slice(3)}Timestamp`;
    const updateData: {[key:string]: any} = { [field]: value, [timestampField]: now };

    if (field === 'isTrimming' && value) {
      updateData.isDone = true;
      updateData.doneProductionTimestamp = now;
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
        const timestampField = `${field.replace('is', '').charAt(0).toLowerCase() + field.slice(3)}Timestamp`;
        const updateData: {[key:string]: any} = { [field]: false, [timestampField]: null };

        if (field === 'isTrimming') {
            updateData.isDone = false;
            updateData.doneProductionTimestamp = null;
        } else if (field === 'isSewing') {
            updateData.isTrimming = false;
            updateData.trimmingTimestamp = null;
            updateData.isDone = false;
            updateData.doneProductionTimestamp = null;
        } else if (field === 'isEmbroideryDone') {
            updateData.isSewing = false;
            updateData.sewingTimestamp = null;
            updateData.isTrimming = false;
            updateData.trimmingTimestamp = null;
            updateData.isDone = false;
            updateData.sewerType = 'Pending';
            updateData.doneProductionTimestamp = null;
        } else if (field === 'isCutting') {
          updateData.isEmbroideryDone = false;
          updateData.embroideryDoneTimestamp = null;
          updateData.isSewing = false;
          updateData.sewingTimestamp = null;
          updateData.isTrimming = false;
          updateData.trimmingTimestamp = null;
          updateData.isDone = false;
          updateData.productionType = 'Pending';
          updateData.sewerType = 'Pending';
          updateData.doneProductionTimestamp = null;
        }
        await updateDoc(leadDocRef, updateData);
    } catch (e: any) {
        console.error(`Error unchecking ${field}:`, e);
        toast({ variant: "destructive", title: "Update Failed", description: e.message || "Could not update the status." });
    } finally {
        setUncheckConfirmation(null);
    }
  }, [uncheckConfirmation, firestore, toast]);

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

  const calculateProductionDeadline = useCallback((lead: Lead) => {
    const deliveryDate = lead.deliveryDate ? new Date(lead.deliveryDate) : addDays(new Date(lead.submissionDateTime), lead.priorityType === 'Rush' ? 7 : 22);
    
    let statusText: React.ReactNode;
    let remainingDays: number;
    let isOverdue = false;
    let isUrgent = false;

    if (lead.isDone && lead.doneProductionTimestamp) {
        const doneDate = new Date(lead.doneProductionTimestamp);
        remainingDays = differenceInDays(deliveryDate, doneDate);
         if (remainingDays < 0) {
            statusText = <><span className="font-bold">{Math.abs(remainingDays)} day(s)</span> overdue</>;
            isOverdue = true;
        } else {
             statusText = <><span className="font-bold">{remainingDays} day(s)</span> remaining</>;
        }
    } else {
        remainingDays = differenceInDays(new Date(), deliveryDate);
        if (remainingDays > 0) {
            isOverdue = true;
            statusText = <><span className="font-bold">{remainingDays} day(s)</span> overdue</>;
        } else if (remainingDays >= -3) {
            isUrgent = true;
            statusText = <><span className="font-bold">{Math.abs(remainingDays)} day(s)</span> remaining</>;
        } else {
            statusText = <><span className="font-bold">{Math.abs(remainingDays)} day(s)</span> remaining</>;
        }
    }
    return { text: statusText, isOverdue, isUrgent, remainingDays };
  }, []);

  const getOverdueStatusText = useCallback((lead: Lead): string => {
    const deliveryDate = lead.deliveryDate ? new Date(lead.deliveryDate) : addDays(new Date(lead.submissionDateTime), lead.priorityType === 'Rush' ? 7 : 22);
    
    let statusText: string;
    let remainingDays: number;

    if (lead.isDone && lead.doneProductionTimestamp) {
        const doneDate = new Date(lead.doneProductionTimestamp);
        remainingDays = differenceInDays(deliveryDate, doneDate);
         if (remainingDays < 0) {
            statusText = `${Math.abs(remainingDays)} day(s) overdue`;
        } else {
             statusText = `${remainingDays} day(s) remaining`;
        }
    } else {
        remainingDays = differenceInDays(new Date(), deliveryDate);
        if (remainingDays > 0) {
            statusText = `${remainingDays} day(s) overdue`;
        } else {
            statusText = `${Math.abs(remainingDays)} day(s) remaining`;
        }
    }
    return statusText;
  }, []);

  const handleEndorseToLogistics = useCallback(async (leadId: string) => {
    if (!firestore || !leads) return;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const leadDocRef = doc(firestore, 'leads', leadId);
    try {
        await updateDoc(leadDocRef, { isEndorsedToLogistics: true, endorsedToLogisticsTimestamp: new Date().toISOString() });
        
        const overdueStatusText = getOverdueStatusText(lead);

        const notification = {
            id: `progress-${lead.id}-${new Date().toISOString()}`,
            type: 'progress',
            leadId: lead.id,
            joNumber: formatJoNumber(lead.joNumber),
            customerName: toTitleCase(lead.customerName),
            companyName: lead.companyName,
            contactNumber: getContactDisplay(lead),
            message: `Order endorsed to Logistics.`,
            overdueStatus: overdueStatusText,
            isRead: false,
            timestamp: new Date().toISOString(),
            isDisapproved: false
        };
        const existingNotifications = JSON.parse(localStorage.getItem('progress-notifications') || '[]') as any[];
        localStorage.setItem('progress-notifications', JSON.stringify([...existingNotifications, notification]));
        window.dispatchEvent(new StorageEvent('storage', { key: 'progress-notifications' }));
        
        toast({
            title: "Endorsed to Logistics",
            description: "The order has been sent to the logistics team.",
        });
    } catch (e: any) {
      console.error("Error endorsing to logistics:", e);
      toast({
        variant: "destructive",
        title: "Endorsement Failed",
        description: e.message || "Could not endorse the order.",
      });
    }
  }, [firestore, toast, leads, getContactDisplay, getOverdueStatusText, formatJoNumber]);

  const processedLeads = useMemo(() => {
    if (!leads) return [];
  
    const customerOrderStats: { [key: string]: { orders: Lead[], totalCustomerQuantity: number } } = {};
  
    leads.forEach(lead => {
      const name = lead.customerName.toLowerCase();
      if (!customerOrderStats[name]) {
        customerOrderStats[name] = { orders: [], totalCustomerQuantity: 0 };
      }
      customerOrderStats[name].orders.push(lead);
      const orderQuantity = lead.orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
      customerOrderStats[name].totalCustomerQuantity += orderQuantity;
    });
  
    const enrichedLeads: EnrichedLead[] = [];
  
    Object.values(customerOrderStats).forEach(({ orders, totalCustomerQuantity }) => {
      orders.sort((a, b) => new Date(a.submissionDateTime).getTime() - new Date(b.submissionDateTime).getTime());
      orders.forEach((lead, index) => {
        enrichedLeads.push({
          ...lead,
          orderNumber: index + 1,
          totalCustomerQuantity,
        });
      });
    });
  
    return enrichedLeads;
  }, [leads]);
  
  const handleJoReceivedChange = useCallback((leadId: string, checked: boolean) => {
    const lead = leads?.find((l) => l.id === leadId);
    if (!lead) return;
    
    if (!checked) {
        setUncheckConfirmation({ leadId, field: 'isJoHardcopyReceived' });
    } else {
        setJoReceivedConfirmation(leadId);
    }
  }, [leads]);
  
  const productionQueue = useMemo(() => {
    if (!processedLeads) return [];
    
    let relevantLeads;
    if (filterType === 'COMPLETED') {
      relevantLeads = processedLeads.filter(lead => lead.isEndorsedToLogistics);
    } else {
      relevantLeads = processedLeads.filter(lead => lead.isSentToProduction && !lead.isEndorsedToLogistics && lead.orderType !== 'Stock (Jacket Only)');
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

  const toggleLeadDetails = useCallback((leadId: string) => {
    setOpenLeadId(openLeadId === leadId ? null : leadId);
  }, [openLeadId]);
  
  const handleReopenProduction = async () => {
    if (!leadToReopen || !firestore) return;
    try {
        const leadDocRef = doc(firestore, 'leads', leadToReopen.id);
        await updateDoc(leadDocRef, {
            isEndorsedToLogistics: false,
            endorsedToLogisticsTimestamp: null,
            isDone: false,
            doneProductionTimestamp: null,
            isRecheckingQuality: true,
        });
        toast({
            title: 'Production Reopened',
            description: `The order for J.O. ${formatJoNumber(leadToReopen.joNumber)} has been moved back to the ongoing production queue.`,
        });
    } catch (e: any) {
        console.error("Error reopening production:", e);
        toast({
            variant: "destructive",
            title: "Action Failed",
            description: e.message || "Could not reopen production.",
        });
    } finally {
        setLeadToReopen(null);
    }
  };

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
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col border-none">
       <AlertDialog open={!!uncheckConfirmation} onOpenChange={(open) => !open && setUncheckConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Unchecking this box will mark the task as not done. This will also uncheck all subsequent steps. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUncheck}>Confirm</AlertDialogAction>
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
      <AlertDialog open={!!leadToReopen} onOpenChange={(open) => !open && setLeadToReopen(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Reopen Production?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will move the order for J.O. {formatJoNumber(leadToReopen?.joNumber)} back to the ongoing production queue. Are you sure?
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReopenProduction}>Reopen</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-black">{filterType === 'COMPLETED' ? 'Completed Production' : 'Production Queue'}</CardTitle>
            <CardDescription className="text-gray-600">
              {filterType === 'COMPLETED' ? 'Job orders that have finished production.' : 'Job orders ready for production.'}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4">
              <div className="w-full max-w-lg">
                <Input
                  placeholder="Search customer, company and contact number"
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
            <div className="w-full text-right">
              {filterType === 'COMPLETED' ? (
                <Link href="/production/production-queue" className="text-sm text-primary hover:underline">
                  View Production Queue
                </Link>
              ) : (
                <Link href="/production/completed-production" className="text-sm text-primary hover:underline">
                  View Completed Production
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
           <div className="border rounded-md">
            <Table>
                <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs text-center">Customer</TableHead>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs text-center">J.O. No.</TableHead>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs text-center">Priority</TableHead>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs text-center">Overdue Status</TableHead>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs text-center">Production Documents</TableHead>
                     <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs text-center w-[150px]">Received Printed J.O.?</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Start Production</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Production Category</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Done Embroidery</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Sewing Category</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Done Sewing</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Trimming/Cleaning</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Production Status</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Endorsement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {productionQueue && productionQueue.length > 0 ? (
                  productionQueue.map((lead) => (
                    <ProductionQueueTableRowGroup
                      key={lead.id}
                      lead={lead}
                      isRepeat={lead.orderNumber > 1}
                      status={getProductionStatusLabel(lead)}
                      deadlineInfo={calculateProductionDeadline(lead)}
                      isCompleted={filterType === 'COMPLETED'}
                      getContactDisplay={getContactDisplay}
                      handleJoReceivedChange={handleJoReceivedChange}
                      handleCheckboxChange={handleCheckboxChange}
                      handleStatusChange={handleStatusChange}
                      handleEndorseToLogistics={handleEndorseToLogistics}
                      setLeadToReopen={setLeadToReopen}
                      toggleLeadDetails={toggleLeadDetails}
                      openLeadId={openLeadId}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center text-muted-foreground">
                      No current orders endorsed to production yet.
                    </TableCell>
                  </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
      </CardContent>
    </Card>
  );
}
