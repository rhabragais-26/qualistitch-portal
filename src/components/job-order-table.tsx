

'use client';

import { doc, updateDoc, collection, query, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
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
import React, { useState, useMemo, useCallback, useRef, useEffect, ChangeEvent } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Upload, Edit, Trash2, X, PlusCircle, Download, Check, Calendar as CalendarIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { formatDateTime, toTitleCase, formatJoNumber as formatJoNumberUtil } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose, DialogFooter } from "@/components/ui/dialog"
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
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
  sequenceLogo?: (FileObject | null)[];
  sequenceBackDesign?: (FileObject | null)[];
  finalProgrammedLogo?: (FileObject | null)[];
  finalProgrammedBackDesign?: (FileObject | null)[];
};

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  salesRepresentative: string;
  orderType: string;
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
  const { userProfile, isAdmin } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [joNumberSearch, setJoNumberSearch] = React.useState('');
  const [csrFilter, setCsrFilter] = React.useState('All');
  const [hoveredLeadId, setHoveredLeadId] = React.useState<string | null>(null);
  const router = useRouter();
  const [confirmingPrint, setConfirmingPrint] = useState<Lead | null>(null);
  const [optimisticChanges, setOptimisticChanges] = useState<Record<string, Partial<Lead>>>({});
  const [imageInView, setImageInView] = useState<string | null>(null);
  
  const [uploadLead, setUploadLead] = useState<Lead | null>(null);
  const [refLogoLeftImages, setRefLogoLeftImages] = useState<(string | null)[]>([]);
  const [refLogoRightImages, setRefLogoRightImages] = useState<(string | null)[]>([]);
  const [refBackLogoImages, setRefBackLogoImages] = useState<(string | null)[]>([]);
  const [refBackDesignImages, setRefBackDesignImages] = useState<(string | null)[]>([]);

  const [openCustomerDetails, setOpenCustomerDetails] = useState<string | null>(null);

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error, refetch } = useCollection<Lead>(leadsQuery, undefined, { listen: false });

  const salesRepresentatives = useMemo(() => {
    if (!leads) return [];
    return [...new Set(leads.map(lead => lead.salesRepresentative).filter(Boolean))].sort();
  }, [leads]);
  
  const toggleCustomerDetails = useCallback((leadId: string) => {
    setOpenCustomerDetails(openCustomerDetails === leadId ? null : leadId);
  }, [openCustomerDetails]);

  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || null;
  }, []);

  const handleProcessJobOrder = useCallback((lead: Lead) => {
    router.push(`/job-order/${lead.id}`);
  }, [router]);
  
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

      const joString = formatJoNumber(lead.joNumber);
      const matchesJo = joNumberSearch ? 
        (joString.toLowerCase().includes(joNumberSearch.toLowerCase()))
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
    
    const getInitialImages = (pluralField: { url: string }[] | undefined, singularField: string | null | undefined): (string|null)[] => {
        const images: (string | null)[] = [];
        if (pluralField && pluralField.length > 0) {
            images.push(...pluralField.map(i => i.url));
        } else if (singularField) {
            images.push(singularField);
        }
        return images.length > 0 ? images : [null];
    };

    setRefLogoLeftImages(getInitialImages((layout as any)?.refLogoLeftImages, layout?.refLogoLeftImage));
    setRefLogoRightImages(getInitialImages((layout as any)?.refLogoRightImages, layout?.refLogoRightImage));
    setRefBackLogoImages(getInitialImages((layout as any)?.refBackLogoImages, layout?.refBackLogoImage));
    setRefBackDesignImages(getInitialImages((layout as any)?.refBackDesignImages, layout?.refBackDesignImage));

    setUploadLead(lead);
  }, []);

  const handleImageUpload = (file: File, setter: React.Dispatch<React.SetStateAction<(string | null)[]>>, index: number) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          setter(prev => {
              const newImages = [...prev];
              newImages[index] = e.target.result as string;
              return newImages;
          });
      };
      reader.readAsDataURL(file);
  };
  
  const handleClearImage = (setter: React.Dispatch<React.SetStateAction<(string | null)[]>>, index: number) => {
    setter(prev => {
        const newImages = [...prev];
        newImages[index] = null;
        return newImages;
    });
  };

  const handleRemoveImage = (e: React.MouseEvent, setter: React.Dispatch<React.SetStateAction<(string|null)[]>>, index: number) => {
    e.stopPropagation();
    setter(prev => prev.filter((_, i) => i !== index));
  };


  const handleSaveImages = useCallback(async () => {
    if (!uploadLead || !firestore || !userProfile) return;

    const leadDocRef = doc(firestore, 'leads', uploadLead.id);
    const layouts = uploadLead.layouts?.length ? JSON.parse(JSON.stringify(uploadLead.layouts)) : [{}];
    let existingLayout = layouts[0] || {};
    const now = new Date().toISOString();
    const storage = getStorage();

    const uploadAndGetURL = async (imageData: string | null, fieldName: string, index: number): Promise<{ url: string; uploadTime: string; uploadedBy: string } | null> => {
      if (!imageData) return null;
      if (imageData.startsWith('http')) {
        const pluralFieldName = `${fieldName}s`;
        const existingArray = (uploadLead.layouts?.[0]?.[pluralFieldName as keyof Layout] as { url: string; uploadTime: string; uploadedBy: string }[]) || [];
        const existingImageObject = existingArray.find(img => img.url === imageData);
        if (existingImageObject) {
            return existingImageObject;
        }

        if (uploadLead.layouts?.[0]?.[fieldName as keyof Layout] === imageData) {
            const timestamp = uploadLead.layouts?.[0]?.[`${fieldName}UploadTime` as keyof Layout] as string | null;
            const uploader = uploadLead.layouts?.[0]?.[`${fieldName}UploadedBy` as keyof Layout] as string | null;
            return { url: imageData, uploadTime: timestamp || now, uploadedBy: uploader || userProfile.nickname };
        }
        
        return { url: imageData, uploadTime: now, uploadedBy: userProfile.nickname };
      }
      if(!imageData.startsWith('data:')) return null;

      const storageRef = ref(storage, `leads-images/${uploadLead.id}/${fieldName}_${index}_${Date.now()}`);
      const snapshot = await uploadString(storageRef, imageData, 'data_url');
      const downloadURL = await getDownloadURL(snapshot.ref);
      return { url: downloadURL, uploadTime: now, uploadedBy: userProfile.nickname };
    };

    try {
        const [leftImages, rightImages, backLogoImages, backDesignImages] = await Promise.all([
            Promise.all(refLogoLeftImages.map((img, i) => uploadAndGetURL(img, 'refLogoLeftImage', i))),
            Promise.all(refLogoRightImages.map((img, i) => uploadAndGetURL(img, 'refLogoRightImage', i))),
            Promise.all(refBackLogoImages.map((img, i) => uploadAndGetURL(img, 'refBackLogoImage', i))),
            Promise.all(refBackDesignImages.map((img, i) => uploadAndGetURL(img, 'refBackDesignImage', i))),
        ]);

        const updatedFirstLayout = {
            ...existingLayout,
            refLogoLeftImages: leftImages.filter(Boolean),
            refLogoRightImages: rightImages.filter(Boolean),
            refBackLogoImages: backLogoImages.filter(Boolean),
            refBackDesignImages: backDesignImages.filter(Boolean),
        };
        
        const fieldsToClean: (keyof Layout)[] = [
            'refLogoLeftImage', 'refLogoRightImage', 'refBackLogoImage', 'refBackDesignImage',
            'refLogoLeftImageUploadTime', 'refLogoLeftImageUploadedBy',
            'refLogoRightImageUploadTime', 'refLogoRightImageUploadedBy',
            'refBackLogoImageUploadTime', 'refBackLogoImageUploadedBy',
            'refBackDesignImageUploadTime', 'refBackDesignImageUploadedBy'
        ];
        fieldsToClean.forEach(field => delete updatedFirstLayout[field]);


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
        refetch();
    } catch (e: any) {
        console.error("Error saving images: ", e);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: e.message || "Could not save the images.",
        });
    }
  }, [uploadLead, firestore, userProfile, toast, refetch, refLogoLeftImages, refLogoRightImages, refBackLogoImages, refBackDesignImages]);
  
  const handleImagePaste = (e: React.ClipboardEvent<HTMLDivElement>, setter: React.Dispatch<React.SetStateAction<(string | null)[]>>, index: number) => {
    const file = e.clipboardData.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageUpload(file, setter, index);
    }
  };
  
  const renderUploadBoxes = (label: string, images: (string|null)[], setter: React.Dispatch<React.SetStateAction<(string|null)[]>>) => {
    const displayImages = images.length > 0 ? images : [null];
    return (
      <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>{label}</Label>
              <Button type="button" size="icon" variant="ghost" className="h-5 w-5 hover:bg-gray-200" onClick={() => setter(prev => [...prev, null])}>
                  <PlusCircle className="h-4 w-4" />
              </Button>
          </div>
          {displayImages.map((image, index) => (
              <div key={index} className="flex items-center gap-2">
                  <div
                    tabIndex={0}
                    className="relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-48 flex-1 flex items-center justify-center cursor-pointer"
                    onClick={() => image && setImageInView(image)}
                    onDoubleClick={() => document.getElementById(`file-input-job-order-${label}-${index}`)?.click()}
                    onPaste={(e) => handleImagePaste(e, setter, index)}
                    onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}
                  >
                      {image ? (<>
                        <Image src={image} alt={`${label} ${index + 1}`} layout="fill" objectFit="contain" className="rounded-md" />
                         <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          onClick={(e) => {
                              e.stopPropagation();
                              handleClearImage(setter, index);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>Double-click to upload or paste image</p> </div>)}
                      <input id={`file-input-job-order-${label}-${index}`} type="file" accept="image/*" className="hidden" onChange={(e) => {if(e.target.files?.[0]) handleImageUpload(e.target.files[0], setter, index)}} />
                  </div>
                  {index > 0 && (
                      <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive self-center"
                          onClick={(e) => handleRemoveImage(e, setter, index)}
                      >
                          <X className="h-5 w-5" />
                      </Button>
                  )}
              </div>
          ))}
      </div>
    );
  };

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
                <DialogClose asChild>
                    <Button type="button" variant="outline"> Cancel </Button>
                </DialogClose>
                <Button onClick={handleSaveImages}>Save Images</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-black">Process Job Order</CardTitle>
              <CardDescription className="text-gray-600">
                A list of all customer orders that have not been completed.
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
              <div className="w-full max-w-xs">
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
                  <TableHead className="text-white font-bold align-middle text-center">Uploaded Layout</TableHead>
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
                  const isHovered = hoveredLeadId === lead.id;
                  const isRepeat = lead.orderNumber > 1;
                  
                  const layoutImageCount = lead.layouts?.filter(l => l.layoutImage).length || 0;
                  const refImageCount = useMemo(() => {
                    const layout = lead.layouts?.[0];
                    if (!layout) return 0;
                    
                    const count = 
                      (layout.refLogoLeftImages?.length || (layout.refLogoLeftImage ? 1 : 0)) +
                      (layout.refLogoRightImages?.length || (layout.refLogoRightImage ? 1 : 0)) +
                      (layout.refBackLogoImages?.length || (layout.refBackLogoImage ? 1 : 0)) +
                      (layout.refBackDesignImages?.length || (layout.refBackDesignImage ? 1 : 0));
                    return count;
                  }, [lead.layouts]);

                  return (
                    <TableRow key={lead.id} onMouseEnter={() => setHoveredLeadId(lead.id)} onMouseLeave={() => setHoveredLeadId(null)} className={cn(isHovered && "bg-gray-100")}>
                      <TableCell className="text-xs align-middle py-2 text-black text-center">
                        <div>{creationDate.dateTime}</div>
                        <div className="text-gray-500">{creationDate.dayOfWeek}</div>
                      </TableCell>
                       <TableCell className="text-xs align-middle text-center py-2 text-black">
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
                              <span className="text-xs text-blue-600 font-semibold">New Customer</span>
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
                      <TableCell className="text-xs align-middle py-2 text-black text-center">{lead.salesRepresentative}</TableCell>
                      <TableCell className="align-middle py-2 text-center">
                        <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                          {lead.priorityType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center align-middle py-2">
                        <div className="relative inline-flex items-center justify-center">
                            <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => handleOpenUploadDialog(lead)} disabled={isReadOnly}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload
                            </Button>
                            {refImageCount > 0 && (
                                <div
                                    className="absolute -top-1 -left-1 h-4 w-4 flex items-center justify-center rounded-full bg-teal-600 text-white text-[10px] font-bold"
                                >
                                   {refImageCount}
                                </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-xs align-middle py-2 text-black whitespace-nowrap text-center">{formatJoNumber(lead.joNumber)}</TableCell>
                      <TableCell className="text-center align-middle py-2">
                        <TooltipProvider>
                           <Tooltip>
                               <TooltipTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      className={cn(
                                        'h-8 px-3 text-white font-bold',
                                        isCompleted ? 'bg-slate-500' : (isJoSaved ? (lead.isJoPrinted ? 'bg-blue-900 hover:bg-blue-800' : 'bg-emerald-600 hover:bg-emerald-700') : 'bg-primary hover:bg-primary/90')
                                      )}
                                      onClick={() => handleProcessJobOrder(lead)}
                                      disabled={isReadOnly}
                                    >
                                      {isCompleted ? (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            J.O. Saved
                                        </>
                                      ) : isJoSaved ? (
                                        lead.isJoPrinted ? 'Re-Print/Edit' : (isHovered ? 'Edit J.O.' : 'J.O. Saved')
                                      ) : (
                                        'Process J.O.'
                                      )}
                                    </Button>
                               </TooltipTrigger>
                               <TooltipContent>
                                <p>{isCompleted ? "This J.O. is complete." : isJoSaved ? (lead.isJoPrinted ? "Print a new copy or edit the J.O. details." : "Edit the Job Order before printing.") : "Process this lead to create a Job Order."}</p>
                               </TooltipContent>
                           </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center align-middle text-xs font-semibold">
                        {layoutImageCount > 0 ? (
                            <span className="text-black">{layoutImageCount} Layout{layoutImageCount > 1 ? 's' : ''} Uploaded</span>
                        ) : (
                            <span className="text-destructive">No Uploaded Layout</span>
                        )}
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
                                disabled={!isJoSaved || lead.isJoPrinted || isCompleted || isReadOnly}
                                className={cn((lead.isJoPrinted || isCompleted) && "cursor-default data-[state=checked]:opacity-100 data-[state=checked]:bg-primary")}
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
    </Card>
    </>
  );
}

