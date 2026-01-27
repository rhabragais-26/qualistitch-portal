

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
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Check, ChevronDown, Upload, Trash2, ChevronUp, PlusCircle } from 'lucide-react';
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
  refLogoLeftImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  refLogoRightImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  refBackLogoImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  refBackDesignImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  logoLeftImage?: string | null;
  logoRightImage?: string | null;
  backLogoImage?: string | null;
  backDesignImage?: string | null;
  testLogoLeftImage?: string | null;
  testLogoRightImage?: string | null;
  testBackLogoImage?: string | null;
  testBackDesignImage?: string | null;
  finalLogoEmb?: (FileObject | null)[];
  finalBackDesignEmb?: (FileObject | null)[];
  finalLogoDst?: (FileObject | null)[];
  finalBackDesignDst?: (FileObject | null)[];
  finalNamesDst?: (FileObject | null)[];
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
  layouts?: Layout[];
  lastModifiedBy?: string;
}

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

interface JobOrderTableProps {
  isReadOnly: boolean;
}

export function JobOrderTable({ isReadOnly }: JobOrderTableProps) {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [joNumberSearch, setJoNumberSearch] = React.useState('');
  const [csrFilter, setCsrFilter] = React.useState('All');
  const [hoveredLeadId, setHoveredLeadId] = React.useState<string | null>(null);
  const router = useRouter();
  const [confirmingPrint, setConfirmingPrint] = useState<Lead | null>(null);
  const [optimisticChanges, setOptimisticChanges] = useState<Record<string, Partial<Lead>>>({});
  
  const [uploadLead, setUploadLead] = useState<Lead | null>(null);

  const [refLogoLeftImages, setRefLogoLeftImages] = useState<(string | null)[]>(['']);
  const [refLogoRightImages, setRefLogoRightImages] = useState<(string | null)[]>(['']);
  const [refBackLogoImages, setRefBackLogoImages] = useState<(string | null)[]>(['']);
  const [refBackDesignImages, setRefBackDesignImages] = useState<(string | null)[]>(['']);

  const [openCustomerDetails, setOpenCustomerDetails] = useState<string | null>(null);

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error, refetch } = useCollection<Lead>(leadsQuery, undefined, { listen: false });

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
    if (lead.isEndorsedToLogistics) return "Already on Logistics";
    if (lead.isSentToProduction) return "Already on Production Dept.";
    if (lead.isPreparedForProduction) return "Already on Inventory";
    if (lead.joNumber) return "Already on Programming Dept.";
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
  
    return enrichedLeads.sort((a,b) => new Date(b.submissionDateTime).getTime() - new Date(a.submissionDateTime).getTime());
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
    setRefLogoLeftImages(layout?.refLogoLeftImages?.map(i => i.url) || ['']);
    setRefLogoRightImages(layout?.refLogoRightImages?.map(i => i.url) || ['']);
    setRefBackLogoImages(layout?.refBackLogoImages?.map(i => i.url) || ['']);
    setRefBackDesignImages(layout?.refBackDesignImages?.map(i => i.url) || ['']);
    setUploadLead(lead);
  }, []);

  const handleImageUpload = (file: File, setter: React.Dispatch<React.SetStateAction<(string | null)[]>>, index: number) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          setter(prev => {
              const newImages = [...prev];
              newImages[index] = e.target?.result as string;
              return newImages;
          });
      };
      reader.readAsDataURL(file);
  };
  
  const handleRemoveImage = (e: React.MouseEvent, setter: React.Dispatch<React.SetStateAction<(string | null)[]>>, index: number) => {
    e.stopPropagation();
    setter(prev => {
        const newImages = [...prev];
        newImages.splice(index, 1);
        if (newImages.length === 0) return [''];
        return newImages;
    });
  };

  const handleSaveImages = useCallback(async () => {
    if (!uploadLead || !firestore || !userProfile) return;

    const leadDocRef = doc(firestore, 'leads', uploadLead.id);
    const layouts = uploadLead.layouts?.length ? JSON.parse(JSON.stringify(uploadLead.layouts)) : [{}];
    const existingLayout = layouts[0] || {};
    const now = new Date().toISOString();
    const storage = getStorage();

    const uploadAndGetURL = async (image: string | null, fieldName: string, index: number, existingUrl?: string): Promise<{ url: string; uploadTime: string; uploadedBy: string } | null> => {
        if (!image) return null;
        if (image === existingUrl) { // Find the existing data to preserve timestamp and uploader
          const existingArray = (existingLayout[fieldName] as { url: string; uploadTime: string; uploadedBy: string }[]) || [];
          const existingImageObject = existingArray.find(img => img.url === existingUrl);
          if (existingImageObject) return existingImageObject;
        }
        if (image.startsWith('http')) return { url: image, uploadTime: now, uploadedBy: userProfile.nickname };

        const storageRef = ref(storage, `leads-images/${uploadLead.id}/${fieldName}_${index}_${Date.now()}`);
        const snapshot = await uploadString(storageRef, image, 'data_url');
        const downloadURL = await getDownloadURL(snapshot.ref);
        return { url: downloadURL, uploadTime: now, uploadedBy: userProfile.nickname };
    };

    try {
        const updatedImages = {
          refLogoLeftImages: (await Promise.all(refLogoLeftImages.map((img, i) => uploadAndGetURL(img, 'refLogoLeftImages', i, uploadLead.layouts?.[0]?.refLogoLeftImages?.[i]?.url)))).filter(Boolean),
          refLogoRightImages: (await Promise.all(refLogoRightImages.map((img, i) => uploadAndGetURL(img, 'refLogoRightImages', i, uploadLead.layouts?.[0]?.refLogoRightImages?.[i]?.url)))).filter(Boolean),
          refBackLogoImages: (await Promise.all(refBackLogoImages.map((img, i) => uploadAndGetURL(img, 'refBackLogoImages', i, uploadLead.layouts?.[0]?.refBackLogoImages?.[i]?.url)))).filter(Boolean),
          refBackDesignImages: (await Promise.all(refBackDesignImages.map((img, i) => uploadAndGetURL(img, 'refBackDesignImages', i, uploadLead.layouts?.[0]?.refBackDesignImages?.[i]?.url)))).filter(Boolean),
        };

        const updatedFirstLayout = { ...existingLayout, ...updatedImages };
        layouts[0] = updatedFirstLayout;
        
        await updateDoc(leadDocRef, {
            layouts,
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile.nickname,
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
  }, [uploadLead, firestore, userProfile, toast, refLogoLeftImages, refLogoRightImages, refBackLogoImages, refBackDesignImages]);
  
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
  
  const renderUploadBoxes = (label: string, images: (string|null)[], setter: React.Dispatch<React.SetStateAction<(string|null)[]>>) => {
    return (
      <div className="space-y-2">
          <Label className="flex items-center gap-2">{label}
              <Button type="button" size="icon" variant="ghost" className="h-5 w-5" onClick={() => setter(prev => [...prev, ''])} disabled={images.length >= 3}>
                  <PlusCircle className="h-4 w-4" />
              </Button>
          </Label>
          {images.map((image, index) => (
              <div key={index} className="flex items-center gap-2">
                  <div tabIndex={0} className="relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-48 flex-1 flex items-center justify-center cursor-pointer" onDoubleClick={() => document.getElementById(`file-input-${label}-${index}`)?.click()} onPaste={(e) => handleImagePaste(e, setter, index)}>
                      {image ? (<> <Image src={image} alt={`${label} ${index + 1}`} layout="fill" objectFit="contain" className="rounded-md" /> <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-7 w-7" onClick={(e) => handleRemoveImage(e, setter, index)}> <Trash2 className="h-4 w-4" /> </Button> </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>Double-click to upload or paste image</p> </div>)}
                      <input id={`file-input-${label}-${index}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0], setter, index)} />
                  </div>
              </div>
          ))}
      </div>
    );
  };
  
  const handleImagePaste = (e: React.ClipboardEvent<HTMLDivElement>, setter: React.Dispatch<React.SetStateAction<(string | null)[]>>, index: number) => {
    const file = e.clipboardData.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageUpload(file, setter, index);
    }
  };


  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
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

      <Dialog open={!!uploadLead} onOpenChange={(isOpen) => !isOpen && setUploadLead(null)}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Reference Image for Digitizing</DialogTitle>
                <DialogDescription>
                    Upload logos or back design for the Digitizing team's reference.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] p-4">
              <div className="grid grid-cols-2 gap-6">
                  {renderUploadBoxes('Logo Left', refLogoLeftImages, setRefLogoLeftImages)}
                  {renderUploadBoxes('Logo Right', refLogoRightImages, setRefLogoRightImages)}
                  {renderUploadBoxes('Back Logo', refBackLogoImages, setRefBackLogoImages)}
                  {renderUploadBoxes('Back Design', refBackDesignImages, setRefBackDesignImages)}
              </div>
            </ScrollArea>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline"> Cancel </Button></DialogClose>
                <Button onClick={handleSaveImages}>Save Images</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
                  
                  const imageCount = (lead.layouts?.[0]?.refLogoLeftImages?.length || 0) +
                                      (lead.layouts?.[0]?.refLogoRightImages?.length || 0) +
                                      (lead.layouts?.[0]?.refBackLogoImages?.length || 0) +
                                      (lead.layouts?.[0]?.refBackDesignImages?.length || 0);

                  return (
                    <React.Fragment key={lead.id}>
                        <TableRow>
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
                               <Button 
                                  size="sm" 
                                  className={cn(
                                    'h-8 px-3 text-white font-bold',
                                     isCompleted ? 'bg-slate-500' : (isJoSaved ? (lead.isJoPrinted ? 'bg-blue-900 hover:bg-blue-800' : 'bg-emerald-600 hover:bg-emerald-700') : 'bg-primary hover:bg-primary/90')
                                  )}
                                  onClick={() => handleProcessJobOrder(lead)}
                                   onMouseEnter={() => setHoveredLeadId(lead.id)}
                                   onMouseLeave={() => setHoveredLeadId(null)}
                                   disabled={isCompleted || isReadOnly}
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
                             <TableCell className="text-center align-middle py-2">
                                <div className="flex flex-col items-center justify-center gap-1">
                                    <Checkbox
                                        checked={lead.isJoPrinted || false}
                                        onCheckedChange={(checked) => {
                                            if (checked && !lead.isJoPrinted) {
                                                setConfirmingPrint(lead);
                                            }
                                        }}
                                        disabled={!isJoSaved || lead.isJoPrinted || isReadOnly}
                                        className={cn(lead.isJoPrinted && "cursor-default data-[state=checked]:opacity-100 data-[state=checked]:bg-primary")}
                                    />
                                    {lead.isJoPrinted && lead.joPrintedTimestamp && (
                                        <div className="text-[10px] text-gray-500">{formatDateTime(lead.joPrintedTimestamp).dateTimeShort}</div>
                                    )}
                                </div>
                             </TableCell>
                            <TableCell className="text-xs align-middle py-2 text-black font-medium text-center">{getJoStatus(lead)}</TableCell>
                        </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
      </CardContent>
    </Card>
  );
}

