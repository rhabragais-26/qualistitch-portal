
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
import React, { useState, useMemo, useEffect } from 'react';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, PlusCircle, Plus, Minus, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { collection, query } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';

const productTypes = [
  'Executive Jacket 1',
  'Executive Jacket v2 (with lines)',
  'Turtle Neck Jacket',
  'Corporate Jacket',
  'Reversible v1',
  'Reversible v2',
  'Polo Shirt (Coolpass)',
  'Polo Shirt (Cotton Blend)',
  'Patches',
  'Client Owned',
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

const salesRepresentatives = ['Myreza', 'Quencess', 'Cath', 'Loise', 'Joanne', 'Thors', 'Francis', 'Junary', 'Kenneth'];
const paymentTypes = ['Partially Paid', 'Fully Paid', 'COD'];
const orderTypes = ['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services'];
const priorityTypes = ['Rush', 'Regular'];
const courierTypes = ['Lalamove', 'J&T', 'In-house', 'Pick-up'];


type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
}

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  location: string;
  salesRepresentative: string;
  priorityType: string;
  paymentType: string;
  orderType: string;
  courier: string;
  orders: Order[];
  submissionDateTime: string;
  lastModified: string;
}

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
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

  // State for editing a lead
  const [isEditLeadDialogOpen, setIsEditLeadDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // State for editing an order
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<{ leadId: string; order: Order; index: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [csrFilter, setCsrFilter] = useState('All');
  
  const filteredLeads = useMemo(() => {
    if (!leads) return [];

    return leads.filter(lead => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ? 
        (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
        (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))) ||
        (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))))
        : true;
      
      const matchesCsr = csrFilter === 'All' || lead.salesRepresentative === csrFilter;

      return matchesSearch && matchesCsr;
    });
  }, [leads, searchTerm, csrFilter]);

  const [openCustomerDetails, setOpenCustomerDetails] = useState<string | null>(null);

  const toggleCustomerDetails = (leadId: string) => {
    setOpenCustomerDetails(openCustomerDetails === leadId ? null : leadId);
  };

  useEffect(() => {
    if (!searchTerm) {
        setOpenCustomerDetails(null);
    }
  }, [searchTerm]);


  const handleOpenAddOrderDialog = (leadId: string) => {
    setSelectedLeadId(leadId);
    setIsOrderDialogOpen(true);
  };
  
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

  const resetAddOrderForm = () => {
    setNewOrderProductType('');
    setNewOrderColor('');
    setSizeQuantities(productSizes.map(size => ({ size, quantity: 0 })));
    setSelectedLeadId(null);
    setIsOrderDialogOpen(false);
  }

  const handleAddOrder = async () => {
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
  };

  const handleSizeQuantityChange = (index: number, change: number) => {
    setSizeQuantities(current =>
      current.map((item, i) =>
        i === index
          ? { ...item, quantity: Math.max(0, item.quantity + change) }
          : item
      )
    );
  };
  
  const handleSizeQuantityInputChange = (index: number, value: string) => {
    setSizeQuantities(current =>
      current.map((item, i) =>
        i === index
          ? { ...item, quantity: value === '' ? 0 : parseInt(value, 10) || 0 }
          : item
      )
    );
  };
  
  const handleOpenEditLeadDialog = (lead: Lead) => {
    setEditingLead(lead);
    setIsEditLeadDialogOpen(true);
  }

  const handleEditLead = async (updatedLead: Partial<Lead>) => {
    if (!editingLead || !firestore) return;

    const leadDocRef = doc(firestore, 'leads', editingLead.id);

    try {
      await updateDoc(leadDocRef, {
        ...updatedLead,
        lastModified: new Date().toISOString(),
      });
      toast({
        title: "Lead Updated!",
        description: "The lead details have been successfully updated.",
      });
      setIsEditLeadDialogOpen(false);
      setEditingLead(null);
    } catch (e: any) {
      console.error("Error updating lead: ", e);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: e.message || "Could not update the lead.",
      });
    }
  };

  const handleOpenEditDialog = (leadId: string, order: Order, index: number) => {
    setEditingOrder({ leadId, order, index });
    setIsEditDialogOpen(true);
  };
  
  const handleEditOrder = async (updatedOrder: Order) => {
    if (!editingOrder || !firestore) return;
  
    const { leadId, index } = editingOrder;
    const lead = leads?.find(l => l.id === leadId);
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
  };
  
  const handleDeleteOrder = async (leadId: string, orderIndex: number) => {
    if (!firestore) return;
    const lead = leads?.find(l => l.id === leadId);
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
  };

  const handleDeleteLead = async (leadId: string) => {
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
  }

  const getContactDisplay = (lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || null;
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
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-black">Lead Records</CardTitle>
              <CardDescription className="text-gray-600">
                Here are all the lead entries submitted through the form.
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={csrFilter} onValueChange={setCsrFilter}>
                <SelectTrigger className="w-[180px] bg-gray-100 text-black placeholder:text-gray-500">
                  <SelectValue placeholder="Filter by CSR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All CSRs</SelectItem>
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
                    <TableHead className="text-white align-middle">Date &amp; Time</TableHead>
                    <TableHead className="text-white align-middle">Last Modified</TableHead>
                    <TableHead className="text-white align-middle">Customer</TableHead>
                    <TableHead className="text-white align-middle">CSR</TableHead>
                    <TableHead className="text-center text-white align-middle">Priority</TableHead>
                    <TableHead className="text-center text-white align-middle">Payment</TableHead>
                    <TableHead className="text-center text-white align-middle">Order Type</TableHead>
                    <TableHead className="text-center text-white align-middle">Courier</TableHead>
                    <TableHead className="text-center text-white align-middle">Items</TableHead>
                    <TableHead className="text-center text-white align-middle">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredLeads.map((lead) => (
                  <React.Fragment key={lead.id}>
                    <TableRow>
                      <TableCell className="text-xs align-middle py-2 text-black">
                         <div>{formatDateTime(lead.submissionDateTime).dateTime}</div>
                         <div className="text-gray-500">{formatDateTime(lead.submissionDateTime).dayOfWeek}</div>
                      </TableCell>
                      <TableCell className="text-xs align-middle py-2 text-black">
                         <div>{formatDateTime(lead.lastModified).dateTime}</div>
                         <div className="text-gray-500">{formatDateTime(lead.lastModified).dayOfWeek}</div>
                      </TableCell>
                      <TableCell className="text-xs align-top py-2 text-black">
                        <div className="flex items-start">
                          <Button variant="ghost" size="sm" onClick={() => toggleCustomerDetails(lead.id)} className="h-5 px-1 mr-1">
                            {openCustomerDetails === lead.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          <div>
                            <div className="font-medium">{lead.customerName}</div>
                              {openCustomerDetails === lead.id && (
                                <div className="mt-1 space-y-0.5 text-gray-500">
                                  {lead.companyName && lead.companyName !== '-' && <div>{lead.companyName}</div>}
                                  {getContactDisplay(lead) && <div>{getContactDisplay(lead)}</div>}
                                </div>
                              )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs align-middle py-2 text-black">{lead.salesRepresentative}</TableCell>
                      <TableCell className="align-middle py-2 text-center">
                        <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                          {lead.priorityType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs align-middle py-2 text-black text-center">{lead.paymentType}</TableCell>
                      <TableCell className="text-xs align-middle py-2 text-black text-center">{lead.orderType}</TableCell>
                      <TableCell className="text-xs align-middle py-2 text-black text-center">{lead.courier === '-' ? '' : lead.courier}</TableCell>
                      <TableCell className="text-center align-middle py-2">
                        <Button variant="ghost" size="sm" onClick={() => setOpenLeadId(openLeadId === lead.id ? null : lead.id)} className="h-8 px-2 text-black hover:bg-gray-200">
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
                                  This action cannot be undone. This will permanently delete the entire lead record.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteLead(lead.id)}>Delete Lead</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </TableCell>
                    </TableRow>
                    {openLeadId === lead.id && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={13} className="p-0">
                           <div className="p-4">
                            <h4 className="font-semibold text-black mb-2">Ordered Items</h4>
                             <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="py-1 text-black">Product Type</TableHead>
                                  <TableHead className="py-1 text-black">Color</TableHead>
                                  <TableHead className="py-1 text-black">Size</TableHead>
                                  <TableHead className="py-1 text-black text-center">Quantity</TableHead>
                                  <TableHead className="text-right py-1 text-black pr-8">Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {lead.orders?.map((order: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell className="py-1 text-xs text-black">{order.productType}</TableCell>
                                    <TableCell className="py-1 text-xs text-black">{order.color}</TableCell>
                                    <TableCell className="py-1 text-xs text-black">{order.size}</TableCell>
                                    <TableCell className="py-1 text-xs text-black text-center">
                                      {order.quantity}
                                    </TableCell>
                                    <TableCell className="text-right py-1">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-gray-200" onClick={() => handleOpenEditDialog(lead.id, order, index)}>
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
                                  <TableCell colSpan={3} className="text-right font-bold text-black">Total Quantity</TableCell>
                                  <TableCell className="font-bold text-black text-center">{lead.orders?.reduce((sum, order) => sum + order.quantity, 0)}</TableCell>
                                  <TableCell className='text-right'>
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
                ))}
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
                      <div key={item.size} className="flex items-center justify-start gap-4">
                          {!isPatches && <Label className="text-sm font-bold w-12">{item.size}</Label>}
                          <div className={cn("flex items-center gap-2", isPatches && "w-full justify-center")}>
                              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleSizeQuantityChange(index, -1)}>
                                  <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                  type="text"
                                  value={item.quantity}
                                  onChange={(e) => handleSizeQuantityInputChange(index, e.target.value)}
                                  onBlur={(e) => { if (e.target.value === '') handleSizeQuantityInputChange(index, '0')}}
                                  className="w-14 text-center"
                              />
                              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleSizeQuantityChange(index, 1)}>
                                  <Plus className="h-4 w-4" />
                              </Button>
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
        <EditLeadDialog
          isOpen={isEditLeadDialogOpen}
          onOpenChange={setIsEditLeadDialogOpen}
          lead={editingLead}
          onSave={handleEditLead}
          onClose={() => setEditingLead(null)}
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

// Separate component for the Edit Lead Dialog
function EditLeadDialog({ isOpen, onOpenChange, lead, onSave, onClose }: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  lead: Lead;
  onSave: (updatedLead: Partial<Lead>) => void;
  onClose: () => void;
}) {
  const [customerName, setCustomerName] = useState(lead.customerName);
  const [companyName, setCompanyName] = useState(lead.companyName || '');
  const [contactNumber, setContactNumber] = useState(lead.contactNumber || '');
  const [landlineNumber, setLandlineNumber] = useState(lead.landlineNumber || '');
  const [location, setLocation] = useState(lead.location);
  const [salesRepresentative, setSalesRepresentative] = useState(lead.salesRepresentative);
  const [paymentType, setPaymentType] = useState(lead.paymentType);
  const [orderType, setOrderType] = useState(lead.orderType);
  const [priorityType, setPriorityType] = useState(lead.priorityType);
  const [courier, setCourier] = useState(lead.courier);
  const [error, setError] = useState<string | null>(null);

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  React.useEffect(() => {
    if (lead) {
      setCustomerName(lead.customerName);
      setCompanyName(lead.companyName || '');
      setContactNumber(lead.contactNumber || '');
      setLandlineNumber(lead.landlineNumber || '');
      setLocation(lead.location);
      setSalesRepresentative(lead.salesRepresentative);
      setPaymentType(lead.paymentType);
      setOrderType(lead.orderType);
      setPriorityType(lead.priorityType);
      setCourier(lead.courier);
    }
  }, [lead]);
  
  const handleMobileNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue.length <= 11) {
      let formattedValue = '';
      if (rawValue.length > 0) {
        formattedValue = rawValue.substring(0, 4);
      }
      if (rawValue.length > 4) {
        formattedValue += '-' + rawValue.substring(4, 7);
      }
      if (rawValue.length > 7) {
        formattedValue += '-' + rawValue.substring(7, 11);
      }
      setContactNumber(formattedValue);
    }
  };

  const handleLandlineNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue.length <= 10) {
      let formattedValue = '';
      if (rawValue.length > 0) {
        formattedValue = rawValue.substring(0, 2);
      }
      if (rawValue.length > 2) {
        formattedValue += '-' + rawValue.substring(2, 6);
      }
      if (rawValue.length > 6) {
        formattedValue += '-' + rawValue.substring(6, 10);
      }
      setLandlineNumber(formattedValue);
    }
  };


  const validateAndSave = () => {
    setError(null);

    const mobile = contactNumber.trim();
    const landline = landlineNumber.trim();
    
    if (mobile && mobile !== '-' && !/^\d{4}-\d{3}-\d{4}$/.test(mobile)) {
        setError("Mobile number must be in 0000-000-0000 format.");
        return;
    }
    if (landline && landline !== '-' && !/^\d{2}-\d{4}-\d{4}$/.test(landline)) {
        setError("Landline number must be in 00-0000-0000 format.");
        return;
    }

    const updatedLead: Partial<Lead> = {
      customerName: toTitleCase(customerName),
      companyName: companyName ? toTitleCase(companyName) : '-',
      contactNumber: mobile || '-',
      landlineNumber: landline || '-',
      location: toTitleCase(location),
      salesRepresentative,
      paymentType,
      orderType,
      priorityType,
      courier: courier || '-',
    };
    onSave(updatedLead);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Lead Details</DialogTitle>
          <DialogDescription>
            Update the details for the selected lead.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" value={companyName === '-' ? '' : companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
          </div>
           <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactNo">Mobile No. (Optional)</Label>
              <Input id="contactNo" value={contactNumber === '-' ? '' : contactNumber} onChange={handleMobileNoChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="landlineNo">Landline No. (Optional)</Label>
              <Input id="landlineNo" value={landlineNumber === '-' ? '' : landlineNumber} onChange={handleLandlineNoChange} />
            </div>
          </div>
          <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label htmlFor="courier">Courier (Optional)</Label>
              <Select onValueChange={setCourier} value={courier === '-' ? '' : courier}>
                <SelectTrigger id="courier"><SelectValue placeholder="Select Courier" /></SelectTrigger>
                <SelectContent>{courierTypes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salesRepresentative">CSR</Label>
              <Select onValueChange={setSalesRepresentative} value={salesRepresentative}>
                <SelectTrigger id="salesRepresentative"><SelectValue /></SelectTrigger>
                <SelectContent>{salesRepresentatives.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select onValueChange={setPaymentType} value={paymentType}>
                <SelectTrigger id="paymentType"><SelectValue /></SelectTrigger>
                <SelectContent>{paymentTypes.map(o => <SelectItem key={o} value={o}>{o === 'COD' ? 'COD (Cash on Delivery)' : o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label htmlFor="orderType">Order Type</Label>
              <Select onValueChange={setOrderType} value={orderType}>
                <SelectTrigger id="orderType"><SelectValue /></SelectTrigger>
                <SelectContent>{orderTypes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority Type</Label>
              <RadioGroup onValueChange={(v) => setPriorityType(v as 'Rush' | 'Regular')} value={priorityType} className="flex pt-2">
                {priorityTypes.map(o => <div key={o} className="flex items-center space-x-2"><RadioGroupItem value={o} id={`priority-${o}`}/><Label htmlFor={`priority-${o}`}>{o}</Label></div>)}
              </RadioGroup>
            </div>
          </div>
           {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
          <Button type="button" onClick={validateAndSave} className="text-white font-bold">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// Separate component for the Edit Order Dialog
function EditOrderDialog({ isOpen, onOpenChange, order, onSave, onClose }: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  order: Order;
  onSave: (updatedOrder: Order) => void;
  onClose: () => void;
}) {
  const [productType, setProductType] = useState(order.productType);
  const [color, setColor] = useState(order.color);
  const [size, setSize] = useState(order.size);
  const [quantity, setQuantity] = useState<number | string>(order.quantity);

  const isPolo = productType.includes('Polo Shirt');
  const availableColors = isPolo ? poloShirtColors : jacketColors;

  React.useEffect(() => {
    setProductType(order.productType);
    setColor(order.color);
    setSize(order.size);
    setQuantity(order.quantity);
  }, [order]);
  
  useEffect(() => {
    if (!availableColors.includes(color)) {
        setColor('');
    }
  }, [productType, availableColors, color]);

  const handleSave = () => {
    const numQuantity = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;
    if (productType && color && size && numQuantity > 0) {
      onSave({ productType, color, size, quantity: numQuantity });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
          <DialogDescription>
            Update the details for the selected order.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-product-type">Product Type:</Label>
            <Select onValueChange={setProductType} value={productType}>
              <SelectTrigger id="edit-product-type">
                <SelectValue placeholder="Select a Product Type" />
              </SelectTrigger>
              <SelectContent>
                {productTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className="flex items-center gap-2">
              <Label htmlFor="edit-color" className='text-sm'>Color:</Label>              <Select onValueChange={setColor} value={color} disabled={productType === 'Patches'}>
                <SelectTrigger id="edit-color">
                  <SelectValue placeholder="Select a Color" />
                </SelectTrigger>
                <SelectContent>
                  {availableColors.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="edit-size" className='text-sm'>Size:</Label>
              <Select onValueChange={setSize} value={size} disabled={productType === 'Patches'}>
                <SelectTrigger id="edit-size" className="w-[100px]">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  {productSizes.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <Label htmlFor="edit-quantity">Quantity:</Label>
            <Button type="button" variant="outline" size="icon" onClick={() => setQuantity(q => Math.max(0, (typeof q === 'string' ? parseInt(q, 10) || 0 : q) - 1))} disabled={quantity === 0}>
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id="edit-quantity"
              type="text"
              value={quantity}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^[0-9\b]+$/.test(value)) {
                  setQuantity(value === '' ? '' : parseInt(value, 10));
                }
              }}
              onBlur={(e) => {
                if (e.target.value === '') {
                  setQuantity(0);
                }
              }}
              className="w-16 text-center"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => setQuantity(q => (typeof q === 'string' ? parseInt(q, 10) || 0 : q) + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={!productType || !color || !size || quantity === 0} className="text-white font-bold">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
