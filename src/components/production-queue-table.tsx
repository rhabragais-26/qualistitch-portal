
'use client';

import { doc, updateDoc, collection, query, getDocs, where } from 'firebase/firestore';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Check, ChevronDown, RefreshCcw, AlertTriangle, Send, FileText, Download, X, Eye, ChevronUp } from 'lucide-react';
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

type DesignDetails = {
  left?: boolean;
  right?: boolean;
  backLogo?: boolean;
  backText?: boolean;
};

type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
  remarks?: string;
  design?: DesignDetails;
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
  layoutImageUploadTime?: string | null;
  layoutImageUploadedBy?: string | null;
  refLogoLeftImage?: string | null;
  refLogoLeftImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  refLogoLeftImageUploadTime?: string | null;
  refLogoLeftImageUploadedBy?: string | null;
  refLogoRightImage?: string | null;
  refLogoRightImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  refLogoRightImageUploadTime?: string | null;
  refLogoRightImageUploadedBy?: string | null;
  refBackLogoImage?: string | null;
  refBackLogoImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  refBackLogoImageUploadTime?: string | null;
  refBackLogoImageUploadedBy?: string | null;
  refBackDesignImage?: string | null;
  refBackDesignImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  refBackDesignImageUploadTime?: string | null;
  refBackDesignImageUploadedBy?: string | null;
  dstLogoLeft?: string;
  dstLogoRight?: string;
  dstBackLogo?: string;
  dstBackText?: string;
  namedOrders?: NamedOrder[];
  logoLeftImage?: string | null;
  logoLeftImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  logoLeftImageUploadTime?: string | null;
  logoLeftImageUploadedBy?: string | null;
  logoRightImage?: string | null;
  logoRightImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  logoRightImageUploadTime?: string | null;
  logoRightImageUploadedBy?: string | null;
  backLogoImage?: string | null;
  backLogoImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  backLogoImageUploadTime?: string | null;
  backLogoImageUploadedBy?: string | null;
  backDesignImage?: string | null;
  backDesignImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  backDesignImageUploadTime?: string | null;
  backDesignImageUploadedBy?: string | null;
  testLogoLeftImage?: string | null;
  testLogoLeftImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  testLogoLeftImageUploadTime?: string | null;
  testLogoLeftImageUploadedBy?: string | null;
  testLogoRightImage?: string | null;
  testLogoRightImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  testLogoRightImageUploadTime?: string | null;
  testLogoRightImageUploadedBy?: string | null;
  testBackLogoImage?: string | null;
  testBackLogoImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  testBackLogoImageUploadTime?: string | null;
  testBackLogoImageUploadedBy?: string | null;
  testBackDesignImage?: string | null;
  testBackDesignImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  testBackDesignImageUploadTime?: string | null;
  testBackDesignImageUploadedBy?: string | null;
  finalLogoEmb?: (FileObject | null)[];
  finalLogoEmbUploadTimes?: (string | null)[];
  finalLogoEmbUploadedBy?: (string | null)[];
  finalBackDesignEmb?: (FileObject | null)[];
  finalBackDesignEmbUploadTimes?: (string | null)[];
  finalBackDesignEmbUploadedBy?: (string | null)[];
  finalLogoDst?: (FileObject | null)[];
  finalLogoDstUploadTimes?: (string | null)[];
  finalLogoDstUploadedBy?: (string | null)[];
  finalBackDesignDst?: (FileObject | null)[];
  finalBackDesignDstUploadTimes?: (string | null)[];
  finalBackDesignDstUploadedBy?: (string | null)[];
  finalNamesDst?: (FileObject | null)[];
  finalNamesDstUploadTimes?: (string | null)[];
  finalNamesDstUploadedBy?: (string | null)[];
  sequenceLogo?: (FileObject | null)[];
  sequenceLogoUploadTimes?: (string | null)[];
  sequenceLogoUploadedBy?: (string | null)[];
  sequenceBackDesign?: (FileObject | null)[];
  sequenceBackDesignUploadTimes?: (string | null)[];
  sequenceBackDesignUploadedBy?: (string | null)[];
  finalProgrammedLogo?: (FileObject | null)[];
  finalProgrammedLogoUploadTimes?: (string | null)[];
  finalProgrammedLogoUploadedBy?: (string | null)[];
  finalProgrammedBackDesign?: (FileObject | null)[];
  finalProgrammedBackDesignUploadTimes?: (string | null)[];
  finalProgrammedBackDesignUploadedBy?: (string | null)[];
};

type ProductionType = "Pending" | "In-house" | "Outsource 1" | "Outsource 2" | "Outsource 3";

type Lead = {
  id: string;
  customerName: string;
  recipientName?: string;
  companyName?: string;
  contactNumber: string;
  contactNumber2?: string;
  landlineNumber?: string;
  location: string;
  salesRepresentative: string;
  scesFullName?: string;
  priorityType: 'Rush' | 'Regular';
  paymentType: string;
  orderType: string;
  orders: Order[];
  submissionDateTime: string;
  deliveryDate?: string;
  courier: string;
  joNumber?: number;
  layouts?: Layout[];
  publiclyPrintable?: boolean;
  lastModifiedBy?: string;
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
  adjustedDeliveryDate?: string;
  finalApprovalTimestamp?: string;
  isSentToProduction?: boolean;
  forceNewCustomer?: boolean;
};

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

type OperationalCase = {
  id: string;
  joNumber: string;
  caseType: string;
  isArchived?: boolean;
  isDeleted?: boolean;
};

type CheckboxField = 'isCutting' | 'isEmbroideryDone' | 'isSewing' | 'isTrimming';

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

const hasLayoutContent = (layout: Layout) => {
    return layout.layoutImage || 
           (layout as any).dstLogoLeft || 
           (layout as any).dstLogoRight || 
           (layout as any).dstBackLogo || 
           (layout as any).dstBackText || 
           (layout.namedOrders && layout.namedOrders.length > 0 && layout.namedOrders.some(o => o.name || o.backText));
};

const ImageDisplayCard = React.memo(({ title, images, onImageClick }: { title: string; images: { src: string; label: string; timestamp?: string | null; uploadedBy?: string | null }[], onImageClick: (src: string) => void }) => {
    if (!images || images.length === 0) return null;

    return (
        <Card className="bg-white w-fit">
            <CardHeader className="p-2"><CardTitle className="text-sm text-center">{title}</CardTitle></CardHeader>
            <CardContent className="flex gap-2 text-xs p-2 flex-wrap justify-center">
                {images.map((img, index) => (
                    img.src && (
                        <div key={index} className="flex flex-col items-center text-center w-24">
                            <p className="font-semibold text-gray-500 mb-1 text-xs truncate w-full" title={img.label}>{img.label}</p>
                            <div className="relative w-20 h-20 border rounded-md cursor-pointer" onClick={() => onImageClick(img.src)}>
                                <Image src={img.src} alt={img.label} layout="fill" objectFit="contain" />
                            </div>
                            {img.timestamp && <p className='text-gray-500 text-[10px] mt-1'>{formatDateTime(img.timestamp).dateTimeShort}</p>}
                            {img.uploadedBy && <p className='text-gray-500 text-[10px] font-bold'>by {img.uploadedBy}</p>}
                        </div>
                    )
                ))}
            </CardContent>
        </Card>
    );
});
ImageDisplayCard.displayName = 'ImageDisplayCard';


const ProductionDocuments = React.memo(function ProductionDocuments({ lead }: { lead: Lead }) {
  const [imageInView, setImageInView] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDownload = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('File download failed:', err);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description:
          'Could not download the file. Please check your network connection and file permissions.',
      });
    }
  };

  const finalDstFiles = useMemo(() => {
    if (!lead.layouts) return [];
    return lead.layouts.flatMap((layout, layoutIndex) => {
        const layoutLabel = lead.layouts!.length > 1 ? ` (L${layoutIndex + 1})` : '';
        const files: { name: string; url: string; type: string }[] = [];

        (layout.finalLogoDst || []).forEach(f => {
            if (f) files.push({ ...f, type: `Logo${layoutLabel}` });
        });
        (layout.finalBackDesignDst || []).forEach(f => {
            if (f) files.push({ ...f, type: `Back Design${layoutLabel}` });
        });
        (layout.finalNamesDst || []).forEach(f => {
            if (f) files.push({ ...f, type: `Name${layoutLabel}` });
        });
        return files;
    });
  }, [lead.layouts]);

  const layoutImages = useMemo(() => {
    if (!lead.layouts) return [];
    return lead.layouts.map((layout, i) => ({
      src: layout.layoutImage!,
      label: `Layout ${i + 1}`,
      timestamp: layout.layoutImageUploadTime,
      uploadedBy: layout.layoutImageUploadedBy,
    })).filter(img => img.src);
  }, [lead.layouts]);

  const sequenceImages = useMemo(() => {
    if (!lead.layouts) return [];
    return lead.layouts.flatMap((layout, layoutIndex) => {
      const layoutLabel = lead.layouts!.length > 1 ? ` L${layoutIndex + 1}` : '';
      const images: { src: string; label: string; timestamp?: string | null; uploadedBy?: string | null }[] = [];
      (layout.sequenceLogo || []).forEach((f, i) => {
        if (f) images.push({ src: f.url, label: `Sequence Logo ${i + 1}${layoutLabel}`, timestamp: layout.sequenceLogoUploadTimes?.[i], uploadedBy: layout.sequenceLogoUploadedBy?.[i] });
      });
      (layout.sequenceBackDesign || []).forEach((f, i) => {
        if (f) images.push({ src: f.url, label: `Sequence Back ${i + 1}${layoutLabel}`, timestamp: layout.sequenceBackDesignUploadTimes?.[i], uploadedBy: layout.sequenceBackDesignUploadedBy?.[i] });
      });
      return images;
    });
  }, [lead.layouts]);
  
  const finalProgramImages = useMemo(() => {
    if (!lead.layouts) return [];
    return lead.layouts.flatMap((layout, layoutIndex) => {
      const layoutLabel = lead.layouts!.length > 1 ? ` L${layoutIndex + 1}` : '';
      const images: { src: string; label: string; timestamp?: string | null; uploadedBy?: string | null }[] = [];
      (layout.finalProgrammedLogo || []).forEach((f, i) => {
        if (f) images.push({ src: f.url, label: `Final Logo ${i + 1}${layoutLabel}`, timestamp: layout.finalProgrammedLogoUploadTimes?.[i], uploadedBy: layout.finalProgrammedLogoUploadedBy?.[i] });
      });
      (layout.finalProgrammedBackDesign || []).forEach((f, i) => {
        if (f) images.push({ src: f.url, label: `Final Back ${i + 1}${layoutLabel}`, timestamp: layout.finalProgrammedBackDesignUploadTimes?.[i], uploadedBy: layout.finalProgrammedBackDesignUploadedBy?.[i] });
      });
      return images;
    });
  }, [lead.layouts]);

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
       <div className="p-4 bg-gray-100 border-t-2 border-gray-300 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
            <h3 className="font-bold text-lg text-primary">Final Program Files (DST)</h3>
            <div className="space-y-2">
                {finalDstFiles.length > 0 ? (
                    finalDstFiles.map((file, index) => (
                        file && file.url && file.name && (
                            <div key={index} className="flex items-center justify-between p-2 bg-white rounded-md border text-sm">
                                <span className="truncate pr-2"><strong>{file.type}:</strong> {file.name}</span>
                                <Button onClick={() => handleDownload(file.url, file.name)} variant="ghost" size="icon" className="h-7 w-7 text-primary">
                                    <Download className="h-4 w-4" />
                                </Button>
                            </div>
                        )
                    ))
                ) : <p className="text-xs text-muted-foreground">No DST files available.</p>}
            </div>
        </div>

        <div className="space-y-4">
          <ImageDisplayCard title="Layouts" images={layoutImages} onImageClick={setImageInView} />
          <ImageDisplayCard title="Final Program Images" images={finalProgramImages} onImageClick={setImageInView} />
        </div>
        
        <div className="space-y-4">
          <ImageDisplayCard title="Sequence" images={sequenceImages} onImageClick={setImageInView} />
        </div>
      </div>
    </>
  );
});
ProductionDocuments.displayName = 'ProductionDocuments';

type ProductionQueueTableProps = {
  isReadOnly: boolean;
  filterType?: 'ONGOING' | 'COMPLETED';
};

type UserProfileInfo = {
    uid: string;
    firstName: string;
    lastName: string;
    nickname: string;
  };

const ProductionQueueTableRowGroup = React.memo(function ProductionQueueTableRowGroup({
    lead,
    isRepeat,
    getContactDisplay,
    toggleCustomerDetails,
    openCustomerDetails,
    isReadOnly,
    isCompleted,
    activeCasesByJo,
    formatJoNumber,
    handleCheckboxChange,
    setLeadToEndorse,
    handleReopenCase,
    setOpenLeadId,
    openLeadId,
    calculateProductionDeadline,
    handleStatusChange,
    setViewingJoLead,
    filterType
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
    handleCheckboxChange: (leadId: string, field: CheckboxField, checked: boolean) => void;
    setLeadToEndorse: React.Dispatch<React.SetStateAction<Lead | null>>;
    handleReopenCase: (lead: Lead) => void;
    setOpenLeadId: React.Dispatch<React.SetStateAction<string | null>>;
    openLeadId: string | null;
    calculateProductionDeadline: (lead: Lead) => { text: React.ReactNode; isOverdue: boolean; isUrgent: boolean; remainingDays: number; };
    handleStatusChange: (leadId: string, field: "productionType" | "sewerType", value: string) => void;
    setViewingJoLead: React.Dispatch<React.SetStateAction<Lead | null>>;
    filterType?: 'ONGOING' | 'COMPLETED';
}) {
    const deadlineInfo = calculateProductionDeadline(lead);
    const productionStatus = getProductionStatusLabel(lead);
    const isCollapsibleOpen = openLeadId === lead.id;

    return (
        <React.Fragment>
            <TableRow>
                <TableCell className="text-xs align-middle text-center py-2 text-black">
                    <div className="flex items-center justify-center">
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
                <TableCell className="text-xs text-center align-middle">
                    <div className="flex items-center justify-center gap-1">
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
                <TableCell className="align-middle py-3 text-center">
                   <div className='flex flex-col items-center gap-1'>
                    <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                        {lead.priorityType}
                    </Badge>
                    <div className="text-gray-500 text-sm font-bold mt-1">{lead.orderType}</div>
                   </div>
                </TableCell>
                <TableCell className={cn(
                    "text-center text-xs align-middle py-3",
                    (lead.isDone)
                    ? (deadlineInfo.isOverdue ? "text-red-500 font-bold" : "text-green-600 font-medium")
                    : (deadlineInfo.isOverdue ? "text-red-500 font-bold" : (deadlineInfo.isUrgent ? "text-amber-600 font-bold" : ""))
                )}>{deadlineInfo.text}</TableCell>
                <TableCell className="text-center align-middle py-2">
                    <div className="flex items-center justify-center">
                        <Button variant="ghost" size="sm" onClick={() => setOpenLeadId(prev => prev === lead.id ? null : lead.id)} className="h-7 px-2 bg-gray-200 hover:bg-gray-300">
                            View
                            {isCollapsibleOpen ? (
                            <ChevronUp className="h-4 w-4" />
                            ) : (
                            <ChevronDown className="h-4 w-4" />
                            )}
                        </Button>
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
                </TableCell>
                <TableCell className="text-center align-middle py-2">
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Checkbox
                        checked={!!lead.isCutting}
                        onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isCutting', !!checked)}
                        disabled={isReadOnly || isCompleted}
                        className={isReadOnly || isCompleted ? 'disabled:opacity-100' : ''}
                        />
                        {lead.cuttingTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.cuttingTimestamp).dateTimeShort}</div>}
                    </div>
                </TableCell>
                <TableCell className="text-center align-middle py-2">
                    <Select value={lead.productionType || 'Pending'} onValueChange={(value) => handleStatusChange(lead.id, 'productionType', value)} disabled={!lead.isCutting || isReadOnly || isCompleted}>
                        <SelectTrigger className={cn("text-xs h-7", getStatusColor(lead.productionType))}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {productionOptions.map(opt => (
                                <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </TableCell>
                <TableCell className="text-center align-middle py-2">
                     <div className="flex flex-col items-center justify-center gap-1">
                        <Checkbox
                        checked={!!lead.isEmbroideryDone}
                        onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isEmbroideryDone', !!checked)}
                        disabled={!lead.isCutting || isReadOnly || isCompleted}
                        className={isReadOnly || isCompleted ? 'disabled:opacity-100' : ''}
                        />
                        {lead.embroideryDoneTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.embroideryDoneTimestamp).dateTimeShort}</div>}
                    </div>
                </TableCell>
                <TableCell className="text-center align-middle py-2">
                    <Select value={lead.sewerType || 'Pending'} onValueChange={(value) => handleStatusChange(lead.id, 'sewerType', value)} disabled={!lead.isEmbroideryDone || isReadOnly || isCompleted}>
                         <SelectTrigger className={cn("text-xs h-7", getStatusColor(lead.sewerType))}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {productionOptions.map(opt => (
                                <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </TableCell>
                <TableCell className="text-center align-middle py-2">
                     <div className="flex flex-col items-center justify-center gap-1">
                        <Checkbox
                        checked={!!lead.isSewing}
                        onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isSewing', !!checked)}
                        disabled={!lead.isEmbroideryDone || isReadOnly || isCompleted}
                        className={isReadOnly || isCompleted ? 'disabled:opacity-100' : ''}
                        />
                        {lead.sewingTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.sewingTimestamp).dateTimeShort}</div>}
                    </div>
                </TableCell>
                <TableCell className="text-center align-middle py-2">
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Checkbox
                            checked={!!lead.isTrimming}
                            onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isTrimming', !!checked)}
                            disabled={!lead.isSewing || isReadOnly || isCompleted}
                            className={isReadOnly || isCompleted ? 'disabled:opacity-100' : ''}
                        />
                        {lead.trimmingTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.trimmingTimestamp).dateTimeShort}</div>}
                    </div>
                </TableCell>
                <TableCell className="text-xs align-middle text-center py-2">
                    <Badge variant={productionStatus.variant}>{productionStatus.text}</Badge>
                </TableCell>
                <TableCell className="text-center align-middle py-2">
                    {filterType === 'COMPLETED' ? (
                        <div className="flex flex-col items-center gap-1">
                           <Button size="sm" className="h-7 text-xs font-bold bg-green-600 hover:bg-green-700 text-white" disabled>
                                Endorsed
                           </Button>
                           <span className="text-xs text-gray-500">{formatDateTime(lead.endorsedToLogisticsTimestamp!).dateTimeShort}</span>
                           <Button size="sm" variant="outline" className="h-7 text-xs mt-1" onClick={() => handleReopenCase(lead)}>
                                <RefreshCcw className="mr-2 h-4 w-4" /> Reopen
                           </Button>
                        </div>
                    ) : (
                        <Button
                            size="sm"
                            className={cn("h-7 px-3 text-white font-bold", lead.isDone ? 'bg-primary hover:bg-primary/90' : 'bg-gray-400')}
                            disabled={!lead.isDone || isReadOnly || isCompleted}
                            onClick={() => setLeadToEndorse(lead)}
                        >
                            <Send className="mr-2 h-4 w-4" /> Endorse
                        </Button>
                    )}
                </TableCell>
            </TableRow>
            {isCollapsibleOpen && (
                <TableRow>
                    <TableCell colSpan={13}>
                        <ProductionDocuments lead={lead} />
                    </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    );
});
ProductionQueueTableRowGroup.displayName = 'ProductionQueueTableRowGroup';

export function ProductionQueueTable({ isReadOnly, filterType = 'ONGOING' }: ProductionQueueTableProps) {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const { toast } = useToast();
  const [uncheckConfirmation, setUncheckConfirmation] = useState<{ leadId: string; field: CheckboxField; } | null>(null);
  const [leadToEndorse, setLeadToEndorse] = useState<Lead | null>(null);
  const [leadToReopen, setLeadToReopen] = useState<Lead | null>(null);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [viewingJoLead, setViewingJoLead] = useState<Lead | null>(null);
  const [openCustomerDetails, setOpenCustomerDetails] = useState<string | null>(null);

  const isCompleted = filterType === 'COMPLETED';
  
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

  const operationalCasesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'operationalCases')) : null, [firestore]);
  const { data: operationalCases } = useCollection<OperationalCase>(operationalCasesQuery);

  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const { data: usersData } = useCollection<UserProfileInfo>(usersQuery);
  
  const toggleCustomerDetails = useCallback((leadId: string) => {
    setOpenCustomerDetails(prev => prev === leadId ? null : leadId);
  }, []);

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
            variant: "destructive",
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

  const handleEndorseToLogistics = useCallback(async (leadId: string) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', leadId);
    try {
        await updateDoc(leadDocRef, { isEndorsedToLogistics: true, endorsedToLogisticsTimestamp: new Date().toISOString() });
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
    } finally {
        setLeadToEndorse(null);
    }
  }, [firestore, toast]);
  
  const handleReopenCase = async (leadToReopen: Lead) => {
    if (!firestore) return;
    try {
      const caseDocRef = doc(firestore, 'leads', leadToReopen.id);
      
      await updateDoc(caseDocRef, { 
        isEndorsedToLogistics: false,
      });

      toast({
        title: "Case Reopened",
        description: "The case has been moved back to the active list.",
      });
    } catch (e: any) {
      console.error("Error reopening case: ", e);
      toast({
        variant: "destructive",
        title: "Reopen Failed",
        description: e.message || "Could not reopen the case.",
      });
    }
  };


  const calculateProductionDeadline = useCallback((lead: Lead) => {
    const getDeadline = () => {
        if (lead.adjustedDeliveryDate) return new Date(lead.adjustedDeliveryDate);
        if (lead.deliveryDate) return new Date(lead.deliveryDate);
        
        const startDate = lead.finalApprovalTimestamp 
            ? new Date(lead.finalApprovalTimestamp) 
            : new Date(lead.submissionDateTime);
        const deadlineDays = lead.priorityType === 'Rush' ? 7 : 22;
        return addDays(startDate, deadlineDays);
    };
    const deliveryDate = getDeadline();
    
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
        variant: "destructive",
        title: "Update Failed",
        description: e.message || "Could not update the status.",
      });
    }
  }, [firestore, toast]);
  
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

  const productionQueue = useMemo(() => {
    if (!processedLeads) return [];
    
    const orderTypesToExclude = ['Stock (Jacket Only)', 'Stock Design', 'Item Sample'];
    let relevantLeads;
    if (filterType === 'COMPLETED') {
      relevantLeads = processedLeads.filter(lead => 
        lead.isEndorsedToLogistics && 
        !orderTypesToExclude.includes(lead.orderType)
      );
    } else { // ONGOING
      relevantLeads = processedLeads.filter(lead => 
        lead.isSentToProduction && 
        !lead.isEndorsedToLogistics && 
        !orderTypesToExclude.includes(lead.orderType)
      );
    }
    
    return relevantLeads.filter(lead => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ?
        (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
        (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))) ||
        (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))))
        : true;
      
      const joString = formatJoNumberUtil(lead.joNumber);
      const matchesJo = joNumberSearch ? joString.toLowerCase().includes(joNumberSearch.toLowerCase()) : true;
      
      return matchesSearch && matchesJo;
    }).sort((a, b) => {
        const aDeadline = calculateProductionDeadline(a);
        const bDeadline = calculateProductionDeadline(b);
        return aDeadline.remainingDays - bDeadline.remainingDays;
    });

  }, [processedLeads, searchTerm, joNumberSearch, filterType, formatJoNumberUtil, calculateProductionDeadline]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading records: {error.message}</div>;
  }

  return (
    <>
      <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-black">{filterType === 'COMPLETED' ? 'Completed Production' : 'Production Queue'}</CardTitle>
              <CardDescription className="text-gray-600">
                {filterType === 'COMPLETED' ? 'Job orders that have been endorsed to logistics.' : 'Job orders that are being prepared for production.'}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search customer, company or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-100 text-black placeholder:text-gray-500"
                />
                <Input
                  placeholder="Search by J.O. No..."
                  value={joNumberSearch}
                  onChange={(e) => setJoNumberSearch(e.target.value)}
                  className="bg-gray-100 text-black placeholder:text-gray-500"
                />
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
                  productionQueue.map((lead) => {
                   const isRepeat = !lead.forceNewCustomer && lead.orderNumber > 0;
                    return (
                        <ProductionQueueTableRowGroup
                            key={lead.id}
                            lead={lead}
                            isRepeat={isRepeat}
                            getContactDisplay={getContactDisplay}
                            toggleCustomerDetails={toggleCustomerDetails}
                            openCustomerDetails={openCustomerDetails}
                            isReadOnly={isReadOnly}
                            isCompleted={isCompleted}
                            activeCasesByJo={activeCasesByJo}
                            formatJoNumber={formatJoNumberUtil}
                            handleCheckboxChange={handleCheckboxChange}
                            setLeadToEndorse={setLeadToEndorse}
                            handleReopenCase={handleReopenCase}
                            setOpenLeadId={setOpenLeadId}
                            openLeadId={openLeadId}
                            calculateProductionDeadline={calculateProductionDeadline}
                            handleStatusChange={handleStatusChange}
                            setViewingJoLead={setViewingJoLead}
                            filterType={filterType}
                        />
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center text-muted-foreground">
                      No orders in production queue.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
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
      {leadToEndorse && (
          <AlertDialog open={!!leadToEndorse} onOpenChange={() => setLeadToEndorse(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Endorsement</AlertDialogTitle>
                      <AlertDialogDescription>
                          This will endorse the order for J.O. {formatJoNumberUtil(leadToEndorse.joNumber)} to Logistics. Are you sure?
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleEndorseToLogistics(leadToEndorse.id)}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      )}
      {leadToReopen && (
         <AlertDialog open={!!leadToReopen} onOpenChange={() => setLeadToReopen(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Reopen Production?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This action will move the order for J.O. {formatJoNumberUtil(leadToReopen.joNumber)} back to the ongoing production queue.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleReopenCase(leadToReopen)}>Reopen</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      )}
      {viewingJoLead && (
        <Dialog open={!!viewingJoLead} onOpenChange={() => setViewingJoLead(null)}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Job Order: {formatJoNumberUtil(viewingJoLead.joNumber)}</DialogTitle>
                    <DialogDescription>Read-only view of the job order form.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-6">
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
                                                    <td className="border border-black p-2 w-1/2"><strong>DST LOGO LEFT:</strong><p className="mt-1 whitespace-pre-wrap">{(layout as any).dstLogoLeft}</p></td>
                                                    <td className="border border-black p-2 w-1/2"><strong>DST BACK LOGO:</strong><p className="mt-1 whitespace-pre-wrap">{(layout as any).dstBackLogo}</p></td>
                                                </tr>
                                                <tr>
                                                    <td className="border border-black p-2 w-1/2"><strong>DST LOGO RIGHT:</strong><p className="mt-1 whitespace-pre-wrap">{(layout as any).dstLogoRight}</p></td>
                                                    <td className="border border-black p-2 w-1/2"><strong>DST BACK TEXT:</strong><p className="mt-1 whitespace-pre-wrap">{(layout as any).dstBackText}</p></td>
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
                </div>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
});
ProductionQueueTableMemo.displayName = 'ProductionQueueTableMemo';

export { ProductionQueueTableMemo as ProductionQueueTable };
    
    
