'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TriangleAlert, Upload, Trash2, User, Building, Phone, Hash, CalendarDays, Inbox, PlusCircle, Minus, X, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, setDoc, updateDoc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { addDays, format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { cn } from '@/lib/utils';
import { Label } from './ui/label';

type LeadOrder = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
}

type Lead = {
  id: string;
  joNumber?: number;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  submissionDateTime: string;
  priorityType: 'Rush' | 'Regular';
  orders: LeadOrder[];
};

type CaseItem = {
    id: string;
    productType: string;
    color: string;
    size: string;
    quantity: number;
};

type OperationalCase = {
  id: string;
  joNumber: string;
  caseType: string;
  remarks: string;
  image?: string;
  submissionDateTime: string;
  customerName: string;
  contactNumber?: string;
  landlineNumber?: string;
  caseItems: CaseItem[];
  quantity?: number;
  isArchived?: boolean;
  isDeleted?: boolean;
};

const formSchema = z.object({
  joNumber: z.string().min(1, { message: 'J.O. Number is required.' }),
  caseType: z.enum(['Return to Sender (RTS)', 'Quality Errors', 'Replacement'], {
    required_error: "Case Type is required",
    invalid_type_error: "Case Type is required",
  }),
  quantity: z.number().min(1, 'A total quantity of at least 1 is required.'),
  remarks: z.string().min(10, { message: 'Remarks must be at least 10 characters.' }),
  image: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type OperationalCasesFormProps = {
  editingCase: OperationalCase | null;
  onCancelEdit: () => void;
  onSaveComplete: () => void;
}

export function OperationalCasesForm({ editingCase, onCancelEdit, onSaveComplete }: OperationalCasesFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const [joInput, setJoInput] = useState('');
  const [foundLead, setFoundLead] = useState<Lead | null>(null);
  const [joSuggestions, setJoSuggestions] = useState<Lead[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [caseItems, setCaseItems] = useState<CaseItem[]>([]);

  const leadsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'leads')) : null),
    [firestore]
  );
  const { data: allLeads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      joNumber: '',
      caseType: undefined,
      quantity: 0,
      remarks: '',
      image: '',
    },
  });
  
  const { control, handleSubmit, reset, setValue, watch, trigger } = form;
  const imageValue = watch('image');

  const isEditing = !!editingCase;

  useEffect(() => {
    if (editingCase && allLeads) {
      const leadForCase = allLeads.find(l => l.joNumber && formatJoNumber(l.joNumber) === editingCase.joNumber);
      setFoundLead(leadForCase || null);
      setJoInput(editingCase.joNumber);
      setCaseItems(editingCase.caseItems || []);
      const totalQuantity = editingCase.caseItems?.reduce((sum, item) => sum + item.quantity, 0) || editingCase.quantity || 0;
      setValue('joNumber', editingCase.joNumber);
      setValue('caseType', editingCase.caseType as any);
      setValue('quantity', totalQuantity);
      setValue('remarks', editingCase.remarks);
      setValue('image', editingCase.image || '');
    } else {
      handleFormReset();
    }
  }, [editingCase, allLeads, setValue]);

  useEffect(() => {
    const totalQuantity = caseItems.reduce((sum, item) => sum + item.quantity, 0);
    setValue('quantity', totalQuantity);
  }, [caseItems, setValue]);


  const formatJoNumber = (joNumber: number) => {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  };

  useEffect(() => {
    if (!allLeads || !joInput || !showSuggestions || isEditing) {
      setJoSuggestions([]);
      return;
    }

    const searchInput = joInput.toLowerCase().replace(/[^0-9]/g, '');
    
    if(searchInput.length > 0) {
        const matchedLeads = allLeads.filter(lead => 
            lead.joNumber && 
            (lead.joNumber.toString().padStart(5, '0').includes(searchInput) ||
             formatJoNumber(lead.joNumber).toLowerCase().includes(joInput.toLowerCase()))
        );
        setJoSuggestions(matchedLeads);
    } else {
        setJoSuggestions([]);
    }

  }, [joInput, allLeads, showSuggestions, isEditing]);
  
  const handleSuggestionClick = (lead: Lead) => {
    setFoundLead(lead);
    const fullJoNumber = formatJoNumber(lead.joNumber!);
    setJoInput(fullJoNumber);
    setValue('joNumber', fullJoNumber, { shouldValidate: true });
    setShowSuggestions(false);
  };


  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setValue('image', result, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImagePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (e.target?.result) {
                        setValue('image', e.target.result as string, { shouldValidate: true });
                    }
                };
                reader.readAsDataURL(blob);
            }
        }
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue('image', '', { shouldValidate: true });
    if(imageUploadRef.current) {
        imageUploadRef.current.value = '';
    }
  };
  
  const handleFormReset = () => {
    reset({
        joNumber: '',
        caseType: undefined,
        quantity: 0,
        remarks: '',
        image: '',
    });
    setJoInput('');
    setFoundLead(null);
    setJoSuggestions([]);
    setShowSuggestions(true);
    setCaseItems([]);
    if(imageUploadRef.current) {
        imageUploadRef.current.value = '';
    }
    onCancelEdit();
  };

  async function onSubmit(values: FormValues) {
    if (!firestore) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Firestore is not available. Please try again later.'
        });
        return;
    }

    // Manually trigger validation for the quantity field
    const isValid = await trigger();
    if (!isValid) {
      return;
    }
    
    try {
        const submissionData = {
          joNumber: values.joNumber,
          caseType: values.caseType,
          remarks: values.remarks,
          image: values.image,
          quantity: values.quantity,
          caseItems: caseItems,
        }

        if (isEditing && editingCase) {
            // Update existing case
            const caseDocRef = doc(firestore, 'operationalCases', editingCase.id);
            await updateDoc(caseDocRef, { ...submissionData, lastModified: new Date().toISOString() });
            handleFormReset();
            onSaveComplete();
        } else {
            // Create new case
            const caseId = uuidv4();
            const operationalCasesRef = collection(firestore, 'operationalCases');
            const caseDocRef = doc(operationalCasesRef, caseId);
            
            const fullData = {
                id: caseId,
                ...submissionData,
                customerName: foundLead?.customerName,
                companyName: foundLead?.companyName,
                contactNumber: foundLead?.contactNumber || '',
                landlineNumber: foundLead?.landlineNumber || '',
                submissionDateTime: new Date().toISOString(),
            };

            await setDoc(caseDocRef, fullData);
            
            toast({
              title: 'Case Recorded!',
              description: `The ${values.caseType} case for J.O. ${values.joNumber} has been successfully recorded.`,
            });
            handleFormReset();
        }

    } catch (e: any) {
        console.error("Error saving operational case: ", e);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: e.message || "Could not save the operational case.",
        });
    }
  }
  
  const getContactDisplay = () => {
    if (!foundLead) return '';
    const mobile = foundLead.contactNumber && foundLead.contactNumber !== '-' ? foundLead.contactNumber.replace(/-/g, '') : null;
    const landline = foundLead.landlineNumber && foundLead.landlineNumber !== '-' ? foundLead.landlineNumber.replace(/-/g, '') : null;
    if (mobile && landline) return `${mobile} / ${landline}`;
    return mobile || landline || '';
  };
  
  const getExpectedDeliveryDate = () => {
    if (!foundLead) return '';
    const submissionDate = new Date(foundLead.submissionDateTime);
    const deadlineDays = foundLead.priorityType === 'Rush' ? 7 : 22;
    const deliveryDate = addDays(submissionDate, deadlineDays);
    return format(deliveryDate, 'MMM dd, yyyy');
  };

  const handleCaseItemsChange = (items: CaseItem[]) => {
    setCaseItems(items);
    setIsQuantityDialogOpen(false);
  }


  return (
    <>
    <Card className="w-full max-w-2xl shadow-xl animate-in fade-in-50 duration-500 bg-white text-black">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-black">{isEditing ? 'Edit Operational Case' : 'Record Operational Case'}</CardTitle>
        <CardDescription className="text-gray-600">
           {isEditing ? 'Update the details for the selected case.' : 'Document issues like RTS, quality errors, or replacements.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={control}
                    name="joNumber"
                    render={({ field }) => (
                        <FormItem className="relative">
                        <FormLabel className="flex items-center gap-2 text-black">
                            <Hash className="h-4 w-4 text-primary" /> J.O. Number
                        </FormLabel>
                        <FormControl>
                            <Input
                                placeholder="Search J.O. number..."
                                value={joInput}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                onChange={(e) => {
                                    setJoInput(e.target.value);
                                    if(foundLead) setFoundLead(null);
                                    setValue('joNumber', '');
                                    setShowSuggestions(true);
                                }}
                                autoComplete='off'
                                disabled={isEditing}
                            />
                        </FormControl>
                        {showSuggestions && joSuggestions.length > 0 && (
                            <Card className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                                <CardContent className="p-2 max-h-60 overflow-y-auto">
                                {joSuggestions.map((lead) => (
                                    <div
                                        key={lead.id}
                                        className="p-2 cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSuggestionClick(lead)}
                                    >
                                    {formatJoNumber(lead.joNumber!)} - {lead.customerName}
                                    </div>
                                ))}
                                </CardContent>
                            </Card>
                        )}
                        <FormMessage />
                        </FormItem>
                    )}
                 />

                <FormField
                  control={control}
                  name="caseType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-black">
                        <TriangleAlert className="h-4 w-4 text-primary" /> Case Type
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a Case Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Return to Sender (RTS)">Return to Sender (RTS)</SelectItem>
                          <SelectItem value="Quality Errors">Quality Errors</SelectItem>
                          <SelectItem value="Replacement">Replacement</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
            {areLeadsLoading && joInput && !foundLead && joSuggestions.length === 0 && (
                 <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                </div>
            )}

            {foundLead && (
                 <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className='flex items-center gap-2'>
                           <User className="h-4 w-4 text-gray-500" />
                           <span className="font-medium text-gray-600">Customer:</span>
                           <span className="text-black">{foundLead.customerName}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                           <Building className="h-4 w-4 text-gray-500" />
                           <span className="font-medium text-gray-600">Company:</span>
                           <span className="text-black">{foundLead.companyName && foundLead.companyName !== '-' ? foundLead.companyName : 'N/A'}</span>
                        </div>
                         <div className='flex items-center gap-2'>
                           <Phone className="h-4 w-4 text-gray-500" />
                           <span className="font-medium text-gray-600">Contact:</span>
                           <span className="text-black">{getContactDisplay() || 'N/A'}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                           <CalendarDays className="h-4 w-4 text-gray-500" />
                           <span className="font-medium text-gray-600">Expected Delivery:</span>
                           <span className="text-black">{getExpectedDeliveryDate()}</span>
                        </div>
                    </div>
                </div>
            )}
            
            <FormField
              control={control}
              name="quantity"
              render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-black">
                      <Inbox className="h-4 w-4 text-primary" />
                      Total Quantity
                    </FormLabel>
                    <div className='flex items-center gap-4'>
                        <Input
                            readOnly
                            value={caseItems.reduce((sum, item) => sum + item.quantity, 0)}
                            className="w-24 text-center font-bold bg-gray-100"
                        />
                        <Button type="button" onClick={() => setIsQuantityDialogOpen(true)} disabled={!foundLead}>
                            Select Items with Related Case
                        </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
              )}
            />

            <FormField
              control={control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Remarks/Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain the reason for this case in detail..."
                      className="resize-y min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
                control={control}
                name="image"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-black">Upload Image (Optional)</FormLabel>
                        <FormControl>
                            <div 
                                tabIndex={0}
                                className="relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none"
                                style={{ height: '120px' }}
                                onPaste={handleImagePaste}
                                onDoubleClick={() => imageUploadRef.current?.click()}
                                onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}
                            >
                                {imageValue ? (
                                <>
                                    <Image src={imageValue} alt="Image preview" layout="fill" objectFit="contain" className="rounded-md" />
                                    <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={handleRemoveImage}
                                    >
                                    <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                                ) : (
                                <div className="text-gray-500">
                                    <Upload className="mx-auto h-8 w-8" />
                                    <p className="text-xs mt-2">Double-click to upload or paste image</p>
                                </div>
                                )}
                                <input 
                                type="file" 
                                accept="image/*" 
                                ref={imageUploadRef} 
                                onChange={handleImageUpload}
                                className="hidden" 
                                />
                            </div>
                        </FormControl>
                         <FormMessage />
                    </FormItem>
                )}
            />

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" size="lg" onClick={handleFormReset}>
                {isEditing ? 'Cancel' : 'Reset'}
              </Button>
              <Button type="submit" size="lg" className="shadow-md transition-transform active:scale-95 text-white font-bold">
                {isEditing ? 'Save Changes' : 'Save Case'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
    {isQuantityDialogOpen && foundLead && (
        <QuantityDialog
            isOpen={isQuantityDialogOpen}
            onClose={() => setIsQuantityDialogOpen(false)}
            onSave={handleCaseItemsChange}
            leadOrders={foundLead.orders}
            initialItems={caseItems}
        />
    )}
    </>
  );
}

// Dialog component for setting quantities
type QuantityDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (items: CaseItem[]) => void;
    leadOrders: LeadOrder[];
    initialItems: CaseItem[];
}

function QuantityDialog({ isOpen, onClose, onSave, leadOrders, initialItems }: QuantityDialogProps) {
    const [items, setItems] = useState<CaseItem[]>(initialItems.length > 0 ? initialItems : [{ id: uuidv4(), productType: '', color: '', size: '', quantity: 1 }]);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const availableOptions = useMemo(() => {
        const productTypes = [...new Set(leadOrders.map(o => o.productType))];
        const colors = [...new Set(leadOrders.map(o => o.color))];
        const sizes = [...new Set(leadOrders.map(o => o.size))];
        return { productTypes, colors, sizes };
    }, [leadOrders]);

    const addNewItem = () => {
        setItems(prev => [...prev, { id: uuidv4(), productType: '', color: '', size: '', quantity: 1 }]);
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const updateItem = (id: string, field: keyof CaseItem, value: string | number) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleSave = () => {
        const validItems = items.filter(item => item.productType && item.color && item.size && item.quantity > 0);
        onSave(validItems);
    };
    
    const handleOpenChange = (id: string, open: boolean) => {
        setOpenDropdown(open ? id : null);
    };


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Select Items with Related Case</DialogTitle>
                    <DialogDescription>
                        Specify the product, color, size, and quantity for each item included in this operational case.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product Type</TableHead>
                                <TableHead>Color</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead className="w-[150px] text-center">Quantity</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <Select 
                                            value={item.productType} 
                                            onValueChange={(v) => updateItem(item.id, 'productType', v)}
                                            open={openDropdown === `${item.id}-productType`}
                                            onOpenChange={(open) => handleOpenChange(`${item.id}-productType`, open)}
                                        >
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>{availableOptions.productTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select 
                                            value={item.color} 
                                            onValueChange={(v) => updateItem(item.id, 'color', v)}
                                            open={openDropdown === `${item.id}-color`}
                                            onOpenChange={(open) => handleOpenChange(`${item.id}-color`, open)}
                                        >
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>{availableOptions.colors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select 
                                            value={item.size} 
                                            onValueChange={(v) => updateItem(item.id, 'size', v)}
                                            open={openDropdown === `${item.id}-size`}
                                            onOpenChange={(open) => handleOpenChange(`${item.id}-size`, open)}
                                        >
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>{availableOptions.sizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-1">
                                            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => updateItem(item.id, 'quantity', Math.max(1, item.quantity - 1))}>
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                                                className="w-16 text-center"
                                            />
                                            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => updateItem(item.id, 'quantity', item.quantity + 1)}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Button type="button" variant="outline" className="mt-4" onClick={addNewItem}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
