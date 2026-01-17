

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
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, PlusCircle, Edit, Trash2 } from 'lucide-react';
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
import { z } from 'zod';
import { EditOrderDialog } from './edit-order-dialog';
import { EditLeadFullDialog } from './edit-lead-full-dialog';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
};

const orderSchema = z.object({
  productType: z.string(),
  color: z.string(),
  size: z.string(),
  quantity: z.number(),
  embroidery: z.enum(['logo', 'logoAndText', 'name']).optional(),
  pricePerPatch: z.number().optional(),
});
export type Order = z.infer<typeof orderSchema>;

const leadSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  companyName: z.string().optional(),
  contactNumber: z.string(),
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
  courier: z.string(),
  orders: z.array(orderSchema),
  submissionDateTime: z.string(),
  lastModified: z.string(),
  grandTotal: z.number().optional(),
  paidAmount: z.number().optional(),
  modeOfPayment: z.string().optional(),
  balance: z.number().optional(),
  addOns: z.any().optional(),
  discounts: z.any().optional(),
  payments: z.any().optional(),
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
    setOpenLeadId
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
                    <div className="pl-5 text-gray-500 text-left">{formatDateTime(lead.submissionDateTime).dayOfWeek}</div>
                <CollapsibleContent className="pt-1 pl-6 text-gray-500 text-xs text-left">
                    <span className='font-bold text-gray-600'>Last Modified:</span>
                    <div>{formatDateTime(lead.lastModified).dateTime}</div>
                    <div>{formatDateTime(lead.lastModified).dayOfWeek}</div>
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
                    <div className="mt-1 space-y-0.5 text-gray-500 text-[11px] font-normal">
                    {lead.companyName && lead.companyName !== '-' && <div>{lead.companyName}</div>}
                    {getContactDisplay(lead) && <div>{getContactDisplay(lead)}</div>}
                    </div>
                )}
                </div>
            </div>
            </TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.salesRepresentative}</TableCell>
            <TableCell className="align-middle py-2 text-center">
            <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                {lead.priorityType}
            </Badge>
            </TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.orderType}</TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.courier === '-' ? '' : lead.courier}</TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.grandTotal != null ? formatCurrency(lead.grandTotal) : '-'}</TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.paidAmount != null ? formatCurrency(lead.paidAmount) : '-'}</TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.modeOfPayment || '-'}</TableCell>
            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.balance != null ? formatCurrency(lead.balance) : '-'}</TableCell>
            <TableCell className="text-center align-middle py-2">
            <Button variant="secondary" size="sm" onClick={() => setOpenLeadId(openLeadId === lead.id ? null : lead.id)} className="h-8 px-2 text-black hover:bg-gray-200">
                View
                {openLeadId === lead.id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </Button>
            </TableCell>
            <TableCell className="text-center align-middle py-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-gray-200" onClick={() => handleOpenEditLeadDialog(lead)}>
                <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-100">
                    <Trash2 className="h-4 w-4" />
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
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [newOrderProductType, setNewOrderProductType] = useState('');
  const [newOrderColor, setNewOrderColor] = useState('');
  const [sizeQuantities, setSizeQuantities] = useState(
    productSizes.map(size => ({ size, quantity: 0 }))
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const { toast } = useToast();

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading: areLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery, leadSchema);
  
  const inventoryQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'inventory')) : null, [firestore]);
  const { data: inventoryItems, isLoading: isInventoryLoading, error: inventoryError } = useCollection<InventoryItem>(inventoryQuery, inventoryItemSchema);

  const isLoading = areLeadsLoading || isInventoryLoading;
  const error = leadsError || inventoryError;

  const salesRepresentatives = useMemo(() => {
    if (!leads) return [];
    return [...new Set(leads.map(lead => lead.salesRepresentative).filter(Boolean))].sort();
  }, [leads]);

  const [editingLead, setEditingLead] = useState<(Lead & EnrichedLead) | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<{ leadId: string; order: Order; index: number } | null>(null);
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


  const handleOpenAddOrderDialog = useCallback((leadId: string) => {
    setSelectedLeadId(leadId);
    setIsOrderDialogOpen(true);
  }, []);
  
  const isPolo = newOrderProductType.includes('Polo Shirt');
  const isPatches = newOrderProductType === 'Patches';
  const availableColors = isPolo ? poloShirtColors : jacketColors;
  
  useEffect(() => {
     if (isPatches) {
      setNewOrderColor('N/A');
    } else if (!availableColors.includes(newOrderColor)) {
        setNewOrderColor('');
    }
  }, [newOrderProductType, isPatches, availableColors, newOrderColor]);

  useEffect(() => {
    if (isPatches) {
     setSizeQuantities([{ size: 'N/A', quantity: 0 }]);
   } else {
     setSizeQuantities(productSizes.map(size => ({ size, quantity: 0 })));
   }
 }, [isPatches]);

  const resetAddOrderForm = useCallback(() => {
    setNewOrderProductType('');
    setNewOrderColor('');
    setSizeQuantities(productSizes.map(size => ({ size, quantity: 0 })));
    setSelectedLeadId(null);
    setIsOrderDialogOpen(false);
  }, []);

  const handleAddOrder = useCallback(async () => {
    if (!selectedLeadId || !firestore) return;

    const isProductPatches = newOrderProductType === 'Patches';
    const color = isProductPatches ? 'N/A' : newOrderColor;
    let ordersAddedCount = 0;
    const newOrders: Order[] = [];

    if (newOrderProductType && color) {
        sizeQuantities.forEach(item => {
            if (item.quantity > 0) {
                newOrders.push({
                    productType: newOrderProductType,
                    color: color,
                    size: isProductPatches ? 'N/A' : item.size,
                    quantity: item.quantity,
                });
                ordersAddedCount++;
            }
        });
    }

    if (ordersAddedCount > 0) {
        const leadDocRef = doc(firestore, 'leads', selectedLeadId);
        try {
            const updatePromises = newOrders.map(order => 
                updateDoc(leadDocRef, {
                    orders: arrayUnion(order)
                })
            );
            await Promise.all(updatePromises);
            
            await updateDoc(leadDocRef, {
                lastModified: new Date().toISOString(),
            });

            toast({
                title: `${ordersAddedCount} Order(s) Added!`,
                description: 'The new orders have been added to the lead.',
            });
            resetAddOrderForm();
        } catch (e: any) {
            console.error("Error adding orders: ", e);
            toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: e.message || "Could not add the new orders.",
            });
        }
    } else {
        toast({
            variant: 'destructive',
            title: 'No Orders to Add',
            description: 'Please enter a quantity for at least one size.',
        });
    }
  }, [selectedLeadId, firestore, newOrderProductType, newOrderColor, sizeQuantities, toast, resetAddOrderForm]);
  
  const handleOpenEditLeadDialog = useCallback((lead: Lead & EnrichedLead) => {
    setEditingLead(lead);
  }, []);

  const handleEditOrder = useCallback(async (updatedOrder: Order) => {
    if (!editingOrder || !firestore || !leads) return;
  
    const { leadId, index } = editingOrder;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
  
    const updatedOrders = [...lead.orders];
    updatedOrders[index] = updatedOrder;
  
    const leadDocRef = doc(firestore, 'leads', leadId);
  
    try {
      await updateDoc(leadDocRef, { 
        orders: updatedOrders,
        lastModified: new Date().toISOString(),
      });
      toast({
        title: "Order Updated!",
        description: "The order has been successfully updated.",
      });
      setIsEditDialogOpen(false);
      setEditingOrder(null);
    } catch (e: any) {
      console.error("Error updating order: ", e);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: e.message || "Could not update the order.",
      });
    }
  }, [editingOrder, firestore, leads, toast]);
  
  const handleDeleteOrder = useCallback(async (leadId: string, orderIndex: number) => {
    if (!firestore || !leads) return;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
  
    const orderToDelete = lead.orders[orderIndex];
    
    const leadDocRef = doc(firestore, 'leads', leadId);
  
    try {
      await updateDoc(leadDocRef, { 
        orders: arrayRemove(orderToDelete),
        lastModified: new Date().toISOString(),
      });
      toast({
        title: "Order Deleted!",
        description: "The order has been removed from the lead.",
      });
    } catch (e: any) {
      console.error("Error deleting order: ", e);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: e.message- "Could not delete the order.",
      });
    }
  }, [firestore, leads, toast]);

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
                    <TableHead className="text-center text-white align-middle">Priority</TableHead>
                    <TableHead className="text-center text-white align-middle">Order Type</TableHead>
                    <TableHead className="text-center text-white align-middle">Courier</TableHead>
                    <TableHead className="text-center text-white align-middle">Grand Total</TableHead>
                    <TableHead className="text-center text-white align-middle">Paid Amount</TableHead>
                    <TableHead className="text-center text-white align-middle">Mode of Payment</TableHead>
                    <TableHead className="text-center text-white align-middle">Balance</TableHead>
                    <TableHead className="text-center text-white align-middle">Items</TableHead>
                    <TableHead className="text-center text-white align-middle">Actions</TableHead>
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
                            handleOpenEditLeadDialog={handleOpenEditLeadDialog}
                            handleDeleteLead={handleDeleteLead}
                            setOpenLeadId={setOpenLeadId}
                        />
                        {openLeadId === lead.id && (
                        <TableRow className="bg-gray-50">
                            <TableCell colSpan={12} className="p-2">
                            <div className="p-2">
                                <h4 className="font-semibold text-black mb-2">Ordered Items</h4>
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead className="py-1 px-2 text-black font-bold">Product Type</TableHead>
                                    <TableHead className="py-1 px-2 text-black font-bold">Color</TableHead>
                                    <TableHead className="py-1 px-2 text-black font-bold">Size</TableHead>
                                    <TableHead className="py-1 px-2 text-black font-bold text-center">Quantity</TableHead>
                                    <TableHead className="text-right py-1 px-2 text-black pr-8">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lead.orders?.map((order: any, index: number) => (
                                    <TableRow key={index} className="border-0">
                                        <TableCell className="py-1 px-2 text-xs text-black">{order.productType}</TableCell>
                                        <TableCell className="py-1 px-2 text-xs text-black">{order.color}</TableCell>
                                        <TableCell className="py-1 px-2 text-xs text-black">{order.size}</TableCell>
                                        <TableCell className="py-1 px-2 text-xs text-black text-center align-middle">{order.quantity}</TableCell>
                                        <TableCell className="text-right py-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-gray-200" onClick={() => setIsEditDialogOpen(true)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-100">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the ordered item.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteOrder(lead.id, index)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                    <TableCell colSpan={3} className="text-right font-bold text-black py-1 px-2">Total Quantity</TableCell>
                                    <TableCell className="font-bold text-black text-center py-1 px-2">{lead.orders?.reduce((sum, order) => sum + order.quantity, 0)}</TableCell>
                                    <TableCell className='text-right py-1 px-2'>
                                        <Button variant="outline" size="sm" onClick={() => handleOpenAddOrderDialog(lead.id)}>
                                        <PlusCircle className="h-4 w-4 mr-1" />
                                        Add Order
                                        </Button>
                                    </TableCell>
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
       <Dialog open={isOrderDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
            resetAddOrderForm();
          }
          setIsOrderDialogOpen(isOpen);
        }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Order Details</DialogTitle>
            <DialogDescription>Select product details to add</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Product Type:</Label>
              <Select onValueChange={setNewOrderProductType} value={newOrderProductType}>
                <SelectTrigger><SelectValue placeholder="Select a Product Type" /></SelectTrigger>
                <SelectContent>{productTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className='flex items-center gap-2'>
              <Label>Color:</Label>
              <Select onValueChange={setNewOrderColor} value={newOrderColor} disabled={isPatches}>
                <SelectTrigger><SelectValue placeholder="Select a Color" /></SelectTrigger>
                <SelectContent>{availableColors.map((color) => (<SelectItem key={color} value={color}>{color}</SelectItem>))}</SelectContent>
              </Select>
            </div>
             <div className="space-y-4">
              {!isPatches && <Label>Size Quantities</Label>}
               <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {sizeQuantities.map((item, index) => (
                      <div key={item.size} className="flex items-center justify-between">
                          {!isPatches && <Label className="text-sm font-bold">{item.size}</Label>}
                          <div className={cn("flex items-center gap-2", isPatches && "w-full justify-center")}>
                              <p>Remaining Stocks: </p>
                          </div>
                      </div>
                  ))}
               </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
             <Button 
              type="button" 
              onClick={handleAddOrder} 
              disabled={!newOrderProductType || (!isPatches && !newOrderColor) || sizeQuantities.every(sq => sq.quantity === 0)}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {editingLead && (
        <EditLeadFullDialog
          isOpen={!!editingLead}
          onClose={() => setEditingLead(null)}
          lead={editingLead}
        />
      )}
      {editingOrder && (
        <EditOrderDialog 
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          order={editingOrder.order}
          onSave={handleEditOrder}
          onClose={() => setEditingOrder(null)}
        />
      )}
    </Card>
  );
}
