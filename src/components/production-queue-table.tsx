

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
import { addDays, differenceInDays, format } from 'date-fns';
import { formatDateTime, cn, toTitleCase } from '@/lib/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { ChevronDown, Send, FileText, X, Download, Check, AlertTriangle } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import Image from 'next/image';
import Link from 'next/link';

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
}

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

type CheckboxField = 'isCutting' | 'isEmbroideryDone' | 'isSewing' | 'isJoHardcopyReceived';

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
    if (lead.isSewing) return { text: "Done Production", variant: "success" };
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
    const jobOrderUrl = `/job-order/${lead.id}/print`;
    window.open(jobOrderUrl, '_blank', 'height=800,width=1200,scrollbars=yes');
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

const ProductionQueueTableRow = React.memo(({
    lead,
    deadlineInfo,
    productionStatus,
    openLeadId,
    toggleLeadDetails,
    getContactDisplay,
    handleJoReceivedChange,
    handleStatusChange,
    handleCheckboxChange,
    handleEndorseToLogistics,
    isReadOnly,
    filterType,
}: {
    lead: EnrichedLead;
    deadlineInfo: { text: React.ReactNode; isOverdue: boolean; isUrgent: boolean; remainingDays: number; };
    productionStatus: { text: string; variant: "success" | "warning" | "secondary" | "default" | "destructive"; };
    openLeadId: string | null;
    toggleLeadDetails: (id: string) => void;
    getContactDisplay: (lead: Lead) => string | null;
    handleJoReceivedChange: (id: string, checked: boolean) => void;
    handleStatusChange: (id: string, field: "productionType" | "sewerType", value: string) => void;
    handleCheckboxChange: (id: string, field: CheckboxField, checked: boolean) => void;
    handleEndorseToLogistics: (id: string) => void;
    isReadOnly: boolean;
    filterType?: 'ONGOING' | 'COMPLETED';
}) => {
    const isRepeat = lead.orderNumber > 1;
    const specialOrderTypes = ["MTO", "Stock Design", "Stock (Jacket Only)"];
    const isCompleted = filterType === 'COMPLETED';

    return (
        <>
            <TableRow>
                <TableCell className="font-medium text-xs align-middle py-3 text-black text-center">
                    <Collapsible>
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-center cursor-pointer">
                                <span>{toTitleCase(lead.customerName)}</span>
                                <ChevronDown className="h-4 w-4 ml-1 transition-transform [&[data-state=open]]:rotate-180" />
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 text-gray-500 space-y-1">
                            {lead.companyName && lead.companyName !== '-' && <div><strong>Company:</strong> {toTitleCase(lead.companyName)}</div>}
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
                <TableCell className="text-xs align-middle py-3 text-black text-center">{formatJoNumber(lead.joNumber)}</TableCell>
                <TableCell className="align-middle py-3 text-center">
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
                    "text-center text-xs align-middle py-3 font-medium",
                    deadlineInfo.isOverdue && "text-red-500",
                    deadlineInfo.isUrgent && "text-amber-600",
                    !deadlineInfo.isOverdue && !deadlineInfo.isUrgent && "text-green-600"
                )}>
                    {deadlineInfo.text}
                </TableCell>
                <TableCell className="text-xs align-middle py-3 text-black text-center">
                    <Button variant="ghost" className="h-auto py-1 px-2 flex items-center gap-1 text-black hover:bg-gray-100 hover:text-black" onClick={() => toggleLeadDetails(lead.id)}>
                    <FileText className="h-4 w-4" />
                    <span className="whitespace-normal break-words leading-tight">View Documents</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", openLeadId === lead.id && "rotate-180")} />
                    </Button>
                </TableCell>
                <TableCell className="text-center align-middle py-2">
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Checkbox
                        checked={lead.isJoHardcopyReceived || false}
                        onCheckedChange={(checked) => handleJoReceivedChange(lead.id, !!checked)}
                        disabled={!lead.isSentToProduction || isReadOnly || isCompleted}
                        className={isReadOnly || isCompleted ? 'disabled:opacity-100' : ''}
                        />
                        {lead.joHardcopyReceivedTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.joHardcopyReceivedTimestamp).dateTimeShort}</div>}
                    </div>
                </TableCell>
                <TableCell className="text-center align-middle py-3">
                    <div className="flex flex-col items-center justify-center gap-1">
                    <Checkbox
                        checked={lead.isCutting || false}
                        onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isCutting', !!checked)}
                        disabled={!lead.isJoHardcopyReceived || isReadOnly || isCompleted}
                        className={isReadOnly || isCompleted ? 'disabled:opacity-100' : ''}
                    />
                    {lead.cuttingTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.cuttingTimestamp).dateTimeShort}</div>}
                    </div>
                </TableCell>
                <TableCell className="text-center align-middle py-3">
                    <Select
                    value={lead.productionType || 'Pending'}
                    onValueChange={(value) => handleStatusChange(lead.id, 'productionType', value)}
                    disabled={!lead.isCutting || lead.isEmbroideryDone || isReadOnly || isCompleted}
                    >
                    <SelectTrigger className={cn("w-auto min-w-[110px] text-xs h-8 mx-auto font-semibold disabled:opacity-100", getStatusColor(lead.productionType), isReadOnly || isCompleted ? "disabled:opacity-100" : "")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {productionOptions.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </TableCell>
                <TableCell className="text-center align-middle py-3">
                    <div className="flex flex-col items-center justify-center gap-1">
                    <Checkbox
                        checked={lead.isEmbroideryDone || false}
                        onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isEmbroideryDone', !!checked)}
                        disabled={!lead.isCutting || !lead.productionType || lead.productionType === 'Pending' || isReadOnly || isCompleted}
                        className={isReadOnly || isCompleted ? 'disabled:opacity-100' : ''}
                    />
                    {lead.embroideryDoneTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.embroideryDoneTimestamp).dateTimeShort}</div>}
                    </div>
                </TableCell>
                <TableCell className="text-center align-middle py-3">
                    <Select
                    value={lead.sewerType || 'Pending'}
                    onValueChange={(value) => handleStatusChange(lead.id, 'sewerType', value)}
                    disabled={!lead.isEmbroideryDone || lead.isSewing || isReadOnly || isCompleted}
                    >
                    <SelectTrigger className={cn("w-auto min-w-[110px] text-xs h-8 mx-auto font-semibold disabled:opacity-100", getStatusColor(lead.sewerType), isReadOnly || isCompleted ? "disabled:opacity-100" : "")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {productionOptions.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </TableCell>
                <TableCell className="text-center align-middle py-3">
                    <div className="flex flex-col items-center justify-center gap-1">
                    <Checkbox
                        checked={lead.isSewing || false}
                        onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isSewing', !!checked)}
                        disabled={!lead.isEmbroideryDone || !lead.sewerType || lead.sewerType === 'Pending' || isReadOnly || isCompleted}
                        className={isReadOnly || isCompleted ? 'disabled:opacity-100' : ''}
                    />
                    {lead.sewingTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.sewingTimestamp).dateTimeShort}</div>}
                    </div>
                </TableCell>
                <TableCell className="text-center align-middle py-3">
                    <Badge variant={productionStatus.variant}>{productionStatus.text}</Badge>
                </TableCell>
                <TableCell className="text-center align-middle py-3">
                    <div className="flex items-center justify-center gap-2">
                        {lead.isRecheckingQuality && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Quality Error</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {filterType === 'COMPLETED' ? (
                            lead.isEndorsedToLogistics && (
                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center text-sm text-green-600 font-semibold">
                                        <Check className="mr-2 h-4 w-4" /> Endorsed
                                    </div>
                                    {lead.endorsedToLogisticsTimestamp && (
                                        <div className="text-xs text-gray-500">
                                            {formatDateTime(lead.endorsedToLogisticsTimestamp).dateTimeShort}
                                        </div>
                                    )}
                                </div>
                            )
                        ) : (
                            <Button
                                size="sm"
                                onClick={() => handleEndorseToLogistics(lead.id)}
                                disabled={!lead.isDone || isReadOnly}
                                className={cn(
                                    "h-auto px-3 py-3 text-white font-bold text-xs bg-teal-600 disabled:bg-gray-400 transition-all duration-300 ease-in-out transform hover:scale-105",
                                    isReadOnly && "disabled:opacity-100"
                                )}
                            >
                                <Send className="h-3.5 w-3.5" />
                                <span className='whitespace-normal break-words'>Send to Logistics</span>
                            </Button>
                        )}
                    </div>
                </TableCell>
            </TableRow>
            {openLeadId === lead.id && (
                <TableRow>
                    <TableCell colSpan={13} className="p-0">
                        <ProductionDocuments lead={lead} />
                    </TableCell>
                </TableRow>
            )}
        </>
    );
});
ProductionQueueTableRow.displayName = 'ProductionQueueTableRow';

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

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);
  
  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;
    if (mobile && landline) return `${mobile} / ${landline}`;
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
    
    if (field === 'isJoHardcopyReceived') {
        setJoReceivedConfirmation(leadId);
        return;
    }
    
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', leadId);
    
    const now = new Date().toISOString();
    const timestampField = `${field.replace('is', '').charAt(0).toLowerCase() + field.slice(3)}Timestamp`;
    const updateData: {[key:string]: any} = { [field]: value, [timestampField]: now };

    if (field === 'isSewing' && value) {
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

        if (field === 'isSewing') {
          updateData.isDone = false;
          updateData.doneProductionTimestamp = null;
        } else if (field === 'isEmbroideryDone') {
            updateData.isSewing = false;
            updateData.sewingTimestamp = null;
            updateData.isDone = false;
            updateData.sewerType = 'Pending';
            updateData.doneProductionTimestamp = null;
        } else if (field === 'isCutting') {
          updateData.isEmbroideryDone = false;
          updateData.embroideryDoneTimestamp = null;
          updateData.isSewing = false;
          updateData.sewingTimestamp = null;
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
  
  const handleEndorseToLogistics = useCallback(async (leadId: string) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', leadId);
    try {
        await updateDoc(leadDocRef, { isEndorsedToLogistics: true, endorsedToLogisticsTimestamp: new Date().toISOString(), isRecheckingQuality: false });
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
  }, [firestore, toast]);
  
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
        remainingDays = differenceInDays(deliveryDate, new Date());
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

    return { text: statusText, isOverdue, isUrgent, remainingDays };
}, []);

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
          totalCustomerQuantity: totalCustomerQuantity,
        });
      });
    });
  
    return enrichedLeads;
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
              Unchecking this box will mark the task as not done. Are you sure you want to proceed?
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
                <TableHeader className="bg-neutral-800">
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
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Production Status</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Endorsement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {productionQueue && productionQueue.length > 0 ? (
                    productionQueue.map((lead) => (
                        <ProductionQueueTableRow
                            key={lead.id}
                            lead={lead}
                            deadlineInfo={calculateProductionDeadline(lead)}
                            productionStatus={getProductionStatusLabel(lead)}
                            openLeadId={openLeadId}
                            toggleLeadDetails={toggleLeadDetails}
                            getContactDisplay={getContactDisplay}
                            handleJoReceivedChange={handleJoReceivedChange}
                            handleStatusChange={handleStatusChange}
                            handleCheckboxChange={handleCheckboxChange}
                            handleEndorseToLogistics={handleEndorseToLogistics}
                            isReadOnly={isReadOnly}
                            filterType={filterType}
                        />
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center text-muted-foreground">
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

  
