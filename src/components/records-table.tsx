'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, arrayUnion } from 'firebase/firestore';
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
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import React, { useState } from 'react';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, PlusCircle, Plus, Minus, Edit, Trash2 } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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


  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'), orderBy('submissionDateTime', 'desc'));
  }, [firestore, user]);

  const { data: leads, isLoading: isLeadsLoading, error } = useCollection(leadsQuery);

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
      
      // We are not using non-blocking updates here to give feedback to user.
      try {
        await updateDoc(leadDocRef, {
          orders: arrayUnion(newOrder)
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


  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-gray-500/10 text-black">
      <CardHeader>
        <CardTitle>Lead Records</CardTitle>
        <CardDescription>
          Here are all the lead entries submitted through the form.
        </CardDescription>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Contact No.</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>CSR</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Order Type</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads?.map((lead) => (
                  <Collapsible asChild key={lead.id} open={openLeadId === lead.id} onOpenChange={() => toggleLeadDetails(lead.id)}>
                    <React.Fragment>
                      <TableRow>
                          <TableCell className="text-sm align-middle py-2">
                            {new Date(lead.submissionDateTime).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm align-middle py-2">{lead.customerName}</TableCell>
                          <TableCell className="text-sm align-middle py-2">{lead.contactNumber}</TableCell>
                          <TableCell className="text-sm align-middle py-2">{lead.location}</TableCell>
                          <TableCell className="text-sm align-middle py-2">{lead.csr}</TableCell>
                          <TableCell className="align-middle py-2">
                            <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                              {lead.priorityType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm align-middle py-2">{lead.paymentType}</TableCell>
                          <TableCell className="text-sm align-middle py-2">{lead.orderType}</TableCell>
                          <TableCell className="text-center align-middle py-2">
                            <CollapsibleTrigger asChild>
                               <Button variant="ghost" size="sm">
                                View
                                {openLeadId === lead.id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell className="text-center align-middle py-2">
                              <Button variant="outline" size="sm" onClick={() => handleOpenAddOrderDialog(lead.id)}>
                                <PlusCircle className="h-4 w-4 mr-1" />
                                Add Order
                              </Button>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <tr className="bg-muted/50">
                            <TableCell colSpan={10} className="p-0">
                               <div className="p-4">
                                 <h4 className="font-semibold mb-2">Ordered Items</h4>
                                 <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="py-1">Product Type</TableHead>
                                      <TableHead className="py-1">Color</TableHead>
                                      <TableHead className="py-1">Size</TableHead>
                                      <TableHead className="py-1">Quantity</TableHead>
                                      <TableHead className="text-center py-1">Action</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {lead.orders?.map((order: any, index: number) => (
                                      <TableRow key={index}>
                                        <TableCell className="py-1">{order.productType}</TableCell>
                                        <TableCell className="py-1">{order.color}</TableCell>
                                        <TableCell className="py-1">{order.size}</TableCell>
                                        <TableCell className="py-1">{order.quantity}</TableCell>
                                        <TableCell className="text-center py-1">
                                          <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                             </TableCell>
                          </tr>
                        </CollapsibleContent>
                      </React.Fragment>
                  </Collapsible>
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
    </Card>
  );
}
