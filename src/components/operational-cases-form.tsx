

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
import { TriangleAlert, Upload, Trash2, User, Building, Phone, Hash, CalendarDays, Inbox, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, setDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { Skeleton } from './ui/skeleton';
import { addDays, format } from 'date-fns';
import { QuantityDialog } from './quantity-dialog';
import { toTitleCase } from '@/lib/utils';

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
  isEndorsedToLogistics?: boolean;
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
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
  companyName?: string;
  contactNumber?: string;
  landlineNumber?: string;
  caseItems: CaseItem[];
  isArchived?: boolean;
  isDeleted?: boolean;
  submittedBy?: string;
  quantity?: number;
};

const formSchema = z.object({
  joNumber: z.string().min(1, { message: 'J.O. Number is required.' }),
  caseType: z.enum(['Return to Sender (RTS)', 'Quality Errors', 'Replacement'], {
    required_error: "Case Type is required",
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
  onDirtyChange: (isDirty: boolean) => void;
  isReadOnly: boolean;
  setImageInView: (url: string | null) => void;
  initialJoNumber?: string | null;
  source?: string | null;
}

const allCaseTypes = ['Return to Sender (RTS)', 'Quality Errors', 'Replacement'];

const OperationalCasesFormMemo = React.memo(function OperationalCasesForm({ editingCase, onCancelEdit, onSaveComplete, onDirtyChange, isReadOnly, setImageInView, initialJoNumber, source }: OperationalCasesFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { userProfile } = useUser();
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
  const { data: allLeads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsQuery, undefined, { listen: false });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit',
    defaultValues: {
      joNumber: '',
      caseType: undefined,
      quantity: 0,
      remarks: '',
      image: '',
    },
  });
  
  const { control, handleSubmit, reset, setValue, watch, formState: { isDirty } } = form;
  const imageValue = watch('image');

  const isEditing = !!editingCase;
  
  const caseTypes = useMemo(() => {
    if (source === 'quality_check') {
        return ['Quality Errors'];
    }
    return allCaseTypes;
  }, [source]);

  useEffect(() => {
    if (source === 'quality_check' && !isEditing) {
      setValue('caseType', 'Quality Errors' as any, { shouldValidate: true });
    }
  }, [source, isEditing, setValue]);


  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);


  useEffect(() => {
    if (editingCase && allLeads) {
      const leadForCase = allLeads.find(l => l.joNumber && formatJoNumber(l.joNumber) === editingCase.joNumber);
      setFoundLead(leadForCase || null);
      setJoInput(editingCase.joNumber);
      setCaseItems(editingCase.caseItems || []);
      const totalQuantity = editingCase.caseItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
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

  const handleSuggestionClick = useCallback((lead: Lead) => {
    setFoundLead(lead);
    const fullJoNumber = formatJoNumber(lead.joNumber!);
    setJoInput(fullJoNumber);
    setValue('joNumber', fullJoNumber, { shouldValidate: true });
    setShowSuggestions(false);
  }, [setValue]);

  useEffect(() => {
    if (initialJoNumber && allLeads && !isEditing) {
      const lead = allLeads.find(l => l.joNumber && formatJoNumber(l.joNumber) === initialJoNumber);
      if (lead) {
        handleSuggestionClick(lead);
      } else {
        setJoInput(initialJoNumber);
        setValue('joNumber', initialJoNumber, { shouldValidate: true });
      }
    }
  }, [initialJoNumber, allLeads, isEditing, setValue, handleSuggestionClick]);


 useEffect(() => {
    if (!allLeads || !joInput || !showSuggestions || isEditing) {
      setJoSuggestions([]);
      return;
    }

    const searchInput = joInput.toLowerCase().replace(/[^0-9]/g, '');
    
    if(searchInput.length > 0) {
        let leadsToSearch = allLeads;

        // If not coming from a specific source like quality check, filter for shipment queue leads.
        if (!source) {
            leadsToSearch = allLeads.filter(lead => lead.isEndorsedToLogistics && lead.shipmentStatus !== 'Shipped' && lead.shipmentStatus !== 'Delivered');
        }

        const matchedLeads = leadsToSearch.filter(lead => 
            lead.joNumber && 
            (lead.joNumber.toString().padStart(5, '0').includes(searchInput) ||
             formatJoNumber(lead.joNumber).toLowerCase().includes(joInput.toLowerCase()))
        );
        setJoSuggestions(matchedLeads);
    } else {
        setJoSuggestions([]);
    }

  }, [joInput, allLeads, showSuggestions, isEditing, source]);
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setValue('image', result, { shouldDirty: true });
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
                        setValue('image', e.target.result as string, { shouldDirty: true });
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
        caseType: source === 'quality_check' ? 'Quality Errors' : undefined,
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
    if (!firestore || !userProfile) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available. Please try again later.' });
      return;
    }

    if (!isEditing && !foundLead) {
      toast({ variant: 'destructive', title: 'Invalid Job Order', description: 'Please select a valid Job Order from the suggestions.' });
      return;
    }
    
    try {
        let imageUrl = values.image || '';
        const caseId = isEditing && editingCase ? editingCase.id : uuidv4();
        
        if (values.image && values.image.startsWith('data:')) {
            const storage = getStorage();
            const storageRef = ref(storage, `operational-cases/${caseId}/image.png`);
            const snapshot = await uploadString(storageRef, values.image, 'data_url');
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        const submissionData = {
          joNumber: values.joNumber,
          caseType: values.caseType,
          remarks: values.remarks,
          image: imageUrl,
          quantity: values.quantity,
          caseItems: caseItems,
        }

        if (isEditing && editingCase) {
            const caseDocRef = doc(firestore, 'operationalCases', editingCase.id);
            await updateDoc(caseDocRef, { ...submissionData, lastModified: new Date().toISOString() });
            handleFormReset();
            onSaveComplete();
        } else {
            const operationalCasesRef = collection(firestore, 'operationalCases');
            const caseDocRef = doc(operationalCasesRef, caseId);
            
            const fullData = {
                id: caseId,
                ...submissionData,
                customerName: toTitleCase(foundLead?.customerName || ''),
                companyName: toTitleCase(foundLead?.companyName || ''),
                contactNumber: foundLead?.contactNumber || '',
                landlineNumber: foundLead?.landlineNumber || '',
                submissionDateTime: new Date().toISOString(),
                submittedBy: userProfile.nickname,
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
            description: e.message || "Could not save the operational case. Please check your network and permissions.",
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
            <fieldset disabled={isReadOnly} className="space-y-6">
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
                                disabled={isEditing || isReadOnly}
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
                                    {formatJoNumber(lead.joNumber!)} - {toTitleCase(lead.customerName)}
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly || source === 'quality_check'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a Case Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {caseTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
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
                           <span className="text-black">{toTitleCase(foundLead.customerName)}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                           <Building className="h-4 w-4 text-gray-500" />
                           <span className="font-medium text-gray-600">Company:</span>
                           <span className="text-black">{foundLead.companyName && foundLead.companyName !== '-' ? toTitleCase(foundLead.companyName) : 'N/A'}</span>
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
                         <Button type="button" onClick={() => setIsQuantityDialogOpen(true)} disabled={!foundLead || isReadOnly} variant="default" className="text-white font-bold bg-primary hover:bg-primary/90">
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
                                tabIndex={isReadOnly ? -1 : 0}
                                className="relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none"
                                style={{ height: '120px' }}
                                onPaste={handleImagePaste}
                                onClick={() => imageValue && setImageInView(imageValue)}
                                onDoubleClick={() => !imageValue && imageUploadRef.current?.click()}
                                onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}
                            >
                                {imageValue ? (
                                <>
                                    <Image src={imageValue} alt="Image preview" layout="fill" objectFit="contain" className="rounded-md" />
                                    <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    onClick={handleRemoveImage}
                                    disabled={isReadOnly}
                                    >
                                    <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                                ) : (
                                <div className="text-gray-500">
                                    <Upload className="mx-auto h-8 w-8" />
                                    <p className="text-xs mt-2">{isReadOnly ? 'No image uploaded' : 'Double-click to upload or paste image'}</p>
                                </div>
                                )}
                                <input 
                                type="file" 
                                accept="image/*" 
                                ref={imageUploadRef} 
                                onChange={handleImageUpload}
                                className="hidden"
                                disabled={isReadOnly}
                                />
                            </div>
                        </FormControl>
                         <FormMessage />
                    </FormItem>
                )}
            />

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" size="lg" onClick={handleFormReset} disabled={isReadOnly}>
                {isEditing ? 'Cancel' : 'Reset'}
              </Button>
              <Button type="submit" size="lg" className="shadow-md transition-transform active:scale-95 text-white font-bold" disabled={isReadOnly}>
                {isEditing ? 'Save Changes' : 'Save Case'}
              </Button>
            </div>
            </fieldset>
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
});

export { OperationalCasesFormMemo as OperationalCasesForm };
