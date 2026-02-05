

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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Check, ChevronDown, RefreshCcw, AlertTriangle, Send, FileText, Download, X, Eye } from 'lucide-react';
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
  adjustedDeliveryDate?: string;
  finalApprovalTimestamp?: string;
  layouts?: Layout[];
  forceNewCustomer?: boolean;
}

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

type ProductionQueueTableProps = {
  isReadOnly: boolean;
  filterType?: 'ONGOING' | 'COMPLETED';
};

const ProductionQueueTableMemo = React.memo(function ProductionQueueTable({ isReadOnly, filterType = 'ONGOING' }: ProductionQueueTableProps) {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const { toast } = useToast();
  const [uncheckConfirmation, setUncheckConfirmation] = useState<{ leadId: string; field: CheckboxField; } | null>(null);
  const [leadToEndorse, setLeadToEndorse] = useState<Lead | null>(null);
  const [leadToReopen, setLeadToReopen] = useState<Lead | null>(null);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const isCompleted = filterType === 'COMPLETED';

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);
  const operationalCasesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'operationalCases')) : null, [firestore]);
  const { data: operationalCases } = useCollection<OperationalCase>(operationalCasesQuery);
  
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
  
  const handleReopenCase = async (caseItem: Lead) => {
    if (!firestore) return;
    try {
      const caseDocRef = doc(firestore, 'leads', caseItem.id);
      
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

  const processedLeads = useMemo(() => {
    if (!leads) return [];
  
    const customerOrderGroups: { [key: string]: Lead[] } = {};
  
    leads.forEach(lead => {
        const name = lead.customerName.toLowerCase();
        if (!customerOrderGroups[name]) {
            customerOrderGroups[name] = [];
        }
        customerOrderGroups[name].push(lead);
    });

    const enrichedLeads: EnrichedLead[] = [];
  
    Object.values(customerOrderGroups).forEach((orders) => {
        const sortedOrders = [...orders].sort((a, b) => new Date(a.submissionDateTime).getTime() - new Date(b.submissionDateTime).getTime());
        
        const totalCustomerQuantity = orders.reduce((sum, o) => sum + o.orders.reduce((orderSum, item) => orderSum + item.quantity, 0), 0);
        
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
              <div className="w-full max-w-lg">
                <Input
                  placeholder="Search customer, company or contact..."
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
                      isCompleted={isCompleted}
                      isRepeat={!lead.forceNewCustomer && lead.orderType !== 'Item Sample' && lead.orderNumber > 0}
                      isReadOnly={isReadOnly}
                      getProductionStatus={getProductionStatusLabel}
                      formatJoNumber={formatJoNumber}
                      getContactDisplay={getContactDisplay}
                      handleCheckboxChange={handleCheckboxChange}
                      setLeadToEndorse={setLeadToEndorse}
                      handleReopenCase={handleReopenCase}
                      setOpenLeadId={setOpenLeadId}
                      openLeadId={openLeadId}
                      calculateProductionDeadline={calculateProductionDeadline}
                      activeCasesByJo={activeCasesByJo}
                      handleStatusChange={handleStatusChange}
                    />
                  ))
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
    </>
  );
});
ProductionQueueTableMemo.displayName = 'ProductionQueueTableMemo';

export { ProductionQueueTableMemo as ProductionQueueTable };
