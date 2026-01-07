
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState, useRef, useEffect } from 'react';
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
import { TriangleAlert, Upload, Trash2, User, Building, Phone, Hash, CalendarDays, Inbox } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, setDoc, updateDoc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { addDays, format } from 'date-fns';

type Lead = {
  id: string;
  joNumber?: number;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  submissionDateTime: string;
  priorityType: 'Rush' | 'Regular';
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
  quantity?: number;
  isArchived?: boolean;
  isDeleted?: boolean;
};

const formSchema = z.object({
  joNumber: z.string().min(1, { message: 'J.O. Number is required.' }),
  caseType: z.enum(['Return to Sender (RTS)', 'Quality Errors', 'Replacement'], {
    required_error: 'You need to select a case type.',
  }),
  quantity: z.number().min(1, 'Quantity must be at least 1.'),
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

  const leadsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'leads')) : null),
    [firestore]
  );
  const { data: allLeads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsQuery);
  const [leads, setLeads] = useState<Lead[] | null>(null);

  useEffect(() => {
    if (allLeads) {
      setLeads(allLeads);
    }
  }, [allLeads]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      joNumber: '',
      caseType: undefined,
      quantity: 1,
      remarks: '',
      image: '',
    },
  });
  
  const { control, handleSubmit, reset, setValue, watch, trigger } = form;
  const imageValue = watch('image');

  const isEditing = !!editingCase;

  useEffect(() => {
    if (editingCase && leads) {
      const leadForCase = leads.find(l => l.joNumber && formatJoNumber(l.joNumber) === editingCase.joNumber);
      setFoundLead(leadForCase || null);
      setJoInput(editingCase.joNumber);
      setValue('joNumber', editingCase.joNumber);
      setValue('caseType', editingCase.caseType as any);
      setValue('quantity', editingCase.quantity || 1);
      setValue('remarks', editingCase.remarks);
      setValue('image', editingCase.image || '');
    } else {
      handleFormReset();
    }
  }, [editingCase, leads, setValue]);


  const formatJoNumber = (joNumber: number) => {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  };

  useEffect(() => {
    if (!leads || !joInput || !showSuggestions || isEditing) {
      setJoSuggestions([]);
      return;
    }

    const searchInput = joInput.toLowerCase().replace(/[^0-9]/g, '');
    
    if(searchInput.length > 0) {
        const matchedLeads = leads.filter(lead => 
            lead.joNumber && 
            (lead.joNumber.toString().padStart(5, '0').includes(searchInput) ||
             formatJoNumber(lead.joNumber).toLowerCase().includes(joInput.toLowerCase()))
        );
        setJoSuggestions(matchedLeads);
    } else {
        setJoSuggestions([]);
    }

  }, [joInput, leads, showSuggestions, isEditing]);
  
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
        quantity: 1,
        remarks: '',
        image: '',
    });
    setJoInput('');
    setFoundLead(null);
    setJoSuggestions([]);
    setShowSuggestions(true);
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
    
    try {
        if (isEditing && editingCase) {
            // Update existing case
            const caseDocRef = doc(firestore, 'operationalCases', editingCase.id);
            await updateDoc(caseDocRef, { ...values, lastModified: new Date().toISOString() });
            handleFormReset();
            onSaveComplete();
        } else {
            // Create new case
            const caseId = uuidv4();
            const operationalCasesRef = collection(firestore, 'operationalCases');
            const caseDocRef = doc(operationalCasesRef, caseId);
            
            const submissionData = {
                id: caseId,
                ...values,
                customerName: foundLead?.customerName,
                companyName: foundLead?.companyName,
                contactNumber: foundLead?.contactNumber || '',
                landlineNumber: foundLead?.landlineNumber || '',
                submissionDateTime: new Date().toISOString(),
            };

            await setDoc(caseDocRef, submissionData);
            
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


  return (
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
            
            <div className="grid grid-cols-1">
                 <FormField
                    control={control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                            <FormLabel className="flex items-center gap-2 text-black mb-0 shrink-0">
                                <Inbox className="h-4 w-4 text-primary" />
                                Quantity
                            </FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="1"
                                    {...field}
                                    onChange={e => field.onChange(parseInt(e.target.value, 10) || 1)}
                                    onBlur={e => { if (!e.target.value || parseInt(e.target.value, 10) < 1) field.onChange(1); }}
                                    className="w-20"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>


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
  );
}
