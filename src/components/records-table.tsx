'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
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
import { Skeleton } from './ui/skeleton';
import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, PlusCircle, Plus, Minus, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';


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

const productColors = [
  'Black',
  'Brown',

  'Dark Khaki',
  'Light Khaki',
  'Olive Green',
  'Navy Blue',
  'Light Gray',
  'Dark Gray',
  'Khaki',
  'Black/Khaki',
  'Black/Navy Blue',
  'Army Green',
  'Polo Color',
]

const productSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

const salesRepresentatives = ['Myreza', 'Quencess', 'Cath', 'Loise', 'Joanne', 'Thors', 'Francis', 'Junary', 'Kenneth'];
const paymentTypes = ['Partially Paid', 'Fully Paid', 'COD'];
const orderTypes = ['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services'];
const priorityTypes = ['Rush', 'Regular'];


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
  location: string;
  salesRepresentative: string;
  priorityType: string;
  paymentType: string;
  orderType: string;
  orders: Order[];
  submissionDateTime: string;
  lastModified: string;
}

export function RecordsTable() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [newOrderProductType, setNewOrderProductType] = useState('');
  const [newOrderColor, setNewOrderColor] = useState('');
  const [newOrderSize, setNewOrderSize] = useState('');
  const [newOrderQuantity, setNewOrderQuantity] = useState<number | string>(0);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const { toast } = useToast();

  // State for editing a lead
  const [isEditLeadDialogOpen, setIsEditLeadDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // State for editing an order
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<{ leadId: string; order: Order; index: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'), orderBy('submissionDateTime', 'desc'));
  }, [firestore, user]);

  const { data: leads, isLoading: isLeadsLoading, error } = useCollection<Lead>(leadsQuery);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (!searchTerm) return leads;

    return leads.filter(lead =>
      lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contactNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leads, searchTerm]);

  const isLoading = isAuthLoading || isLeadsLoading;

  const toggleLeadDetails = (leadId: string) => {
    setOpenLeadId(openLeadId === leadId ? null : leadId);
  };

  const handleOpenAddOrderDialog = (leadId: string) => {
    setSelectedLeadId(leadId);
    setIsOrderDialogOpen(true);
  };

  const resetAddOrderForm = () => {
    setNewOrderProductType('');
    setNewOrderColor('');
    setNewOrderSize('');
    setNewOrderQuantity(0);
    setSelectedLeadId(null);
    setIsOrderDialogOpen(false);
  }

  const handleAddOrder = async () => {
    if (!selectedLeadId) return;

    const quantity = typeof newOrderQuantity === 'string' ? parseInt(newOrderQuantity, 10) : newOrderQuantity;
    if (newOrderProductType && newOrderColor && newOrderSize && quantity > 0) {
      const newOrder = {
        productType: newOrderProductType,
        color: newOrderColor,
        size: newOrderSize,
        quantity: quantity
      };

      const leadDocRef = doc(firestore, 'leads', selectedLeadId);
      
      try {
        await updateDoc(leadDocRef, {
          orders: arrayUnion(newOrder),
          lastModified: new Date().toISOString(),
        });
        toast({
          title: 'Order Added!',
          description: 'The new order has been added to the lead.',
        });
        resetAddOrderForm();
      } catch (e: any) {
        console.error("Error adding order: ", e);
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: e.message || "Could not add the new order.",
        });
      }
    }
  };
  
  const handleOpenEditLeadDialog = (lead: Lead) => {
    setEditingLead(lead);
    setIsEditLeadDialogOpen(true);
  }

  const handleEditLead = async (updatedLead: Partial<Lead>) => {
    if (!editingLead) return;

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
    if (!editingOrder) return;
  
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
        description: e.message || "Could not delete the order.",
      });
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if(!leadId) return;

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

  const formatDateTime = (isoString: string) => {
    if (!isoString) return { dateTime: '-', dayOfWeek: '-' };
    const date = new Date(isoString);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeek = days[date.getDay()];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    return {
      dateTime: `${month}-${day}-${year} ${strTime}`,
      dayOfWeek: dayOfWeek,
    }
  };

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-card-foreground">Lead Records</CardTitle>
              <CardDescription>
                Here are all the lead entries submitted through the form.
              </CardDescription>
            </div>
             <div className="w-full max-w-sm">
              <Input
                placeholder="Search by customer name or contact no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {error && (
          <div className="text-red-500">
            Error loading records: {error.message}
          </div>
        )}
        {!isLoading && !error && (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-card-foreground">Date &amp; Time</TableHead>
                  <TableHead className="text-card-foreground">Last Modified</TableHead>
                  <TableHead className="text-card-foreground">Customer Name</TableHead>
                  <TableHead className="text-card-foreground">Company Name</TableHead>
                  <TableHead className="text-card-foreground">Contact No.</TableHead>
                  <TableHead className="text-card-foreground">Location</TableHead>
                  <TableHead className="text-card-foreground">CSR</TableHead>
                  <TableHead className="text-card-foreground">Priority</TableHead>
                  <TableHead className="text-card-foreground">Payment</TableHead>
                  <TableHead className="text-card-foreground">Order Type</TableHead>
                  <TableHead className="text-center text-card-foreground">Items</TableHead>
                  <TableHead className="text-center text-card-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {filteredLeads.map((lead) => (
                <React.Fragment key={lead.id}>
                  <TableRow>
                    <TableCell className="text-xs align-middle py-2 text-card-foreground">
                       <div>{formatDateTime(lead.submissionDateTime).dateTime}</div>
                       <div className="text-muted-foreground">{formatDateTime(lead.submissionDateTime).dayOfWeek}</div>
                    </TableCell>
                    <TableCell className="text-xs align-middle py-2 text-card-foreground">
                       <div>{formatDateTime(lead.lastModified).dateTime}</div>
                       <div className="text-muted-foreground">{formatDateTime(lead.lastModified).dayOfWeek}</div>
                    </TableCell>
                    <TableCell className="text-xs align-middle py-2 text-card-foreground">{lead.customerName}</TableCell>
                    <TableCell className="text-xs align-middle py-2 text-card-foreground">{lead.companyName || '-'}</TableCell>
                    <TableCell className="text-xs align-middle py-2 text-card-foreground">{lead.contactNumber}</TableCell>
                    <TableCell className="text-xs align-middle py-2 text-card-foreground">{lead.location}</TableCell>
                    <TableCell className="text-xs align-middle py-2 text-card-foreground">{lead.salesRepresentative}</TableCell>
                    <TableCell className="align-middle py-2">
                      <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                        {lead.priorityType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs align-middle py-2 text-card-foreground">{lead.paymentType}</TableCell>
                    <TableCell className="text-xs align-middle py-2 text-card-foreground">{lead.orderType}</TableCell>
                    <TableCell className="text-center align-middle py-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleLeadDetails(lead.id)} className="h-8 px-2">
                        View
                        {openLeadId === lead.id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center align-middle py-2">
                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditLeadDialog(lead)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                         <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
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
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={12} className="p-0">
                         <div className="p-4">
                          <h4 className="font-semibold text-card-foreground mb-2">Ordered Items</h4>
                           <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="py-1 text-card-foreground">Product Type</TableHead>
                                <TableHead className="py-1 text-card-foreground">Color</TableHead>
                                <TableHead className="py-1 text-card-foreground">Size</TableHead>
                                <TableHead className="py-1 text-card-foreground">Quantity</TableHead>
                                <TableHead className="text-right py-1 text-card-foreground pr-8">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {lead.orders?.map((order: any, index: number) => (
                                <TableRow key={index}>
                                  <TableCell className="py-1 text-xs text-card-foreground">{order.productType}</TableCell>
                                  <TableCell className="py-1 text-xs text-card-foreground">{order.color}</TableCell>
                                  <TableCell className="py-1 text-xs text-card-foreground">{order.size}</TableCell>
                                  <TableCell className="py-1 text-xs text-card-foreground">{order.quantity}</TableCell>
                                  <TableCell className="text-right py-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(lead.id, order, index)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                     <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
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
                                <TableCell colSpan={4} className="text-right font-bold text-card-foreground">Total Quantity</TableCell>
                                <TableCell className="font-bold text-card-foreground">{lead.orders?.reduce((sum, order) => sum + order.quantity, 0)}</TableCell>
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
        )}
      </CardContent>
       <Dialog open={isOrderDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
            resetAddOrderForm();
          }
          setIsOrderDialogOpen(isOpen);
        }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Order</DialogTitle>
            <DialogDescription>
              Select product details to add to the existing lead.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product-type">Product Type:</Label>
              <Select onValueChange={setNewOrderProductType} value={newOrderProductType}>
                <SelectTrigger id="product-type">
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
                <Label htmlFor="color" className='text-sm'>Color:</Label>
                <Select onValueChange={setNewOrderColor} value={newOrderColor}>
                  <SelectTrigger id="color">
                    <SelectValue placeholder="Select a Color" />
                  </SelectTrigger>
                  <SelectContent>
                    {productColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="size" className='text-sm'>Size:</Label>
                <Select onValueChange={setNewOrderSize} value={newOrderSize}>
                  <SelectTrigger id="size" className="w-[100px]">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    {productSizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
              <div className="flex items-center gap-2 justify-center">
              <Label htmlFor="quantity">Quantity:</Label>
              <Button type="button" variant="outline" size="icon" onClick={() => setNewOrderQuantity(q => Math.max(0, (typeof q === 'string' ? parseInt(q, 10) || 0 : q) - 1))} disabled={newOrderQuantity === 0}>
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="quantity"
                type="text"
                value={newOrderQuantity}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^[0-9\b]+$/.test(value)) {
                    setNewOrderQuantity(value === '' ? '' : parseInt(value, 10));
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setNewOrderQuantity(0);
                  }
                }}
                className="w-16 text-center"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setNewOrderQuantity(q => (typeof q === 'string' ? parseInt(q, 10) || 0 : q) + 1)}>
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
            <Button type="button" onClick={handleAddOrder} disabled={!newOrderProductType || !newOrderColor || !newOrderSize || newOrderQuantity === 0}>
              Add Order
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
  const [contactNumber, setContactNumber] = useState(lead.contactNumber);
  const [location, setLocation] = useState(lead.location);
  const [salesRepresentative, setSalesRepresentative] = useState(lead.salesRepresentative);
  const [paymentType, setPaymentType] = useState(lead.paymentType);
  const [orderType, setOrderType] = useState(lead.orderType);
  const [priorityType, setPriorityType] = useState(lead.priorityType);

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
      setContactNumber(lead.contactNumber);
      setLocation(lead.location);
      setSalesRepresentative(lead.salesRepresentative);
      setPaymentType(lead.paymentType);
      setOrderType(lead.orderType);
      setPriorityType(lead.priorityType);
    }
  }, [lead]);

  const handleSave = () => {
    const updatedLead: Partial<Lead> = {
      customerName: toTitleCase(customerName),
      companyName: companyName ? toTitleCase(companyName) : '-',
      contactNumber,
      location: toTitleCase(location),
      salesRepresentative,
      paymentType,
      orderType,
      priorityType,
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
              <Label htmlFor="contactNo">Contact No.</Label>
              <Input id="contactNo" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salesRepresentative">CSR</Label>
              <Select onValueChange={setSalesRepresentative} value={salesRepresentative}>
                <SelectTrigger id="salesRepresentative"><SelectValue /></SelectTrigger>
                <SelectContent>{salesRepresentatives.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select onValueChange={setPaymentType} value={paymentType}>
                <SelectTrigger id="paymentType"><SelectValue /></SelectTrigger>
                <SelectContent>{paymentTypes.map(o => <SelectItem key={o} value={o}>{o === 'COD' ? 'COD (Cash on Delivery)' : o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="orderType">Order Type</Label>
            <Select onValueChange={setOrderType} value={orderType}>
              <SelectTrigger id="orderType"><SelectValue /></SelectTrigger>
              <SelectContent>{orderTypes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority Type</Label>
              <RadioGroup onValueChange={(v) => setPriorityType(v as 'Rush' | 'Regular')} value={priorityType} className="flex pt-2">
                {priorityTypes.map(o => <div key={o} className="flex items-center space-x-2"><RadioGroupItem value={o} id={`priority-${o}`}/><Label htmlFor={`priority-${o}`}>{o}</Label></div>)}
              </RadioGroup>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
          <Button type="button" onClick={handleSave}>Save Changes</Button>
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

  React.useEffect(() => {
    setProductType(order.productType);
    setColor(order.color);
    setSize(order.size);
    setQuantity(order.quantity);
  }, [order]);

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
              <Label htmlFor="edit-color" className='text-sm'>Color:</Label>              <Select onValueChange={setColor} value={color}>
                <SelectTrigger id="edit-color">
                  <SelectValue placeholder="Select a Color" />
                </SelectTrigger>
                <SelectContent>
                  {productColors.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="edit-size" className='text-sm'>Size:</Label>
              <Select onValueChange={setSize} value={size}>
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
          <Button type="button" onClick={handleSave} disabled={!productType || !color || !size || quantity === 0}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
