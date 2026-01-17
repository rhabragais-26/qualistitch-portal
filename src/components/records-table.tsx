

"use client";

import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from './ui/badge';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, PlusCircle, Edit, Trash2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { collection, query } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { z, ZodError } from 'zod';
import { EditOrderDialog } from './edit-order-dialog';
import { EditLeadFullDialog } from './edit-lead-full-dialog';
import { FieldErrors } from 'react-hook-form';
import Image from 'next/image';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
};

const orderSchema = z.object({
  id: z.string().optional(),
  productType: z.string(),
  color: z.string(),
  size: z.string(),
  quantity: z.number(),
  embroidery: z.enum(['logo', 'logoAndText', 'name']).optional(),
  pricePerPatch: z.number().optional(),
});
export type Order = z.infer<typeof orderSchema>;

const paymentSchema = z.object({
    type: z.enum(['down', 'full']),
    amount: z.number(),
    mode: z.string(),
});

const layoutSchema = z.object({
    logoLeftImage: z.string().nullable().optional(),
    logoLeftImageUploadTime: z.string().nullable().optional(),
    logoRightImage: z.string().nullable().optional(),
    logoRightImageUploadTime: z.string().nullable().optional(),
    backLogoImage: z.string().nullable().optional(),
    backLogoImageUploadTime: z.string().nullable().optional(),
    backDesignImage: z.string().nullable().optional(),
    backDesignImageUploadTime: z.string().nullable().optional(),
}).passthrough(); // Use passthrough to allow other fields from backend.json

const leadSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  companyName: z.string().optional(),
  contactNumber: z.string().optional(),
  landlineNumber: z.string().optional(),
  location: z.string(),
  houseStreet: z.string().optional(),
  barangay: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  isInternational: z.boolean().optional(),
  salesRepresentative: z.string(),
  priorityType: z.string(),
  orderType: z.string(),
  courier: z.string().optional(),
  orders: z.array(orderSchema),
  submissionDateTime: z.string(),
  lastModified: z.string(),
  lastModifiedBy: z.string().optional(),
  grandTotal: z.number().optional(),
  paidAmount: z.number().optional(),
  paymentType: z.string().optional(),
  modeOfPayment: z.string().optional(),
  balance: z.number().optional(),
  addOns: z.any().optional(),
  discounts: z.any().optional(),
  payments: z.array(paymentSchema).optional(),
  productType: z.string().optional(),
  layouts: z.array(layoutSchema).optional(),
  joNumber: z.number().optional(),
});

export type Lead = z.infer<typeof leadSchema>;

const inventoryItemSchema = z.object({
  id: z.string(),
  productType: z.string(),
  color: z.string(),
  size: z.string(),
  stock: z.number(),
});
type InventoryItem = z.infer<typeof inventoryItemSchema>;


type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

const productTypes = [
    'Executive Jacket 1', 'Executive Jacket v2 (with lines)', 'Turtle Neck Jacket',
    'Corporate Jacket', 'Reversible v1', 'Reversible v2', 'Polo Shirt (Coolpass)',
    'Polo Shirt (Cotton Blend)', 'Patches', 'Client Owned',
];

const jacketColors = [
    'Black', 'Brown', 'Dark Khaki', 'Light Khaki', 'Olive Green', 'Navy Blue',
    'Light Gray', 'Dark Gray', 'Khaki', 'Black/Khaki', 'Black/Navy Blue',
    'Army Green',
];

const poloShirtColors = [
    'White', 'Black', 'Light Gray', 'Dark Gray', 'Red', 'Maroon', 'Navy Blue', 'Royal Blue', 'Aqua Blue', 'Emerald Green', 'Golden Yellow', 'Slate Blue', 'Yellow', 'Orange', 'Dark Green', 'Green', 'Light Green', 'Pink', 'Fuchsia', 'Sky Blue', 'Oatmeal', 'Cream', 'Purple', 'Gold', 'Brown'
];

const productSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

const RecordsTableRow = React.memo(({
    lead,
    openLeadId,
    openCustomerDetails,
    isRepeat,
    getContactDisplay,
    toggleCustomerDetails,
    handleOpenEditLeadDialog,
    handleDeleteLead,
    setOpenLeadId,
    handleOpenUploadDialog,
}: {
    lead: EnrichedLead;
    openLeadId: string | null;
    openCustomerDetails: string | null;
    isRepeat: boolean;
    getContactDisplay: (lead: Lead) => string | null;
    toggleCustomerDetails: (id: string) => void;
    handleOpenEditLeadDialog: (lead: Lead) => void;
    handleDeleteLead: (id: string) => void;
    setOpenLeadId: React.Dispatch<React.SetStateAction<string | null>>;
    handleOpenUploadDialog: (lead: Lead) => void;
}) => {
    
    const imageCount = [
        lead.layouts?.[0]?.logoLeftImage,
        lead.layouts?.[0]?.logoRightImage,
        lead.layouts?.[0]?.backLogoImage,
        lead.layouts?.[0]?.backDesignImage,
    ].filter(Boolean).length;
    
    return (
        <TableRow>
            <TableCell className="text-xs align-middle text-center py-2 text-black">
              <Collapsible>
                <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-center cursor-pointer">
                        <ChevronDown className="h-4 w-4 mr-1 transition-transform [&[data-state=open]]:rotate-180" />
                        <div className='flex items-center'>
                            <span>{formatDateTime(lead.submissionDateTime).dateTime}</span>
                        </div>
                    </div>
                </CollapsibleTrigger>
                    <div className="text-gray-500 text-center">{formatDateTime(lead.submissionDateTime).dayOfWeek}</div>
                <CollapsibleContent className="pt-1 text-gray-500 text-xs">
                  <div className="text-center">
                    <span className='font-bold text-gray-600'>Last Modified:</span>
                    <div>{formatDateTime(lead.lastModified).dateTime}</div>
                    <div>{formatDateTime(lead.lastModified).dayOfWeek}{lead.lastModifiedBy ? ` (${lead.lastModifiedBy})` : ''}</div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">
              <div className="flex items-center justify-center">
                <Button variant="ghost" size="sm" onClick={() => toggleCustomerDetails(lead.id)} className="h-5 px-1 mr-1">
                  {openCustomerDetails === lead.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <div className='flex flex-col items-center'>
                  <span className="font-medium">{lead.customerName}</span>
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
                      {lead.companyName && lead.companyName !== '-' && <div>{lead.companyName}</div>}
                      {getContactDisplay(lead) && <div>{getContactDisplay(lead)}</div>}
                    </div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.salesRepresentative}</TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">
              <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                {lead.priorityType}
              </Badge>
            </TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.orderType}</TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.courier === '-' ? '' : lead.courier}</TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.grandTotal != null ? formatCurrency(lead.grandTotal) : '-'}</TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.paidAmount != null ? formatCurrency(lead.paidAmount) : '-'}</TableCell>
            <TableCell className="text-xs align-middle text-center py-2 font-bold text-destructive">{lead.balance != null ? formatCurrency(lead.balance) : '-'}</TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.paymentType}</TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.paymentType === 'COD' ? 'CASH' : (lead.modeOfPayment || '-')}</TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">
              <Button variant="secondary" size="sm" onClick={() => setOpenLeadId(openLeadId === lead.id ? null : lead.id)} className="h-8 px-2 text-black hover:bg-gray-200">
                View
                {openLeadId === lead.id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
              </Button>
            </TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">
              <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => handleOpenUploadDialog(lead)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
              </Button>
            </TableCell>
            <TableCell className="text-center align-middle py-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-600 hover:bg-gray-200" onClick={() => handleOpenEditLeadDialog(lead)}>
                <Edit className="h-5 w-5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-red-100">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the entire recorded orders.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteLead(lead.id)}>Delete Order</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
        </TableRow>
    );
});
RecordsTableRow.displayName = 'RecordsTableRow';


export function RecordsTable() {
  const firestore = useFirestore();
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const { toast } = useToast();

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading: areLeadsLoading, error: leadsError, refetch: refetchLeads } = useCollection<Lead>(leadsQuery, leadSchema);
  
  const inventoryQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'inventory')) : null, [firestore]);
  const { data: inventoryItems, isLoading: isInventoryLoading, error: inventoryError } = useCollection<InventoryItem>(inventoryQuery, inventoryItemSchema);

  const [uploadLead, setUploadLead] = useState<Lead | null>(null);
  const [logoLeftImage, setLogoLeftImage] = useState<string>('');
  const [logoRightImage, setLogoRightImage] = useState<string>('');
  const [backLogoImage, setBackLogoImage] = useState<string>('');
  const [backDesignImage, setBackDesignImage] = useState<string>('');
  const logoLeftImageUploadRef = useRef<HTMLInputElement>(null);
  const logoRightImageUploadRef = useRef<HTMLInputElement>(null);
  const backLogoImageUploadRef = useRef<HTMLInputElement>(null);
  const backDesignImageUploadRef = useRef<HTMLInputElement>(null);

  const isLoading = areLeadsLoading || isInventoryLoading;
  const error = leadsError || inventoryError;

  const salesRepresentatives = useMemo(() => {
    if (!leads) return [];
    return [...new Set(leads.map(lead => lead.salesRepresentative).filter(Boolean))].sort();
  }, [leads]);

  const [editingLead, setEditingLead] = useState<(Lead & EnrichedLead) | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [csrFilter, setCsrFilter] = useState('All');

  const processedLeads = useMemo(() => {
    if (!leads) return [];
  
    const customerOrderStats: { [key: string]: { orders: Lead[], totalQuantity: number } } = {};
  
    // First, group orders and calculate total quantities for each customer
    leads.forEach(lead => {
      const name = lead.customerName.toLowerCase();
      if (!customerOrderStats[name]) {
        customerOrderStats[name] = { orders: [], totalQuantity: 0 };
      }
      customerOrderStats[name].orders.push(lead);
      const orderQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
      customerOrderStats[name].totalQuantity += orderQuantity;
    });
  
    const enrichedLeads: EnrichedLead[] = [];
  
    // Now, create the enriched lead objects with order numbers
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

    return processedLeads.filter(lead => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ? 
        (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
        (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))) ||
        (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))))
        : true;
      
      const matchesCsr = csrFilter === 'All' || lead.salesRepresentative === csrFilter;

      return matchesSearch && matchesCsr;
    }).sort((a,b) => new Date(b.submissionDateTime).getTime() - new Date(a.submissionDateTime).getTime());
  }, [processedLeads, searchTerm, csrFilter]);

  const [openCustomerDetails, setOpenCustomerDetails] = useState<string | null>(null);

  const toggleCustomerDetails = useCallback((leadId: string) => {
    setOpenCustomerDetails(openCustomerDetails === leadId ? null : leadId);
  }, [openCustomerDetails]);

  useEffect(() => {
    if (!searchTerm) {
        setOpenCustomerDetails(null);
    }
  }, [searchTerm]);
  
  const handleOpenEditLeadDialog = useCallback((lead: Lead & EnrichedLead) => {
    setEditingLead(lead);
    setIsEditDialogOpen(true);
  }, []);

  const handleDeleteLead = useCallback(async (leadId: string) => {
    if(!leadId || !firestore) return;

    const leadDocRef = doc(firestore, 'leads', leadId);

    try {
      await deleteDoc(leadDocRef);
      toast({
        title: "Lead Deleted!",
        description: "The lead has been removed from the records.",
      });
    } catch (e: any) {
      console.error("Error deleting lead: ", e);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: e.message || "Could not delete the lead.",
      });
    }
  }, [firestore, toast]);

  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || null;
  }, []);

  const handleOpenUploadDialog = useCallback((lead: Lead) => {
      const layout = lead.layouts?.[0];
      setLogoLeftImage(layout?.logoLeftImage || '');
      setLogoRightImage(layout?.logoRightImage || '');
      setBackLogoImage(layout?.backLogoImage || '');
      setBackDesignImage(layout?.backDesignImage || '');
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

  const handleImagePaste = (e: React.ClipboardEvent<HTMLDivElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
      const items = e.clipboardData.items;
      for (const item of items) {
          if (item.type.includes('image')) {
              const blob = item.getAsFile();
              if (blob) {
                  const reader = new FileReader();
                  reader.onload = (readEvent) => {
                      setter(readEvent.target?.result as string);
                  };
                  reader.readAsDataURL(blob);
              }
          }
      }
  };

  const handleRemoveImage = (e: React.MouseEvent, setter: React.Dispatch<React.SetStateAction<string>>) => {
      e.stopPropagation();
      setter('');
  };

  const handleSaveImages = useCallback(async () => {
    if (!uploadLead || !firestore) return;

    const leadDocRef = doc(firestore, 'leads', uploadLead.id);
    const layouts = uploadLead.layouts?.length ? [...uploadLead.layouts] : [{}];
    
    const existingLayout = layouts[0] || {};
    const now = new Date().toISOString();

    const updatedFirstLayout = {
        ...existingLayout,
        logoLeftImage: logoLeftImage || null,
        logoLeftImageUploadTime: logoLeftImage ? (existingLayout.logoLeftImage === logoLeftImage ? existingLayout.logoLeftImageUploadTime : now) : null,
        logoRightImage: logoRightImage || null,
        logoRightImageUploadTime: logoRightImage ? (existingLayout.logoRightImage === logoRightImage ? existingLayout.logoRightImageUploadTime : now) : null,
        backLogoImage: backLogoImage || null,
        backLogoImageUploadTime: backLogoImage ? (existingLayout.backLogoImage === backLogoImage ? existingLayout.backLogoImageUploadTime : now) : null,
        backDesignImage: backDesignImage || null,
        backDesignImageUploadTime: backDesignImage ? (existingLayout.backDesignImage === backDesignImage ? existingLayout.backDesignImageUploadTime : now) : null,
    };

    layouts[0] = updatedFirstLayout;

    try {
        await updateDoc(leadDocRef, {
            layouts: layouts,
            lastModified: new Date().toISOString(),
        });

        toast({
            title: 'Images Saved!',
            description: 'The reference images have been saved.',
        });
        setUploadLead(null); // Close dialog
    } catch (e: any) {
        console.error("Error saving images: ", e);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: e.message || "Could not save the images.",
        });
    }
  }, [uploadLead, firestore, toast, logoLeftImage, logoRightImage, backLogoImage, backDesignImage]);


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
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-black">Recorded Orders</CardTitle>
              <CardDescription className="text-gray-600">
                Here are all the customer orders submitted through the form.
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
              <div className="w-full max-w-lg">
                <Input
                  placeholder="Search customer, company or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-100 text-black placeholder:text-gray-500"
                />
              </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
          <div className="border rounded-md relative">
            <Table>
                <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-white align-middle text-center">Date & Time</TableHead>
                    <TableHead className="text-white align-middle text-center">Customer</TableHead>
                    <TableHead className="text-white align-middle text-center">SCES</TableHead>
                    <TableHead className="text-white align-middle text-center">Priority</TableHead>
                    <TableHead className="text-white align-middle text-center">Order Type</TableHead>
                    <TableHead className="text-white align-middle text-center">Courier</TableHead>
                    <TableHead className="text-white align-middle text-center">Grand Total</TableHead>
                    <TableHead className="text-white align-middle text-center">Paid Amount</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">Balance</TableHead>
                    <TableHead className="text-white align-middle text-center">Payment Type</TableHead>
                    <TableHead className="text-white align-middle text-center">Mode of Payment</TableHead>
                    <TableHead className="text-white align-middle text-center">Items</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center whitespace-nowrap">Reference Image for Digitizing</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredLeads.map((lead) => {
                  const isRepeat = lead.orderNumber > 1;
                  return (
                    <React.Fragment key={lead.id}>
                        <RecordsTableRow 
                            lead={lead}
                            openLeadId={openLeadId}
                            openCustomerDetails={openCustomerDetails}
                            isRepeat={isRepeat}
                            getContactDisplay={getContactDisplay}
                            toggleCustomerDetails={toggleCustomerDetails}
                            handleOpenEditLeadDialog={() => handleOpenEditLeadDialog(lead)}
                            handleDeleteLead={handleDeleteLead}
                            setOpenLeadId={setOpenLeadId}
                            handleOpenUploadDialog={handleOpenUploadDialog}
                        />
                        {openLeadId === lead.id && (
                        <TableRow>
                            <TableCell colSpan={14} className="p-0">
                            <div className="p-4 max-w-xl mx-auto bg-blue-50 rounded-md my-2">
                                <h4 className="font-semibold text-black mb-2">Ordered Items</h4>
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead className="py-1 px-2 text-black font-bold">Product Type</TableHead>
                                    <TableHead className="py-1 px-2 text-black font-bold">Color</TableHead>
                                    <TableHead className="py-1 px-2 text-black font-bold">Size</TableHead>
                                    <TableHead className="py-1 px-2 text-black font-bold text-right">Quantity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lead.orders?.map((order: any, index: number) => (
                                    <TableRow key={order.id || index} className="border-0">
                                        <TableCell className="py-1 px-2 text-xs text-black">{order.productType}</TableCell>
                                        <TableCell className="py-1 px-2 text-xs text-black">{order.color}</TableCell>
                                        <TableCell className="py-1 px-2 text-xs text-black">{order.size}</TableCell>
                                        <TableCell className="py-1 px-2 text-xs text-black text-right align-middle">{order.quantity}</TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                    <TableCell colSpan={3} className="text-right font-bold text-black py-1 px-2">Total Quantity</TableCell>
                                    <TableCell className="font-bold text-black text-center py-1 px-2">{lead.orders?.reduce((sum, order) => sum + order.quantity, 0)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                                </Table>
                            </div>
                            </TableCell>
                        </TableRow>
                        )}
                    </React.Fragment>
                  )})}
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
                <div tabIndex={0} className="relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-48 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onPaste={(e) => handleImagePaste(e, setLogoLeftImage)} onDoubleClick={() => logoLeftImageUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                    {logoLeftImage ? (<> <Image src={logoLeftImage} alt="Logo Left" layout="fill" objectFit="contain" className="rounded-md" /> {logoLeftImage && <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-7 w-7" onClick={(e) => handleRemoveImage(e, setLogoLeftImage)}> <Trash2 className="h-4 w-4" /> </Button>} </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>Double-click to upload or paste image</p> </div>)}
                    <input type="file" accept="image/*" ref={logoLeftImageUploadRef} onChange={(e) => handleImageUpload(e, setLogoLeftImage)} className="hidden" />
                </div>
                </div>
                <div className="space-y-2">
                <Label>Logo Right</Label>
                <div tabIndex={0} className="relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-48 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onPaste={(e) => handleImagePaste(e, setLogoRightImage)} onDoubleClick={() => logoRightImageUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                    {logoRightImage ? (<> <Image src={logoRightImage} alt="Logo Right" layout="fill" objectFit="contain" className="rounded-md" /> {logoRightImage && <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-7 w-7" onClick={(e) => handleRemoveImage(e, setLogoRightImage)}> <Trash2 className="h-4 w-4" /> </Button>} </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>Double-click to upload or paste image</p> </div>)}
                    <input type="file" accept="image/*" ref={logoRightImageUploadRef} onChange={(e) => handleImageUpload(e, setLogoRightImage)} className="hidden" />
                </div>
                </div>
                <div className="space-y-2">
                <Label>Back Logo</Label>
                <div tabIndex={0} className="relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-48 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onPaste={(e) => handleImagePaste(e, setBackLogoImage)} onDoubleClick={() => backLogoImageUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                    {backLogoImage ? (<> <Image src={backLogoImage} alt="Back Logo" layout="fill" objectFit="contain" className="rounded-md" /> {backLogoImage && <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-7 w-7" onClick={(e) => handleRemoveImage(e, setBackLogoImage)}> <Trash2 className="h-4 w-4" /> </Button>} </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>Double-click to upload or paste image</p> </div>)}
                    <input type="file" accept="image/*" ref={backLogoImageUploadRef} onChange={(e) => handleImageUpload(e, setBackLogoImage)} className="hidden" />
                </div>
                </div>
                <div className="space-y-2">
                <Label>Back Design</Label>
                <div tabIndex={0} className="relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-48 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onPaste={(e) => handleImagePaste(e, setBackDesignImage)} onDoubleClick={() => backDesignImageUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                    {backDesignImage ? (<> <Image src={backDesignImage} alt="Back Design" layout="fill" objectFit="contain" className="rounded-md" /> {backDesignImage && <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-7 w-7" onClick={(e) => handleRemoveImage(e, setBackDesignImage)}> <Trash2 className="h-4 w-4" /> </Button>} </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>Double-click to upload or paste image</p> </div>)}
                    <input type="file" accept="image/*" ref={backDesignImageUploadRef} onChange={(e) => handleImageUpload(e, setBackDesignImage)} className="hidden" />
                </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleSaveImages} disabled={!logoLeftImage && !logoRightImage && !backLogoImage && !backDesignImage}>Save Images</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
      {editingLead && (
        <EditLeadFullDialog
          isOpen={isEditDialogOpen}
          onClose={() => { setEditingLead(null); setIsEditDialogOpen(false); }}
          lead={editingLead}
          onUpdate={refetchLeads}
        />
      )}
    </Card>
  );
}
