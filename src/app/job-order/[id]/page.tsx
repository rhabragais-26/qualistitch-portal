
'use client';

import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, updateDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Printer, Save, Upload, X, ChevronLeft, ChevronRight, Trash2, PlusCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useMemo, useState, ChangeEvent, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


type DesignDetails = {
  left?: boolean;
  right?: boolean;
  backLogo?: boolean;
  backText?: boolean;
};

type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
  remarks?: string;
  design?: DesignDetails;
};

type NamedOrder = {
  name: string;
  color: string;
  size: string;
  quantity: number;
  backText: string;
};

type Layout = {
  layoutImage?: string;
  dstLogoLeft?: string;
  dstLogoRight?: string;
  dstBackLogo?: string;
  dstBackText?: string;
  namedOrders?: NamedOrder[];
};

type Lead = {
  id: string;
  customerName: string;
  recipientName?: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  location: string;
  salesRepresentative: string;
  priorityType: 'Rush' | 'Regular';
  paymentType: string;
  orderType: string;
  orders: Order[];
  submissionDateTime: string;
  deliveryDate?: string;
  courier: string;
  joNumber?: number;
  layouts?: Layout[];
};

const courierOptions = ['J&T', 'Lalamove', 'LBC', 'Pick-up'];

export default function JobOrderPage() {
  const { id } = useParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: allLeads, isLoading: areAllLeadsLoading } = useCollection<Lead>(leadsQuery);

  const leadRef = useMemoFirebase(
    () => (firestore && id ? doc(firestore, 'leads', id as string) : null),
    [firestore, id]
  );

  const { data: fetchedLead, isLoading: isLeadLoading, error } = useDoc<Lead>(leadRef);
  const [lead, setLead] = useState<Lead | null>(null);
  const [joNumber, setJoNumber] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeleteLayoutConfirmDialog, setShowDeleteLayoutConfirmDialog] = useState(false);


  // Helper to compare lead states to check for unsaved changes
  const isDirty = useMemo(() => {
    if (!fetchedLead || !lead) return false;
    
    const originalDeliveryDate = fetchedLead.deliveryDate ? new Date(fetchedLead.deliveryDate).toISOString().split('T')[0] : null;
    const currentDeliveryDate = deliveryDate ? deliveryDate.toISOString().split('T')[0] : null;

    if (currentDeliveryDate !== originalDeliveryDate) return true;

    // Create copies to compare without modifying state
    const fetchedLeadForCompare = { ...fetchedLead };
    const leadForCompare = { ...lead };

    // Remove date objects for string comparison
    delete (fetchedLeadForCompare as any).deliveryDate;
    delete (leadForCompare as any).deliveryDate;

    return JSON.stringify(fetchedLeadForCompare) !== JSON.stringify({ ...fetchedLeadForCompare, ...leadForCompare });
  }, [fetchedLead, lead, deliveryDate]);

  useEffect(() => {
    if (fetchedLead) {
      const initializedOrders = fetchedLead.orders.map(order => ({
        ...order,
        remarks: order.remarks || '',
        design: order.design || { left: false, right: false, backLogo: false, backText: false }
      }));
      
      const initializedLayouts = (fetchedLead.layouts && fetchedLead.layouts.length > 0) 
        ? fetchedLead.layouts.map(layout => ({
            ...layout,
            namedOrders: (layout.namedOrders && layout.namedOrders.length > 0) ? layout.namedOrders : [{ name: '', color: '', size: '', quantity: 0, backText: '' }]
          }))
        : [{ 
            layoutImage: '', 
            dstLogoLeft: '', 
            dstLogoRight: '', 
            dstBackLogo: '', 
            dstBackText: '', 
            namedOrders: [{ name: '', color: '', size: '', quantity: 0, backText: '' }] 
          }];

      setLead({
        ...fetchedLead,
        recipientName: fetchedLead.recipientName || fetchedLead.customerName,
        orders: initializedOrders,
        courier: fetchedLead.courier || 'Pick-up',
        layouts: initializedLayouts,
      });

      if (fetchedLead.deliveryDate) {
        setDeliveryDate(new Date(fetchedLead.deliveryDate));
      } else {
        const calculatedDeliveryDate = addDays(new Date(fetchedLead.submissionDateTime), fetchedLead.priorityType === 'Rush' ? 7 : 22);
        setDeliveryDate(calculatedDeliveryDate);
      }
    }
  }, [fetchedLead]);

  useEffect(() => {
    if (lead && allLeads) {
      const currentYear = new Date().getFullYear().toString().slice(-2);
      if (lead.joNumber) {
        setJoNumber(`QSBP-${currentYear}-${lead.joNumber.toString().padStart(5, '0')}`);
      } else {
        // This part is for display only before saving. The actual number is set on save.
        const leadsThisYear = allLeads.filter(l => l.joNumber && new Date(l.submissionDateTime).getFullYear() === new Date().getFullYear());
        const maxJoNumber = leadsThisYear.reduce((max, l) => Math.max(max, l.joNumber || 0), 0);
        const newJoNum = maxJoNumber + 1;
        setJoNumber(`QSBP-${currentYear}-${newJoNum.toString().padStart(5, '0')}`);
      }
    }
  }, [lead, allLeads]);

   const handlePrint = () => {
    const printableArea = document.querySelector('.printable-area');
    if (printableArea) {
      const printWindow = window.open('', '', 'height=800,width=1200');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Print Job Order</title>');
        
        const styleSheets = Array.from(document.styleSheets);
        styleSheets.forEach(styleSheet => {
          try {
            if (styleSheet.href) {
              printWindow.document.write(`<link rel="stylesheet" href="${styleSheet.href}">`);
            } else if (styleSheet.cssRules) {
              const style = printWindow.document.createElement('style');
              style.textContent = Array.from(styleSheet.cssRules).map(rule => rule.cssText).join('\n');
              printWindow.document.head.appendChild(style);
            }
          } catch (e) {
            console.warn('Could not read stylesheet for printing:', e);
          }
        });

        printWindow.document.write('</head><body style="color: black !important;">');
        printWindow.document.write(printableArea.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500); 
      }
    }
  };
  
  const handleClose = () => {
    if (isDirty) {
      setShowConfirmDialog(true);
    } else {
      router.push('/job-order');
    }
  };
  
  const handleConfirmSave = async () => {
    await handleSaveChanges();
    setShowConfirmDialog(false);
    if (!error) { // Only close if save was successful
        router.push('/job-order');
    }
  };
  
  const handleConfirmDiscard = () => {
    setShowConfirmDialog(false);
    router.push('/job-order');
  };

  const handleCourierChange = (value: string) => {
    if (lead) {
      setLead({ ...lead, courier: value });
    }
  };
  
  const handleRecipientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (lead) {
      setLead({ ...lead, recipientName: e.target.value });
    }
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (lead) {
      setLead({ ...lead, location: e.target.value });
    }
  };

  const handleOrderChange = (index: number, field: keyof Order, value: any) => {
    if (lead) {
      const newOrders = [...lead.orders];
      (newOrders[index] as any)[field] = value;
      setLead({ ...lead, orders: newOrders });
    }
  };

  const handleDesignChange = (index: number, field: keyof DesignDetails, value: boolean) => {
     if (lead) {
      const newOrders = [...lead.orders];
      const currentOrder = newOrders[index];
      const newDesign = { ...(currentOrder.design || {}), [field]: value };
      (newOrders[index] as any).design = newDesign;
      setLead({ ...lead, orders: newOrders });
    }
  };

  const handleTextDetailChange = (layoutIndex: number, field: keyof Layout, value: string) => {
    if (lead?.layouts) {
      const newLayouts = [...lead.layouts];
      (newLayouts[layoutIndex] as any)[field] = value;
      setLead({ ...lead, layouts: newLayouts });
    }
  };

  const handleImagePaste = (event: React.ClipboardEvent<HTMLDivElement>, layoutIndex: number) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (lead?.layouts && e.target?.result) {
              const newLayouts = [...lead.layouts];
              newLayouts[layoutIndex].layoutImage = e.target.result as string;
              setLead({ ...lead, layouts: newLayouts });
            }
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>, layoutIndex: number) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (lead?.layouts && e.target?.result) {
          const newLayouts = [...lead.layouts];
          newLayouts[layoutIndex].layoutImage = e.target.result as string;
          setLead({ ...lead, layouts: newLayouts });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNamedOrderChange = (layoutIndex: number, nameIndex: number, field: keyof NamedOrder, value: string | number) => {
    if (lead?.layouts) {
      const newLayouts = [...lead.layouts];
      const namedOrders = newLayouts[layoutIndex].namedOrders || [];
      (namedOrders[nameIndex] as any)[field] = value;
      newLayouts[layoutIndex].namedOrders = namedOrders;
      setLead({ ...lead, layouts: newLayouts });
    }
  };

  const addNamedOrderRow = (layoutIndex: number) => {
    if (lead?.layouts) {
      const newLayouts = [...lead.layouts];
      const layout = newLayouts[layoutIndex];
      const newNamedOrders = [...(layout.namedOrders || []), { name: '', color: '', size: '', quantity: 0, backText: '' }];
      layout.namedOrders = newNamedOrders;
      setLead({ ...lead, layouts: newLayouts });
    }
  };

  const removeNamedOrderRow = (layoutIndex: number, nameIndex: number) => {
    if (lead?.layouts) {
      const newLayouts = [...lead.layouts];
      const namedOrders = newLayouts[layoutIndex].namedOrders || [];
      namedOrders.splice(nameIndex, 1);
      newLayouts[layoutIndex].namedOrders = namedOrders;
      setLead({ ...lead, layouts: newLayouts });
    }
  };

  const addLayoutPage = () => {
    if (lead) {
      const newLayout: Layout = {
        layoutImage: '',
        dstLogoLeft: '',
        dstLogoRight: '',
        dstBackLogo: '',
        dstBackText: '',
        namedOrders: [{ name: '', color: '', size: '', quantity: 0, backText: '' }]
      };
      const newLayouts = [...(lead.layouts || []), newLayout];
      setLead({ ...lead, layouts: newLayouts });
      setCurrentPage(1 + newLayouts.length);
    }
  };
  
  const deleteLayoutPage = () => {
    if (lead?.layouts && lead.layouts.length > 1) {
        setShowDeleteLayoutConfirmDialog(true);
    }
  };

  const handleConfirmDeleteLayout = () => {
    if (lead?.layouts && lead.layouts.length > 1) {
      const layoutIndexToRemove = currentPage - 2;
      if (layoutIndexToRemove >= 0 && layoutIndexToRemove < lead.layouts.length) {
        const newLayouts = [...lead.layouts];
        newLayouts.splice(layoutIndexToRemove, 1);
        setLead({ ...lead, layouts: newLayouts });
        
        // Adjust current page if necessary
        if (currentPage > 1 + newLayouts.length) {
          setCurrentPage(1 + newLayouts.length);
        } else if (currentPage > 1) {
            // If we are deleting a page before the current last one, we might need to stay or move back
            setCurrentPage(Math.max(1, currentPage - 1));
        }
      }
    }
    setShowDeleteLayoutConfirmDialog(false);
  };


  const handleSaveChanges = async () => {
    if (!lead || !leadRef || !allLeads) return;

    let newJoNumber: number | undefined = lead.joNumber;
    
    // Only generate a new JO number if it's a new job order (doesn't have one yet)
    if (!newJoNumber) {
        const leadsThisYear = allLeads.filter(l => l.joNumber && new Date(l.submissionDateTime).getFullYear() === new Date().getFullYear());
        const maxJoNumber = leadsThisYear.reduce((max, l) => Math.max(max, l.joNumber || 0), 0);
        newJoNumber = maxJoNumber + 1;
    }
    
    const dataToUpdate: Partial<Lead> = {
      joNumber: newJoNumber,
      courier: lead.courier || 'Pick-up',
      recipientName: lead.recipientName,
      location: lead.location,
      deliveryDate: deliveryDate ? deliveryDate.toISOString().split('T')[0] : null,
      orders: lead.orders.map(o => ({
        ...o, 
        remarks: o.remarks || '', 
        design: o.design || { left: false, right: false, backLogo: false, backText: false }
      })),
      lastModified: new Date().toISOString(),
      layouts: lead.layouts?.map(layout => ({
        ...layout,
        namedOrders: layout.namedOrders?.filter(n => n.name.trim() !== '' || n.color.trim() !== '' || n.size.trim() !== '' || n.backText.trim() !== '' || n.quantity > 0) || [],
      })) || [],
    };

    try {
      await updateDoc(leadRef, dataToUpdate as { [x: string]: any });
      toast({
        title: 'Job Order Saved!',
        description: 'Your changes have been saved successfully.',
      });
      // No navigation here, stays on the page after save.
    } catch (e: any) {
      console.error('Error saving job order:', e);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: e.message || 'Could not save the job order.',
      });
    }
  };

  if (isLeadLoading || areAllLeadsLoading || !lead) {
    return (
      <div className="p-10 bg-white">
        <div className="flex justify-center items-center gap-4 py-4">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-9 w-24" />
      </div>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-10">Error loading lead: {error.message}</div>;
  }

  if (!fetchedLead) {
    return <div className="p-10">Lead not found.</div>;
  }

  const totalQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
  const totalPages = 1 + (lead.layouts?.length || 0);

  const getContactDisplay = () => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || 'N/A';
  };

  return (
    <div className="bg-white text-black min-h-screen">
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to save your changes before closing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={handleConfirmDiscard}>Discard</Button>
            <AlertDialogAction onClick={handleConfirmSave} className="text-white font-bold">Save & Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteLayoutConfirmDialog} onOpenChange={setShowDeleteLayoutConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this layout page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteLayout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header className="fixed top-0 left-0 right-0 bg-white p-4 no-print shadow-md z-50">
        <div className="container mx-auto max-w-5xl flex justify-between items-center">
            <div className="flex-1 flex justify-start gap-2">
                 <Button onClick={addLayoutPage} variant="outline" size="sm">
                   <PlusCircle className="mr-2 h-4 w-4" />
                   Add Layout
                 </Button>
                 <Button 
                    onClick={deleteLayoutPage} 
                    variant="destructive" 
                    size="sm" 
                    disabled={!lead.layouts || lead.layouts.length <= 1 || currentPage === 1}
                    style={{ marginRight: '0.5in' }}
                 >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Layout
                </Button>
            </div>
            <div className="flex-1 flex justify-center items-center gap-2 min-w-[300px]">
                 <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ marginLeft: '0.5in' }}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                </Button>
                <span className="text-sm font-medium text-center whitespace-nowrap w-24">{`Page ${currentPage} of ${totalPages}`}</span>
                <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{ marginRight: '1in' }}
                >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
             <div className="flex-1 flex justify-end gap-2">
                <Button onClick={handleSaveChanges} className="text-white font-bold">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
                </Button>
                <Button onClick={handlePrint} className="text-white font-bold" disabled={!lead?.joNumber}>
                <Printer className="mr-2 h-4 w-4" />
                Print J.O.
                </Button>
                <Button onClick={handleClose} variant="outline">
                <X className="mr-2 h-4 w-4" />
                Close
                </Button>
            </div>
        </div>
      </header>
       
      <div className="pt-20 p-10 mx-auto max-w-4xl printable-area">
        {/* Page 1 */}
        <div className={cn(currentPage !== 1 && 'hidden print:block')}>
            <div className="text-left mb-4">
                <p className="font-bold"><span className="text-primary">J.O. No:</span> <span className="inline-block border-b border-black">{lead.joNumber ? joNumber : 'Not Saved'}</span></p>
            </div>
            <h1 className="text-2xl font-bold text-center mb-6 border-b-4 border-black pb-2">JOB ORDER FORM</h1>

            <div className="grid grid-cols-2 gap-x-8 text-sm mb-6 border-b border-black pb-4">
                <div className="space-y-2">
                    <p><strong>Client Name:</strong> {lead.customerName}</p>
                    <p><strong>Date of Transaction:</strong> {format(new Date(lead.submissionDateTime), 'MMMM d, yyyy')}</p>
                    <p><strong>Terms of Payment:</strong> {lead.paymentType}</p>
                     <div className="flex items-center gap-2">
                        <p><strong>Recipient's Name:</strong></p>
                        <Input
                            value={lead.recipientName}
                            onChange={handleRecipientNameChange}
                            className="h-8 text-xs flex-1 no-print"
                        />
                        <span className="print-only">{lead.recipientName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <strong className='flex-shrink-0'>Delivery Date:</strong>
                        <div className='w-full no-print'>
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal h-8 text-xs",
                                        !deliveryDate && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {deliveryDate ? format(deliveryDate, "MMMM dd, yyyy") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                    mode="single"
                                    selected={deliveryDate}
                                    onSelect={(date) => {
                                        setDeliveryDate(date);
                                        setIsCalendarOpen(false);
                                    }}
                                    initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <span className="print-only">{deliveryDate ? format(deliveryDate, 'MMMM dd, yyyy') : 'N/A'}</span>
                    </div>
                </div>
                <div className="space-y-2">
                    <p><strong>SCES Name:</strong> {lead.salesRepresentative}</p>
                    <p><strong>Type of Order:</strong> {lead.orderType}</p>
                    <div className="flex items-center gap-2">
                        <strong className='flex-shrink-0'>Courier:</strong>
                        <div className='w-full no-print'>
                        <Select value={lead.courier || 'Pick-up'} onValueChange={handleCourierChange}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {courierOptions.map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        </div>
                        <span className="print-only">{lead.courier}</span>
                    </div>
                    <p><strong>Contact No:</strong> {getContactDisplay()}</p>
                </div>
                <div className="col-span-2 mt-2 flex items-center gap-2">
                    <p><strong>Delivery Address:</strong></p>
                    <Input
                        value={lead.location}
                        onChange={handleLocationChange}
                        className="h-8 text-xs flex-1 no-print"
                    />
                    <span className="print-only">{lead.location}</span>
                </div>
            </div>

            <h2 className="text-xl font-bold text-center mb-4">ORDER DETAILS</h2>
            <table className="w-full border-collapse border border-black text-xs mb-2">
            <thead>
                <tr className="bg-gray-200">
                <th className="border border-black p-0.5" colSpan={3}>Item Description</th>
                <th className="border border-black p-0.5" rowSpan={2}>Qty</th>
                <th className="border border-black p-0.5" colSpan={2}>Front Design</th>
                <th className="border border-black p-0.5" colSpan={2}>Back Design</th>
                <th className="border border-black p-0.5" rowSpan={2}>Remarks</th>
                </tr>
                <tr className="bg-gray-200">
                <th className="border border-black p-0.5 font-medium">Type of Product</th>
                <th className="border border-black p-0.5 font-medium">Color</th>
                <th className="border border-black p-0.5 font-medium">Size</th>
                <th className="border border-black p-0.5 font-medium w-12">Left</th>
                <th className="border border-black p-0.5 font-medium w-12">Right</th>
                <th className="border border-black p-0.5 font-medium w-12">Logo</th>
                <th className="border border-black p-0.5 font-medium w-12">Text</th>
                </tr>
            </thead>
            <tbody>
                {lead.orders.map((order, index) => (
                <tr key={index}>
                    <td className="border border-black p-0.5">{order.productType}</td>
                    <td className="border border-black p-0.5">{order.color}</td>
                    <td className="border border-black p-0.5 text-center">{order.size}</td>
                    <td className="border border-black p-0.5 text-center">{order.quantity}</td>
                    <td className="border border-black p-0.5 text-center">
                        <Checkbox className="mx-auto" checked={order.design?.left || false} onCheckedChange={(checked) => handleDesignChange(index, 'left', !!checked)} />
                    </td>
                    <td className="border border-black p-0.5 text-center">
                    <Checkbox className="mx-auto" checked={order.design?.right || false} onCheckedChange={(checked) => handleDesignChange(index, 'right', !!checked)} />
                    </td>
                    <td className="border border-black p-0.5 text-center">
                    <Checkbox className="mx-auto" checked={order.design?.backLogo || false} onCheckedChange={(checked) => handleDesignChange(index, 'backLogo', !!checked)} />
                    </td>
                    <td className="border border-black p-0.5 text-center">
                    <Checkbox className="mx-auto" checked={order.design?.backText || false} onCheckedChange={(checked) => handleDesignChange(index, 'backText', !!checked)} />
                    </td>
                    <td className="border border-black p-0.5">
                    <div className="no-print">
                        <Textarea
                        value={order.remarks}
                        onChange={(e) => handleOrderChange(index, 'remarks', e.target.value)}
                        className="text-xs p-1 h-[30px]"
                        placeholder="Add remarks..."
                        />
                    </div>
                    <p className="print-only text-xs">{order.remarks}</p>
                    </td>
                </tr>
                ))}
                <tr>
                    <td colSpan={3} className="text-right font-bold p-0.5">TOTAL</td>
                    <td className="text-center font-bold p-0.5">{totalQuantity} PCS</td>
                    <td colSpan={5}></td>
                </tr>
            </tbody>
            </table>

            <div className="text-xs mb-2 pt-2">
                <p className="text-xs mb-2 italic"><strong>Note:</strong> Specific details for logo and back text on the next page</p>
            </div>

            <div className="grid grid-cols-2 gap-x-16 gap-y-4 text-xs mt-2">
                <div className="space-y-1">
                    <p className="font-bold italic">Prepared by:</p>
                    <p className="pt-8 border-b border-black text-center font-semibold">{lead.salesRepresentative.toUpperCase()}</p>
                    <p className="text-center font-bold">Customer Service Representative</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>
                <div className="space-y-1">
                    <p className="font-bold italic">Noted by:</p>
                    <p className="pt-8 border-b border-black text-center font-semibold">MYREZA BANAWON</p>
                    <p className="text-center font-bold">Sales Head</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>

                <div className="col-span-2 mt-0">
                    <p className="font-bold italic">Approved by:</p>
                </div>


                <div className="space-y-1">
                    <p className="pt-8 border-b border-black"></p>
                    <p className="text-center font-semibold">Programming</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>
                <div className="space-y-1">
                    <p className="pt-8 border-b border-black"></p>
                    <p className="text-center font-semibold">Inventory</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>
                <div className="space-y-1">
                    <p className="pt-8 border-b border-black"></p>
                    <p className="text-center font-semibold">Production Line Leader</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>
                <div className="space-y-1">
                    <p className="pt-8 border-b border-black"></p>
                    <p className="text-center font-semibold">Production Supervisor</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>
                <div className="space-y-1">
                    <p className="pt-8 border-b border-black"></p>
                    <p className="text-center font-semibold">Quality Control</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>
                <div className="space-y-1">
                    <p className="pt-8 border-b border-black"></p>
                    <p className="text-center font-semibold">Logistics</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>
                <div className="col-span-2 mx-auto w-1/2 space-y-1 pt-4">
                    <p className="pt-8 border-b border-black"></p>
                    <p className="text-center font-semibold">Operations Supervisor</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>
            </div>
        </div>

        {/* Layout Pages */}
        {lead.layouts?.map((layout, layoutIndex) => (
            <div key={layoutIndex} className={cn("page-break", currentPage !== 2 + layoutIndex && 'hidden print:block')}>
                <h1 className="text-2xl font-bold text-center my-6 border-b-4 border-black pb-2">LAYOUT {lead.layouts && lead.layouts.length > 1 ? `(${layoutIndex + 1})` : ''}</h1>
                
                <div 
                  className="border-2 border-dashed border-gray-400 rounded-lg p-4 text-center mb-6 no-print"
                  onPaste={(e) => handleImagePaste(e, layoutIndex)}
                  onClick={() => imageUploadRef.current?.click()}
                >
                  {layout.layoutImage ? (
                    <Image src={layout.layoutImage} alt="Layout" width={800} height={600} className="mx-auto max-h-[500px] w-auto" />
                  ) : (
                    <div className="text-gray-500">
                      <Upload className="mx-auto h-12 w-12" />
                      <p>Click to upload or paste image</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={imageUploadRef} 
                    onChange={(e) => handleImageUpload(e, layoutIndex)}
                    className="hidden" 
                  />
                </div>

                {layout.layoutImage && (
                    <div className="print-only text-center mb-6">
                        <Image src={layout.layoutImage} alt="Layout" width={800} height={600} className="mx-auto max-h-[500px] w-auto" />
                    </div>
                )}
                
                <table className="w-full border-collapse border border-black text-sm mb-6 bg-white">
                  <tbody className='bg-white'>
                    <tr>
                      <td className="border border-black p-2 w-1/2">
                        <p className="font-bold">DST LOGO LEFT:</p>
                        <div className="no-print">
                          <Textarea 
                            value={layout.dstLogoLeft} 
                            onChange={(e) => handleTextDetailChange(layoutIndex, 'dstLogoLeft', e.target.value)} 
                            className="text-xs mt-1 p-1 min-h-[50px]"
                            placeholder="Details for left logo..."
                          />
                        </div>
                        <p className="print-only text-xs whitespace-pre-wrap">{layout.dstLogoLeft}</p>
                      </td>
                      <td className="border border-black p-2 w-1/2">
                        <p className="font-bold">DST BACK LOGO:</p>
                        <div className="no-print">
                          <Textarea 
                            value={layout.dstBackLogo} 
                            onChange={(e) => handleTextDetailChange(layoutIndex, 'dstBackLogo', e.target.value)} 
                            className="text-xs mt-1 p-1 min-h-[50px]"
                            placeholder="Details for back logo..."
                          />
                        </div>
                        <p className="print-only text-xs whitespace-pre-wrap">{layout.dstBackLogo}</p>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 w-1/2">
                        <p className="font-bold">DST LOGO RIGHT:</p>
                        <div className="no-print">
                          <Textarea 
                            value={layout.dstLogoRight} 
                            onChange={(e) => handleTextDetailChange(layoutIndex, 'dstLogoRight', e.target.value)} 
                            className="text-xs mt-1 p-1 min-h-[50px]"
                            placeholder="Details for right logo..."
                          />
                        </div>
                        <p className="print-only text-xs whitespace-pre-wrap">{layout.dstLogoRight}</p>
                      </td>
                      <td className="border border-black p-2 w-1/2">
                        <p className="font-bold">DST BACK TEXT:</p>
                        <div className="no-print">
                          <Textarea 
                            value={layout.dstBackText} 
                            onChange={(e) => handleTextDetailChange(layoutIndex, 'dstBackText', e.target.value)} 
                            className="text-xs mt-1 p-1 min-h-[50px]"
                            placeholder="Details for back text..."
                          />
                        </div>
                        <p className="print-only text-xs whitespace-pre-wrap">{layout.dstBackText}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <h2 className="text-xl font-bold text-center mb-4">Names</h2>
                <Table className="text-xs">
                    <TableHeader>
                        <TableRow className="bg-white hover:bg-white">
                            <TableHead className="border border-black font-medium text-black">No.</TableHead>
                            <TableHead className="border border-black font-medium text-black">Names</TableHead>
                            <TableHead className="border border-black font-medium text-black">Color</TableHead>
                            <TableHead className="border border-black font-medium text-black">Sizes</TableHead>
                            <TableHead className="border border-black font-medium text-black">Qty</TableHead>
                            <TableHead className="border border-black font-medium text-black">BACK TEXT</TableHead>
                            <TableHead className="border border-black font-medium text-black no-print">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {layout.namedOrders?.map((namedOrder, nameIndex) => (
                            <TableRow key={nameIndex} className="bg-white hover:bg-white">
                                <TableCell className="border border-black p-0.5 text-center">{nameIndex + 1}</TableCell>
                                <TableCell className="border border-black p-0">
                                    <Input value={namedOrder.name} onChange={(e) => handleNamedOrderChange(layoutIndex, nameIndex, 'name', e.target.value)} className="h-full w-full border-0 rounded-none focus-visible:ring-0 text-xs text-black" />
                                </TableCell>
                                <TableCell className="border border-black p-0">
                                    <Input value={namedOrder.color} onChange={(e) => handleNamedOrderChange(layoutIndex, nameIndex, 'color', e.target.value)} className="h-full w-full border-0 rounded-none focus-visible:ring-0 text-xs text-black" />
                                </TableCell>
                                <TableCell className="border border-black p-0">
                                    <Input value={namedOrder.size} onChange={(e) => handleNamedOrderChange(layoutIndex, nameIndex, 'size', e.target.value)} className="h-full w-full border-0 rounded-none focus-visible:ring-0 text-xs text-black" />
                                </TableCell>
                                <TableCell className="border border-black p-0">
                                    <Input type="number" value={namedOrder.quantity} onChange={(e) => handleNamedOrderChange(layoutIndex, nameIndex, 'quantity', parseInt(e.target.value) || 0)} className="h-full w-full border-0 rounded-none focus-visible:ring-0 text-xs text-black text-center" />
                                </TableCell>
                                <TableCell className="border border-black p-0">
                                    <Input value={namedOrder.backText} onChange={(e) => handleNamedOrderChange(layoutIndex, nameIndex, 'backText', e.target.value)} className="h-full w-full border-0 rounded-none focus-visible:ring-0 text-xs text-black" />
                                </TableCell>
                                <TableCell className="border border-black p-0 text-center no-print">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeNamedOrderRow(layoutIndex, nameIndex)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="no-print mt-4">
                    <Button onClick={() => addNamedOrderRow(layoutIndex)} variant="outline">Add Name</Button>
                </div>
            </div>
        ))}

      </div>
      <style jsx global>{`
        @media print {
          body {
            background-color: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print, header, .no-print * {
            display: none !important;
          }
          .printable-area {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            color: black !important;
          }
          .printable-area * {
            color: black !important;
          }
          .print-only {
            display: block !important;
          }
          .bg-gray-200 {
            background-color: #e5e7eb !important;
          }
          .page-break {
            page-break-before: always;
          }
          @page {
            size: auto;
            margin: 0.5in;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>
    </div>
  );
}
