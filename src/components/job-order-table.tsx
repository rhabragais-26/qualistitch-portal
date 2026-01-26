

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
import React, { useMemo, useCallback, useState, useRef } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Check, ChevronDown, Upload, Trash2, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose, DialogFooter } from "@/components/ui/dialog"
import Image from 'next/image';
import { Label } from './ui/label';
import { toTitleCase } from '@/lib/utils';

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
  layoutImage?: string | null;
  refLogoLeftImage?: string | null;
  refLogoLeftImageUploadTime?: string | null;
  refLogoRightImage?: string | null;
  refLogoRightImageUploadTime?: string | null;
  refBackLogoImage?: string | null;
  refBackLogoImageUploadTime?: string | null;
  refBackDesignImage?: string | null;
  refBackDesignImageUploadTime?: string | null;
  logoLeftImage?: string | null;
  logoLeftImageUploadTime?: string | null;
  logoRightImage?: string | null;
  logoRightImageUploadTime?: string | null;
  backLogoImage?: string | null;
  backLogoImageUploadTime?: string | null;
  backDesignImage?: string | null;
  backDesignImageUploadTime?: string | null;
};


type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  salesRepresentative: string;
  priorityType: 'Rush' | 'Regular';
  submissionDateTime: string;
  lastModified: string;
  orders: Order[];
  joNumber?: number;
  isJoPrinted?: boolean;
  joPrintedTimestamp?: string;
  courier?: string;
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  isUnderProgramming?: boolean;
  isPreparedForProduction?: boolean;
  isSentToProduction?: boolean;
  isEndorsedToLogistics?: boolean;
  isRecheckingQuality?: boolean;
  isJoHardcopyReceived?: boolean;
  layouts?: Layout[];
  lastModifiedBy?: string;
}

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

// Define the props interface for JobOrderTable
interface JobOrderTableProps {
  isReadOnly: boolean;
}

// Update the component signature to accept the isReadOnly prop
export function JobOrderTable({ isReadOnly }: JobOrderTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [joNumberSearch, setJoNumberSearch] = React.useState('');
  const [csrFilter, setCsrFilter] = React.useState('All');
  const [hoveredLeadId, setHoveredLeadId] = React.useState<string | null>(null);
  const router = useRouter();
  const [confirmingPrint, setConfirmingPrint] = useState<Lead | null>(null);
  const [optimisticChanges, setOptimisticChanges] = useState<Record<string, Partial<Lead>>>({});
  
  const [uploadLead, setUploadLead] = useState<Lead | null>(null);
  const [initialImages, setInitialImages] = useState({ logoLeftImage: '', logoRightImage: '', backLogoImage: '', backDesignImage: '' });
  const [logoLeftImage, setLogoLeftImage] = useState<string>('');
  const [logoRightImage, setLogoRightImage] = useState<string>('');
  const [backLogoImage, setBackLogoImage] = useState<string>('');
  const [backDesignImage, setBackDesignImage] = useState<string>('');
  const logoLeftImageUploadRef = useRef<HTMLInputElement>(null);
  const logoRightImageUploadRef = useRef<HTMLInputElement>(null);
  const backLogoImageUploadRef = useRef<HTMLInputElement>(null);
  const backDesignImageUploadRef = useRef<HTMLInputElement>(null);
  const [openCustomerDetails, setOpenCustomerDetails] = useState<string | null>(null);


  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error, refetch } = useCollection<Lead>(leadsQuery);

  const salesRepresentatives = useMemo(() => {
    if (!leads) return [];
    return [...new Set(leads.map(lead => lead.salesRepresentative).filter(Boolean))].sort();
  }, [leads]);

  const handleProcessJobOrder = useCallback((lead: Lead) => {
    router.push(`/job-order/${lead.id}`);
  }, [router]);
  
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
  
  const getJoStatus = useCallback((lead: Lead) => {
    if (!lead.joNumber || !lead.isJoPrinted) {
      return <span className="text-gray-500">Not yet endorsed</span>;
    }
    if (lead.shipmentStatus === 'Shipped' || lead.shipmentStatus === 'Delivered') return "Already Shipped";
    if (lead.isRecheckingQuality) return <span className="font-bold text-red-600">Need to Reprint</span>;
    if (lead.shipmentStatus === 'Shipped' || lead.shipmentStatus === 'Delivered') return "Already Shipped";
    if (lead.isEndorsedToLogistics) return "Already on Logistics";
    if (lead.isSentToProduction) return "Already on Production Dept.";
    if (lead.isPreparedForProduction) return "Already on Inventory";
    if (lead.isJoHardcopyReceived) return "Already on Programming Dept.";
    return <span className="text-gray-500">Not yet endorsed</span>;
  }, []);

  const handlePrintedChange = async (leadId: string, checked: boolean) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', leadId);
    try {
      await updateDoc(leadDocRef, { 
        isJoPrinted: checked,
        joPrintedTimestamp: checked ? new Date().toISOString() : null
      });
      refetch();
    } catch (e: any) {
      console.error("Error updating printed status:", e);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: e.message || "Could not update the printed status.",
      });
      setOptimisticChanges(prev => {
        const newChanges = { ...prev[leadId] };
        delete newChanges.isJoPrinted;
        delete newChanges.joPrintedTimestamp;
        return { ...prev, [leadId]: newChanges };
      });
    }
  };

  const handleConfirmPrint = () => {
    if (confirmingPrint) {
      const leadId = confirmingPrint.id;
      const optimisticUpdate = {
        isJoPrinted: true,
        joPrintedTimestamp: new Date().toISOString()
      };
      setOptimisticChanges(prev => ({...prev, [leadId]: {...prev[leadId], ...optimisticUpdate }}));
      handlePrintedChange(leadId, true);
      setConfirmingPrint(null);
    }
  };
  
  const processedLeads = useMemo(() => {
    if (!leads) return [];
  
    const customerOrderStats: { [key: string]: { orders: Lead[], totalCustomerQuantity: number } } = {};
  
    leads.forEach(lead => {
      const name = lead.customerName.toLowerCase();
      if (!customerOrderStats[name]) {
        customerOrderStats[name] = { orders: [], totalCustomerQuantity: 0 };
      }
      customerOrderStats[name].orders.push(lead);
      const orderQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
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

  const filteredLeads = React.useMemo(() => {
    if (!processedLeads) return [];
    
    return processedLeads.filter(lead => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ?
        (toTitleCase(lead.customerName).toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && toTitleCase(lead.companyName).toLowerCase().includes(lowercasedSearchTerm)) ||
        (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))) ||
        (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))))
        : true;
      
      const matchesCsr = csrFilter === 'All' || lead.salesRepresentative === csrFilter;
      
      const lowercasedJoSearch = (joNumberSearch || '').toLowerCase();
      const matchesJo = joNumberSearch ? 
        (lead.joNumber && (
            formatJoNumber(lead.joNumber).toLowerCase().includes(lowercasedJoSearch) ||
            lead.joNumber.toString().padStart(5, '0').slice(-5) === lowercasedJoSearch.slice(-5)
        ))
        : true;

      return matchesSearch && matchesCsr && matchesJo;
    });
  }, [processedLeads, searchTerm, csrFilter, joNumberSearch, formatJoNumber]);
  
  const displayedLeads = useMemo(() => {
    if (!filteredLeads) return [];
    return filteredLeads.map(lead => ({
      ...lead,
      ...(optimisticChanges[lead.id] || {})
    }));
  }, [filteredLeads, optimisticChanges]);
  
  const handleOpenUploadDialog = useCallback((lead: Lead) => {
      const layout = lead.layouts?.[0];
      const initial = {
        logoLeftImage: layout?.refLogoLeftImage || '',
        logoRightImage: layout?.refLogoRightImage || '',
        backLogoImage: layout?.refBackLogoImage || '',
        backDesignImage: layout?.refBackDesignImage || '',
      };
      setInitialImages(initial);
      setLogoLeftImage(initial.logoLeftImage);
      setLogoRightImage(initial.logoRightImage);
      setBackLogoImage(initial.backLogoImage);
      setBackDesignImage(initial.backDesignImage);
      setUploadLead(lead);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (readEvent) => {
              setter(readEvent.target?.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleImagePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
      if (isReadOnly) return;
      const items = e.clipboardData.items;
      for (const item of items) {
          if (item.type.includes('image')) {
              const blob = item.getAsFile();
              if (blob) {
                  const reader = new FileReader();
                  reader.onload = (readEvent) => {
                      if (readEvent.target?.result) {
                        setter(readEvent.target.result as string);
                      }
                  };
                  reader.readAsDataURL(blob);
              }
          }
      }
    }, [isReadOnly]);

  const handleRemoveImage = useCallback((e: React.MouseEvent, setter: React.Dispatch<React.SetStateAction<string>>) => {
      e.stopPropagation();
      setter('');
  }, []);

  const handleSaveImages = useCallback(async () => {
    if (!uploadLead || !firestore) return;

    const leadDocRef = doc(firestore, 'leads', uploadLead.id);
    const layouts = uploadLead.layouts?.length ? JSON.parse(JSON.stringify(uploadLead.layouts)) : [{}];
    const existingLayout = layouts[0] || {};
    const now = new Date().toISOString();
    const storage = getStorage();

    const uploadAndGetURL = async (imageData: string, fieldName: string, existingUrl: string | null) => {
        if (!imageData) return null;
        if (imageData === existingUrl) return existingUrl;
        if (imageData.startsWith('http')) return imageData;

        const storageRef = ref(storage, `leads-images/${uploadLead.id}/ref_${fieldName}_${Date.now()}`);
        const snapshot = await uploadString(storageRef, imageData, 'data_url');
        return await getDownloadURL(snapshot.ref);
    };

    try {
        const [
            refLogoLeftImageUrl,
            refLogoRightImageUrl,
            refBackLogoImageUrl,
            refBackDesignImageUrl
        ] = await Promise.all([
            uploadAndGetURL(logoLeftImage, 'logoLeft', existingLayout.refLogoLeftImage),
            uploadAndGetURL(logoRightImage, 'logoRight', existingLayout.refLogoRightImage),
            uploadAndGetURL(backLogoImage, 'backLogo', existingLayout.refBackLogoImage),
            uploadAndGetURL(backDesignImage, 'backDesign', existingLayout.refBackDesignImage)
        ]);
        
        const updatedFirstLayout = {
            ...existingLayout,
            refLogoLeftImage: refLogoLeftImageUrl,
            refLogoLeftImageUploadTime: refLogoLeftImageUrl ? (existingLayout.refLogoLeftImage === refLogoLeftImageUrl ? existingLayout.refLogoLeftImageUploadTime : now) : null,
            refLogoRightImage: refLogoRightImageUrl,
            refLogoRightImageUploadTime: refLogoRightImageUrl ? (existingLayout.refLogoRightImage === refLogoRightImageUrl ? existingLayout.refLogoRightImageUploadTime : now) : null,
            refBackLogoImage: refBackLogoImageUrl,
            refBackLogoImageUploadTime: refBackLogoImageUrl ? (existingLayout.refBackLogoImage === refBackLogoImageUrl ? existingLayout.refBackLogoImageUploadTime : now) : null,
            refBackDesignImage: refBackDesignImageUrl,
            refBackDesignImageUploadTime: refBackDesignImageUrl ? (existingLayout.refBackDesignImage === refBackDesignImageUrl ? existingLayout.refBackDesignImageUploadTime : now) : null,
        };

        layouts[0] = updatedFirstLayout;

        await updateDoc(leadDocRef, {
            layouts: layouts,
            lastModified: new Date().toISOString(),
        });

        toast({
            title: 'Images Saved!',
            description: 'The reference images have been saved.',
        });
        setUploadLead(null);
    } catch (e: any) {
        console.error("Error saving images: ", e);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: e.message || "Could not save the images.",
        });
    }
  }, [uploadLead, firestore, toast, logoLeftImage, logoRightImage, backLogoImage, backDesignImage]);

  const toggleCustomerDetails = useCallback((leadId: string) => {
    setOpenCustomerDetails(openCustomerDetails === leadId ? null : leadId);
  }, [openCustomerDetails]);


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
       <AlertDialog open={!!confirmingPrint} onOpenChange={(open) => !open && setConfirmingPrint(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm if J.O. was already printed</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this Job Order as printed? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPrint}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-black">Process Job Order</CardTitle>
              <CardDescription className="text-gray-600">
                Search for a lead and process their job order.
              </CardDescription>
            </div>
             <div className="flex items-center gap-4">
               <Select value={csrFilter} onValueChange={setCsrFilter}>
                <SelectTrigger className="w-[180px] bg-gray-100 text-black placeholder:text-gray-500">
                  <SelectValue placeholder="Filter by SCES" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All SCES</SelectItem>
                  {salesRepresentatives.map(csr => (
                    <SelectItem key={csr} value={csr}>{csr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-full max-w-sm">
                <Input
                  placeholder="Search by J.O. No..."
                  value={joNumberSearch}
                  onChange={(e) => setJoNumberSearch(e.target.value)}
                  className="bg-gray-100 text-black placeholder:text-gray-500"
                />
              </div>
              <div className="w-full max-w-sm">
                <Input
                  placeholder="Search by customer, company, or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-100 text-black placeholder:text-gray-500"
                />
              </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
           <div className="border rounded-md h-full">
                <Table>
                  <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-white font-bold align-middle text-center">Order Created</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">Customer Name</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">SCES</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">Priority</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center w-[140px]"><span className="block w-[120px] break-words">Reference Image for Digitizing</span></TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">J.O. No.</TableHead>
                      <TableHead className="text-center text-white font-bold align-middle">Action</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center w-[120px]"><span className="block w-[100px] break-words">Uploaded Layout</span></TableHead>
                      <TableHead className="text-center text-white font-bold align-middle">Printed</TableHead>
                      <TableHead className="text-white font-bold align-middle text-center">J.O. Status</TableHead>
                    </TableRow>
                  </TableHeader>
                    <TableBody>
                    {displayedLeads.map((lead) => {
                      const isJoSaved = !!lead.joNumber;
                      const isCompleted = lead.shipmentStatus === 'Shipped' || lead.shipmentStatus === 'Delivered';
                      const creationDate = formatDateTime(lead.submissionDateTime);
                      const modifiedDate = formatDateTime(lead.lastModified);
                      const isRepeat = lead.orderNumber > 1;
                       const imageCount = [
                            lead.layouts?.[0]?.refLogoLeftImage,
                            lead.layouts?.[0]?.refLogoRightImage,
                            lead.layouts?.[0]?.refBackLogoImage,
                            lead.layouts?.[0]?.refBackDesignImage,
                        ].filter(Boolean).length;

                      return (
                        <TableRow key={lead.id}>
                            <TableCell className="text-xs align-middle py-2 text-black text-center">
                              <Collapsible>
                                <CollapsibleTrigger asChild>
                                    <div className="flex items-center justify-center cursor-pointer">
                                        <ChevronDown className="h-4 w-4 mr-1 transition-transform [&[data-state=open]]:rotate-180" />
                                        <div className='flex items-center'>
                                            <span>{creationDate.dateTime}</span>
                                        </div>
                                    </div>
                                </CollapsibleTrigger>
                                    <div className="text-gray-500 text-center">{creationDate.dayOfWeek}</div>
                                <CollapsibleContent className="pt-1 text-gray-500 text-xs text-center">
                                  <div className="text-center">
                                    <span className='font-bold text-gray-600'>Last Modified:</span>
                                    <div>{modifiedDate.dateTime}</div>
                                    <div>{modifiedDate.dayOfWeek}{lead.lastModifiedBy ? ` (${lead.lastModifiedBy})` : ''}</div>
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </TableCell>
                            <TableCell className="font-medium text-xs align-middle py-2 text-black text-center">
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
                                              <div className="flex items-center gap-1.5 cursor-pointer">
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
                                        {lead.companyName && lead.companyName !== '-' && <div>{toTitleCase(lead.companyName)}</div>}
                                        {getContactDisplay(lead) && <div>{getContactDisplay(lead)}</div>}
                                        </div>
                                    )}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-xs align-middle py-2 text-black text-center">{lead.salesRepresentative}</TableCell>
                            <TableCell className="align-middle py-2 text-center">
                               <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                                {lead.priorityType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center align-middle py-2">
                                <div className="relative inline-flex items-center justify-center">
                                    {/* Disable upload button if read-only */}
                                    <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => handleOpenUploadDialog(lead)} disabled={isCompleted || isReadOnly}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload
                                    </Button>
                                    {imageCount > 0 && (
                                        <div
                                            className="absolute -top-1 -left-1 h-4 w-4 flex items-center justify-center rounded-full bg-teal-600 text-white text-[10px] font-bold"
                                        >
                                           {imageCount}
                                        </div>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="font-medium text-xs align-middle py-2 text-black text-center">{formatJoNumber(lead.joNumber)}</TableCell>
                            <TableCell className="text-center align-middle py-2">
                               {/* Disable action button if read-only */}
                               <Button 
                                  size="sm" 
                                  className={cn(
                                    'h-8 px-3 text-white font-bold',
                                     isCompleted ? 'bg-slate-500' : (isJoSaved ? (lead.isJoPrinted ? 'bg-blue-900 hover:bg-blue-800' : 'bg-emerald-600 hover:bg-emerald-700') : 'bg-primary hover:bg-primary/90')
                                  )}
                                  onClick={() => handleProcessJobOrder(lead)}
                                   onMouseEnter={() => setHoveredLeadId(lead.id)}
                                   onMouseLeave={() => setHoveredLeadId(null)}
                                   disabled={isCompleted || isReadOnly} // Added isReadOnly here
                                >
                                  {isCompleted ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        J.O. Saved
                                    </>
                                  ) : isJoSaved ? (
                                    lead.isJoPrinted ? 'Re-Print/Edit' : (hoveredLeadId === lead.id ? 'Edit J.O.' : 'J.O. Saved')
                                  ) : (
                                    'Process J.O.'
                                  )}
                                </Button>
                            </TableCell>
                             <TableCell className="text-xs align-middle text-center py-2">
                                {(() => {
                                    const layoutImageCount = lead.layouts?.filter(l => l.layoutImage).length || 0;
                                    if (layoutImageCount > 0) {
                                        return <span className="text-black font-medium">{layoutImageCount} Layout{layoutImageCount > 1 ? 's' : ''} Uploaded</span>;
                                    } else {
                                        return <span className="text-red-500 font-bold">No Uploaded Layout</span>;
                                    }
                                })()}
                            </TableCell>
                             <TableCell className="text-center align-middle py-2">
                                <div className="flex flex-col items-center justify-center gap-1">
                                    <Checkbox
                                        checked={lead.isJoPrinted || false}
                                        onCheckedChange={(checked) => {
                                            if (checked && !lead.isJoPrinted) {
                                                setConfirmingPrint(lead);
                                            }
                                        }}
                                        disabled={!isJoSaved || lead.isJoPrinted || isReadOnly} // Added isReadOnly here
                                        className={cn(lead.isJoPrinted && "cursor-default data-[state=checked]:opacity-100 data-[state=checked]:bg-primary")}
                                    />
                                    {lead.isJoPrinted && lead.joPrintedTimestamp && (
                                        <div className="text-[10px] text-gray-500">{formatDateTime(lead.joPrintedTimestamp).dateTimeShort}</div>
                                    )}
                                </div>
                             </TableCell>
                            <TableCell className="text-xs align-middle py-2 text-black font-medium text-center">{getJoStatus(lead)}</TableCell>
                        </TableRow>
                      );
                    })}
                    </TableBody>
                </Table>
          </div>
      </CardContent>
       <Dialog open={!!uploadLead} onOpenChange={(isOpen) => !isOpen && setUploadLead(null)}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Reference Image for Digitizing</DialogTitle>
                <DialogDescription>
                   Upload logos or back design for the Digitizing team's reference.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                <Label>Logo Left</Label>
                <div tabIndex={isReadOnly ? -1 : 0} className={cn("relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-48 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none", isReadOnly ? "cursor-not-allowed" : "cursor-pointer")} onPaste={(e) => !isReadOnly && handleImagePaste(e, setLogoLeftImage)} onDoubleClick={() => !isReadOnly && logoLeftImageUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                    {logoLeftImage ? (<> <Image src={logoLeftImage} alt="Logo Left" layout="fill" objectFit="contain" className="rounded-md" /> {logoLeftImage && !isReadOnly && <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-7 w-7" onClick={(e) => handleRemoveImage(e, setLogoLeftImage)}> <Trash2 className="h-4 w-4" /> </Button>} </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>{isReadOnly ? "No image uploaded" : "Double-click to upload or paste image"}</p> </div>)}
                    <input type="file" accept="image/*" ref={logoLeftImageUploadRef} onChange={(e) => handleImageUpload(e, setLogoLeftImage)} className="hidden" disabled={isReadOnly}/>
                </div>
                </div>
                <div className="space-y-2">
                <Label>Logo Right</Label>
                <div tabIndex={isReadOnly ? -1 : 0} className={cn("relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-48 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none", isReadOnly ? "cursor-not-allowed" : "cursor-pointer")} onPaste={(e) => !isReadOnly && handleImagePaste(e, setLogoRightImage)} onDoubleClick={() => !isReadOnly && logoRightImageUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                    {logoRightImage ? (<> <Image src={logoRightImage} alt="Logo Right" layout="fill" objectFit="contain" className="rounded-md" /> {logoRightImage && !isReadOnly && <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-7 w-7" onClick={(e) => handleRemoveImage(e, setLogoRightImage)}> <Trash2 className="h-4 w-4" /> </Button>} </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>{isReadOnly ? "No image uploaded" : "Double-click to upload or paste image"}</p> </div>)}
                    <input type="file" accept="image/*" ref={logoRightImageUploadRef} onChange={(e) => handleImageUpload(e, setLogoRightImage)} className="hidden" disabled={isReadOnly}/>
                </div>
                </div>
                <div className="space-y-2">
                <Label>Back Logo</Label>
                <div tabIndex={isReadOnly ? -1 : 0} className={cn("relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-48 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none", isReadOnly ? "cursor-not-allowed" : "cursor-pointer")} onPaste={(e) => !isReadOnly && handleImagePaste(e, setBackLogoImage)} onDoubleClick={() => !isReadOnly && backLogoImageUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                    {backLogoImage ? (<> <Image src={backLogoImage} alt="Back Logo" layout="fill" objectFit="contain" className="rounded-md" /> {backLogoImage && !isReadOnly && <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-7 w-7" onClick={(e) => handleRemoveImage(e, setBackLogoImage)}> <Trash2 className="h-4 w-4" /> </Button>} </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>{isReadOnly ? "No image uploaded" : "Double-click to upload or paste image"}</p> </div>)}
                    <input type="file" accept="image/*" ref={backLogoImageUploadRef} onChange={(e) => handleImageUpload(e, setBackLogoImage)} className="hidden" disabled={isReadOnly}/>
                </div>
                </div>
                <div className="space-y-2">
                <Label>Back Design</Label>
                <div tabIndex={isReadOnly ? -1 : 0} className={cn("relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-48 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none", isReadOnly ? "cursor-not-allowed" : "cursor-pointer")} onPaste={(e) => !isReadOnly && handleImagePaste(e, setBackDesignImage)} onDoubleClick={() => !isReadOnly && backDesignImageUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                    {backDesignImage ? (<> <Image src={backDesignImage} alt="Back Design" layout="fill" objectFit="contain" className="rounded-md" /> {backDesignImage && !isReadOnly && <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-7 w-7" onClick={(e) => handleRemoveImage(e, setBackDesignImage)}> <Trash2 className="h-4 w-4" /> </Button>}
</>) : ( <div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p> {isReadOnly ? "No image uploaded" : "Double-click to upload or paste image"} </p> </div> )} <input type="file" accept="image/*" ref={backDesignImageUploadRef} onChange={(e) => handleImageUpload(e, setBackDesignImage)} className="hidden" disabled={isReadOnly}/> </div></div></div><DialogFooter><DialogClose asChild><Button type="button" variant="outline"> Cancel </Button></DialogClose> <Button onClick={handleSaveImages} disabled={
                (initialImages.logoLeftImage === logoLeftImage &&
                 initialImages.logoRightImage === logoRightImage &&
                 initialImages.backLogoImage === backLogoImage &&
                 initialImages.backDesignImage === backDesignImage) || isReadOnly
              }>Save Images </Button></DialogFooter></DialogContent></Dialog></Card> ); }

    











