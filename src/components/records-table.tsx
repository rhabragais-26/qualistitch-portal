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
import { ChevronDown, ChevronUp, PlusCircle, Edit, Trash2, Calendar as CalendarIcon } from 'lucide-react';
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
import Link from 'next/link';

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
  shipmentStatus: z.string().optional(),
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
    isReadOnly,
    getContactDisplay,
    toggleCustomerDetails,
    handleOpenEditLeadDialog,
    handleDeleteLead,
    setOpenLeadId,
}: {
    lead: EnrichedLead;
    openLeadId: string | null;
    openCustomerDetails: string | null;
    isRepeat: boolean;
    isReadOnly: boolean;
    getContactDisplay: (lead: Lead) => string | null;
    toggleCustomerDetails: (id: string) => void;
    handleOpenEditLeadDialog: (lead: Lead) => void;
    handleDeleteLead: (id: string) => void;
    setOpenLeadId: React.Dispatch<React.SetStateAction<string | null>>;
}) => {
    
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
                <CollapsibleContent className="pt-1 text-gray-500 text-xs text-center">
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
            <TableCell className={cn("text-xs align-middle text-center py-2", lead.balance === 0 ? "font-bold text-green-700" : "text-black")}>{lead.grandTotal != null ? formatCurrency(lead.grandTotal) : '-'}</TableCell>
            <TableCell className={cn("text-xs align-middle text-center py-2", lead.paidAmount == null || lead.paidAmount === 0 ? "text-muted-foreground" : "text-black")}>
              {lead.paidAmount != null ? formatCurrency(lead.paidAmount) : '-'}
            </TableCell>
            <TableCell className={cn("text-xs align-middle text-center py-2 font-bold", lead.balance === 0 ? "text-muted-foreground" : "text-destructive")}>{lead.balance != null ? formatCurrency(lead.balance) : '-'}</TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.paymentType}</TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.paymentType === 'COD' ? 'CASH' : (lead.modeOfPayment || '-')}</TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">
              <Button variant="secondary" size="sm" onClick={() => setOpenLeadId(openLeadId === lead.id ? null : lead.id)} className="h-8 px-2 text-black hover:bg-gray-200">
                View
                {openLeadId === lead.id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
              </Button>
            </TableCell>
            <TableCell className="text-center align-middle py-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-600 hover:bg-gray-200" onClick={() => handleOpenEditLeadDialog(lead)} disabled={isReadOnly}>
                <Edit className="h-5 w-5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-red-100" disabled={isReadOnly}>
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


export function RecordsTable({ isReadOnly, filterType }: { isReadOnly: boolean; filterType?: 'COMPLETED' | 'ONGOING' }) {
  const firestore = useFirestore();
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const { toast } = useToast();

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading: areLeadsLoading, error: leadsError, refetch: refetchLeads } = useCollection<Lead>(leadsQuery, leadSchema, { listen: false });
  
  const inventoryQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'inventory')) : null, [firestore]);
  const { data: inventoryItems, isLoading: isInventoryLoading, error: inventoryError } = useCollection<InventoryItem>(inventoryQuery, inventoryItemSchema, { listen: false });

  const isLoading = areLeadsLoading || isInventoryLoading;
  const error = leadsError || inventoryError;

  const salesRepresentatives = useMemo(() => {
    if (!leads) return [];
    return [...new Set(leads.map(lead => lead.salesRepresentative).filter(Boolean))].sort();
  }, [leads]);

  const availableYears = useMemo(() => {
    if (!leads) return [];
    const years = new Set(leads.map(lead => new Date(lead.submissionDateTime).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [leads]);

  const months = useMemo(() => [
    { value: 'All', label: 'All Months' }, { value: '1', label: 'January' },
    { value: '2', label: 'February' }, { value: '3', label: 'March' },
    { value: '4', label: 'April' }, { value: '5', label: 'May' },
    { value: '6', label: 'June' }, { value: '7', label: 'July' },
    { value: '8', label: 'August' }, { value: '9', label: 'September' },
    { value: '10', label: 'October' }, { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ], []);

  const [editingLead, setEditingLead] = useState<(Lead & EnrichedLead) | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [csrFilter, setCsrFilter] = useState('All');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  
  const getOverallStatus = useCallback((lead: Lead): { text: string; variant: "destructive" | "success" | "warning" | "secondary" } => {
    if (lead.shipmentStatus === 'Shipped' || lead.shipmentStatus === 'Delivered') {
        return { text: 'COMPLETED', variant: 'success' };
    }
    if (!lead.joNumber) {
        return { text: 'PENDING', variant: 'secondary' };
    }
    return { text: 'ONGOING', variant: 'warning' };
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
      
      const submissionDate = new Date(lead.submissionDateTime);
      const matchesYear = selectedYear === 'All' || submissionDate.getFullYear().toString() === selectedYear;
      const matchesMonth = selectedMonth === 'All' || (submissionDate.getMonth() + 1).toString() === selectedMonth;

      const overallStatus = getOverallStatus(lead).text;
      let matchesStatus = true;
      if (filterType === 'COMPLETED') {
        matchesStatus = overallStatus === 'COMPLETED';
      } else if (filterType === 'ONGOING') {
        matchesStatus = overallStatus === 'ONGOING' || overallStatus === 'PENDING';
      }


      return matchesSearch && matchesCsr && matchesYear && matchesMonth && matchesStatus;
    }).sort((a,b) => new Date(b.submissionDateTime).getTime() - new Date(a.submissionDateTime).getTime());
  }, [processedLeads, searchTerm, csrFilter, selectedYear, selectedMonth, filterType, getOverallStatus]);

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
      refetchLeads();
    } catch (e: any) {
      console.error("Error deleting lead: ", e);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: e.message || "Could not delete the lead.",
      });
    }
  }, [firestore, toast, refetchLeads]);

  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || null;
  }, []);

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
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-black">
                {filterType === 'COMPLETED' ? 'Completed Orders' : 'Ongoing Orders'}
              </CardTitle>
              <CardDescription className="text-gray-600">
                 {filterType === 'COMPLETED' ? 'Here are all the completed customer orders.' : 'Here are all the ongoing and pending customer orders.'}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-4 flex-wrap justify-end">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Filter by Year/Month:</span>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-[120px] bg-gray-100 text-black placeholder:text-gray-500">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Years</SelectItem>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-[180px] bg-gray-100 text-black placeholder:text-gray-500">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map(month => (
                          <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Filter by SCES:</span>
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
                </div>
                <div className="flex-1 min-w-[300px]">
                  <Input
                    placeholder="Search customer, company or contact..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-100 text-black placeholder:text-gray-500"
                  />
                </div>
              </div>
               {filterType === 'COMPLETED' ? (
                <Link href="/records" className="text-sm text-primary hover:underline">
                    View Ongoing Orders
                </Link>
              ) : (
                <Link href="/records/completed" className="text-sm text-primary hover:underline">
                    View Completed Orders
                </Link>
              )}
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
                            isReadOnly={isReadOnly}
                            getContactDisplay={getContactDisplay}
                            toggleCustomerDetails={toggleCustomerDetails}
                            handleOpenEditLeadDialog={() => handleOpenEditLeadDialog(lead)}
                            handleDeleteLead={handleDeleteLead}
                            setOpenLeadId={setOpenLeadId}
                        />
                        {openLeadId === lead.id && (
                        <TableRow>
                            <TableCell colSpan={13} className="p-0">
                            <div className="p-4 max-w-xl mx-auto bg-blue-50 rounded-md my-2">
                                <h4 className="font-semibold text-black mb-2 text-center">Ordered Items</h4>
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead className="py-1 px-2 text-black font-bold text-center align-middle">Product Type</TableHead>
                                    <TableHead className="py-1 px-2 text-black font-bold text-center align-middle">Color</TableHead>
                                    <TableHead className="py-1 px-2 text-black font-bold text-center align-middle">Size</TableHead>
                                    <TableHead className="py-1 px-2 text-black font-bold text-center align-middle">Quantity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lead.orders?.map((order: any, index: number) => (
                                    <TableRow key={order.id || index} className="border-0">
                                        <TableCell className="py-1 px-2 text-xs text-black text-center align-middle">{order.productType}</TableCell>
                                        <TableCell className="py-1 px-2 text-xs text-black text-center align-middle">{order.color}</TableCell>
                                        <TableCell className="py-1 px-2 text-xs text-black text-center align-middle">{order.size}</TableCell>
                                        <TableCell className="py-1 px-2 text-xs text-black text-center align-middle">{order.quantity}</TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                                {lead.orders && lead.orders.length > 1 && (
                                  <TableFooter>
                                      <TableRow>
                                      <TableCell colSpan={3} className="text-right font-bold text-black pt-1 px-2">Total Quantity</TableCell>
                                      <TableCell className="font-bold text-black text-center pt-1 px-2">{lead.orders?.reduce((sum, order) => sum + order.quantity, 0)}</TableCell>
                                      </TableRow>
                                  </TableFooter>
                                )}
                                </Table>
                            </div>
                            </TableCell>
                        </TableRow>
                        )}
                    </React.Fragment>
                  );
                })}
                </TableBody>
            </Table>
          </div>
      </CardContent>
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
