

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { useFirestore, useUser, setDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, collection, query, orderBy, deleteDoc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
// Import Firebase Storage functions
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Cog, Edit, Trash2, Upload, X, Ticket } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { Label } from '@/components/ui/label';

// --- Data Types ---
type CampaignInquiry = {
    id: string;
    date: string;
    adAccount: string;
    adCampaign: string;
    smallTicketInquiries: number;
    mediumTicketInquiries: number;
    largeTicketInquiries: number;
    highTicketInquiries: number;
    submittedBy: string;
    timestamp: string;
};

type AdCampaign = {
    id: string;
    name: string;
    imageUrl?: string;
    adAccount: string;
};

// --- Form Schema ---
const formSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  adAccount: z.string().min(1, 'AD Account is required.'),
  adCampaign: z.string().min(1, 'AD Campaign is required.'),
  smallTicketInquiries: z.coerce.number().min(0, "Cannot be negative.").default(0),
  mediumTicketInquiries: z.coerce.number().min(0, "Cannot be negative.").default(0),
  largeTicketInquiries: z.coerce.number().min(0, "Cannot be negative.").default(0),
  highTicketInquiries: z.coerce.number().min(0, "Cannot be negative.").default(0),
});

type FormValues = z.infer<typeof formSchema>;

const adAccountOptions = ["Personal Account", "AD Account 101", "AD Account 102"];

// --- Manage Campaigns Dialog ---
function ManageCampaignsDialog({ open, onOpenChange, onCampaignsUpdate }: { open: boolean, onOpenChange: (open: boolean) => void, onCampaignsUpdate: () => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const campaignsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'adCampaigns')) : null, [firestore]);
    const { data: campaigns, refetch } = useCollection<AdCampaign>(campaignsQuery, undefined, { listen: false });
    
    const [selectedAdAccount, setSelectedAdAccount] = useState(adAccountOptions[0]);
    const [newCampaignName, setNewCampaignName] = useState('');
    const [newCampaignFile, setNewCampaignFile] = useState<File | null>(null);
    const [newCampaignImagePreview, setNewCampaignImagePreview] = useState<string | null>(null);
    const imageUploadRef = useRef<HTMLInputElement>(null);
    const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null);

    const filteredCampaigns = useMemo(() => {
        if (!campaigns) return [];
        return campaigns
            .filter(c => c.adAccount === selectedAdAccount)
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    }, [campaigns, selectedAdAccount]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setNewCampaignFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setNewCampaignImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setNewCampaignFile(null);
            setNewCampaignImagePreview(null);
        }
    };

    const handleAddCampaign = async () => {
        if (!newCampaignName.trim() || !newCampaignFile || !firestore) return;
        
        try {
            const campaignId = uuidv4();

            const storage = getStorage();
            const storageRef = ref(storage, `adCampaigns-images/${campaignId}/${newCampaignFile.name}`);
            const uploadResult = await uploadBytes(storageRef, newCampaignFile);
            
            const imageUrl = await getDownloadURL(uploadResult.ref);

            const campaignDocRef = doc(firestore, 'adCampaigns', campaignId);
            await setDocumentNonBlocking(campaignDocRef, { 
                id: campaignId, 
                name: newCampaignName.trim(), 
                imageUrl: imageUrl,
                adAccount: selectedAdAccount
            }, {});
            
            setNewCampaignName('');
            setNewCampaignFile(null);
            setNewCampaignImagePreview(null);
            if (imageUploadRef.current) {
                imageUploadRef.current.value = '';
            }
            onCampaignsUpdate();
            toast({ title: "Campaign added!", description: "Image uploaded and campaign details saved." });

        } catch (error: any) {
            console.error("Error adding campaign:", error);
            toast({ variant: "destructive", title: "Failed to add campaign", description: error.message || "An unknown error occurred." });
        }
    };

    const handleUpdateCampaign = async () => {
        if (!editingCampaign || !editingCampaign.name.trim() || !firestore) return;
        const campaignRef = doc(firestore, 'adCampaigns', editingCampaign.id);
        await setDocumentNonBlocking(campaignRef, { name: editingCampaign.name.trim() }, { merge: true });
        setEditingCampaign(null);
        onCampaignsUpdate();
        toast({ title: "Campaign updated!" });
    };

    const handleDeleteCampaign = async (id: string) => {
        if (!firestore) return;
        const campaignRef = doc(firestore, 'adCampaigns', id);
        await deleteDoc(campaignRef);
        onCampaignsUpdate();
        toast({ title: "Campaign deleted!" });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage AD Campaigns</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>AD Account</Label>
                        <Select value={selectedAdAccount} onValueChange={setSelectedAdAccount}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {adAccountOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <Input value={newCampaignName} onChange={(e) => setNewCampaignName(e.target.value)} placeholder="New campaign name" />
                            <Button onClick={handleAddCampaign} disabled={!newCampaignName.trim() || !newCampaignFile}>Add</Button>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            {newCampaignImagePreview && (
                                <div className="relative h-10 w-auto flex-shrink-0">
                                    <Image src={newCampaignImagePreview} alt="New campaign preview" width={40} height={40} className="rounded-md h-10 w-auto object-contain" />
                                </div>
                            )}
                            <Button type="button" variant="outline" className="w-full" onClick={() => imageUploadRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Image
                            </Button>
                            <input type="file" ref={imageUploadRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e)} />
                        </div>
                    </div>
                    <div className="border rounded-md max-h-60 overflow-y-auto">
                        {filteredCampaigns?.map(campaign => (
                            <div key={campaign.id} className="flex items-center justify-between p-2 border-b">
                                {editingCampaign?.id === campaign.id ? (
                                    <Input value={editingCampaign.name} onChange={(e) => setEditingCampaign({ ...editingCampaign, name: e.target.value })} />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        {campaign.imageUrl && (
                                            <div className="relative h-8 w-8 flex-shrink-0">
                                                <Image src={campaign.imageUrl} alt={campaign.name} layout="fill" objectFit="cover" className="rounded-md" />
                                            </div>
                                        )}
                                        <span>{campaign.name}</span>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    {editingCampaign?.id === campaign.id ? (
                                        <Button size="sm" onClick={handleUpdateCampaign}>Save</Button>
                                    ) : (
                                        <Button size="sm" variant="ghost" onClick={() => setEditingCampaign(campaign)}><Edit className="h-4 w-4"/></Button>
                                    )}
                                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteCampaign(campaign.id)}><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// --- Form Component ---
function CampaignInquiryForm({ inquiries, onFormSubmit, editingInquiry, onCancelEdit, onDirtyChange }: { inquiries: CampaignInquiry[] | null, onFormSubmit: () => void, editingInquiry: CampaignInquiry | null, onCancelEdit: () => void, onDirtyChange: (isDirty: boolean) => void }) {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [isManageOpen, setIsManageOpen] = useState(false);
  const isEditing = !!editingInquiry;

  const campaignsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'adCampaigns')) : null, [firestore]);
  const { data: campaigns, refetch: refetchCampaigns } = useCollection<AdCampaign>(campaignsQuery, undefined, { listen: false });

  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [valuesToSave, setValuesToSave] = useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit',
    defaultValues: {
      date: new Date(),
      adAccount: '',
      adCampaign: '',
    },
  });
  
  const { formState: { isDirty } } = form;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);


  const adAccountValue = form.watch('adAccount');
  const adCampaignValue = form.watch('adCampaign');

  const filteredCampaigns = useMemo(() => {
      if (!campaigns || !adAccountValue) return [];
      return campaigns
        .filter(c => c.adAccount === adAccountValue)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }, [campaigns, adAccountValue]);

  const selectedCampaign = useMemo(() => 
    filteredCampaigns?.find(c => c.name === adCampaignValue)
  , [adCampaignValue, filteredCampaigns]);

  useEffect(() => {
    if (!form.getValues('date')) {
      form.setValue('date', new Date());
    }
  }, [form]);
  
  useEffect(() => {
    if (editingInquiry && campaigns) {
        form.reset({
            date: new Date(editingInquiry.date),
            adAccount: editingInquiry.adAccount,
            adCampaign: editingInquiry.adCampaign,
            smallTicketInquiries: editingInquiry.smallTicketInquiries || 0,
            mediumTicketInquiries: editingInquiry.mediumTicketInquiries || 0,
            largeTicketInquiries: editingInquiry.largeTicketInquiries || 0,
            highTicketInquiries: editingInquiry.highTicketInquiries || 0,
        });
    } else if (!isEditing) {
        form.reset({
            date: new Date(),
            adAccount: '',
            adCampaign: '',
        });
    }
  }, [editingInquiry, campaigns, form, isEditing]);

  const handleActualSubmit = async (values: FormValues) => {
    if (!firestore || !userProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to submit inquiries.' });
        return;
    }
    
    const dataToSave = {
        date: values.date.toISOString(),
        adAccount: values.adAccount,
        adCampaign: values.adCampaign,
        smallTicketInquiries: values.smallTicketInquiries || 0,
        mediumTicketInquiries: values.mediumTicketInquiries || 0,
        largeTicketInquiries: values.largeTicketInquiries || 0,
        highTicketInquiries: values.highTicketInquiries || 0,
        submittedBy: userProfile.nickname,
        timestamp: new Date().toISOString(),
    };

    try {
        if (isEditing && editingInquiry) {
            const inquiryRef = doc(firestore, 'campaign_inquiries', editingInquiry.id);
            await updateDoc(inquiryRef, dataToSave);
            toast({ title: 'Success!', description: 'Inquiry has been updated.' });
        } else {
            const docId = `${format(values.date, 'yyyy-MM-dd')}_${userProfile.nickname}_${values.adAccount}_${values.adCampaign}`;
            const inquiryRef = doc(firestore, 'campaign_inquiries', docId);
            await setDoc(inquiryRef, { ...dataToSave, id: docId });
            toast({
                title: 'Success!',
                description: `Inquiries for ${format(values.date, 'PPP')} have been saved/replaced.`,
            });
        }
        
        form.reset({
            date: new Date(),
            adAccount: values.adAccount,
            adCampaign: '',
        });
        onFormSubmit();
        onCancelEdit();
    } catch (e: any) {
        console.error("Error saving inquiry:", e);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: e.message || "An unknown error occurred.",
        });
    } finally {
        setValuesToSave(null);
        setShowReplaceDialog(false);
    }
  }

  async function onSubmit(values: FormValues) {
    if (!userProfile || !firestore) return;

    if (isEditing) {
        await handleActualSubmit(values);
        return;
    }

    const docId = `${format(values.date, 'yyyy-MM-dd')}_${userProfile.nickname}_${values.adAccount}_${values.adCampaign}`;
    const inquiryRef = doc(firestore, 'campaign_inquiries', docId);
    
    const docSnap = await getDoc(inquiryRef);

    if (docSnap.exists()) {
        setValuesToSave(values);
        setShowReplaceDialog(true);
    } else {
        await handleActualSubmit(values);
    }
  }

  return (
    <>
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Inquiry' : 'Log Daily Ad Inquiries'}</CardTitle>
          <CardDescription>{isEditing ? 'Update the inquiry details below.' : 'Enter the number of inquiries received for each ad ticket size per day.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="w-full"
                            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                                const dateValue = e.target.value;
                                field.onChange(dateValue ? new Date(`${dateValue}T00:00:00`) : undefined);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adAccount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>AD Account</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('adCampaign', '', { shouldValidate: true });
                          }}
                          value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {adAccountOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
               </div>
              
                <FormField
                  control={form.control}
                  name="adCampaign"
                  render={({ field }) => (
                    <FormItem>
                       {selectedCampaign?.imageUrl && (
                        <div className="mb-2 p-1 rounded-md mx-auto border w-full h-auto aspect-[4/3] relative">
                            <Image src={selectedCampaign.imageUrl} alt={selectedCampaign.name} layout="fill" objectFit="contain" className="rounded-md" />
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <FormLabel>AD Campaign</FormLabel>
                        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setIsManageOpen(true)}>
                          <Cog className="h-4 w-4"/> Manage
                        </Button>
                      </div>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!adAccountValue}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select Campaign" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              {filteredCampaigns?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="smallTicketInquiries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Small Ticket (1-9)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => {
                            const { value } = e.target;
                            if (/^\d*$/.test(value)) {
                                field.onChange(value);
                            }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mediumTicketInquiries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medium Ticket (10-49)</FormLabel>
                    <FormControl>
                       <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => {
                            const { value } = e.target;
                            if (/^\d*$/.test(value)) {
                                field.onChange(value);
                            }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="largeTicketInquiries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Large Ticket (50-199)</FormLabel>
                    <FormControl>
                       <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => {
                            const { value } = e.target;
                            if (/^\d*$/.test(value)) {
                                field.onChange(value);
                            }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="highTicketInquiries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>High Ticket (200+)</FormLabel>
                    <FormControl>
                       <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => {
                            const { value } = e.target;
                            if (/^\d*$/.test(value)) {
                                field.onChange(value);
                            }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
              <div className="flex justify-end gap-2">
                {isEditing && <Button type="button" variant="outline" onClick={onCancelEdit}>Cancel</Button>}
                <Button type="submit" className="w-full">{isEditing ? 'Save Changes' : 'Save Inquiries'}</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <ManageCampaignsDialog open={isManageOpen} onOpenChange={setIsManageOpen} onCampaignsUpdate={refetchCampaigns}/>
       <AlertDialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Record Exists</AlertDialogTitle>
                <AlertDialogDescription>
                    An inquiry for this date, account, and campaign already exists. Do you want to replace it with the new data?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setValuesToSave(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => valuesToSave && handleActualSubmit(valuesToSave)}>Replace</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// --- Table Component ---
function CampaignInquiriesTable({ tableKey, onEdit, onDelete, isModifyMode, onToggleModifyMode, setImageInView, inquiries, isLoading, error }: { tableKey: number, onEdit: (inquiry: CampaignInquiry) => void, onDelete: (inquiry: CampaignInquiry) => void, isModifyMode: boolean, onToggleModifyMode: () => void, setImageInView: (url: string | null) => void, inquiries: CampaignInquiry[] | null, isLoading: boolean, error: Error | null }) { 
  const firestore = useFirestore();
  const campaignsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'adCampaigns')) : null, [firestore]);
  const { data: campaigns } = useCollection<AdCampaign>(campaignsQuery, undefined, { listen: false });

  const campaignsMap = useMemo(() => {
    if (!campaigns) return new Map<string, string | undefined>();
    return new Map(campaigns.map(c => [`${c.adAccount}-${c.name}`, c.imageUrl]));
  }, [campaigns]);
  
  const sortedInquiries = useMemo(() => {
    if (!inquiries) return [];
    
    return [...inquiries].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);

        // Set time to 0 to compare dates only for grouping purposes
        dateA.setHours(0, 0, 0, 0);
        dateB.setHours(0, 0, 0, 0);

        // Primary sort: Date descending
        if (dateA.getTime() !== dateB.getTime()) {
            return dateB.getTime() - dateA.getTime();
        }

        // Secondary sort: AD Account alphabetically
        const accountCompare = a.adAccount.localeCompare(b.adAccount);
        if (accountCompare !== 0) {
            return accountCompare;
        }

        // Tertiary sort: AD Campaign naturally
        return a.adCampaign.localeCompare(b.adCampaign, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [inquiries]);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Recent Inquiry Logs</CardTitle>
                <CardDescription>A log of recently submitted daily inquiries.</CardDescription>
            </div>
            <Button variant={isModifyMode ? "destructive" : "outline"} onClick={onToggleModifyMode}>
                {isModifyMode ? 'Change to View Mode' : 'Change to Edit Mode'}
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md h-[75vh] overflow-y-auto modern-scrollbar">
          <Table>
            <TableHeader className="sticky top-0 bg-neutral-800 z-10">
              <TableRow>
                <TableHead className="text-center text-white font-bold">Date</TableHead>
                <TableHead className="text-center text-white font-bold">AD Account</TableHead>
                <TableHead className="text-center text-white font-bold">AD Campaign</TableHead>
                <TableHead className="text-center text-white font-bold">AD Thumbnail</TableHead>
                <TableHead className="text-center text-white font-bold">Submitted By</TableHead>
                <TableHead className="text-center text-white font-bold">Small</TableHead>
                <TableHead className="text-center text-white font-bold">Medium</TableHead>
                <TableHead className="text-center text-white font-bold">Large</TableHead>
                <TableHead className="text-center text-white font-bold">High</TableHead>
                <TableHead className="text-center text-white font-bold">Total</TableHead>
                {isModifyMode && <TableHead className="text-center text-white font-bold">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={isModifyMode ? 11 : 10}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={isModifyMode ? 11 : 10} className="text-center text-destructive">
                    Error loading data: {error.message}
                  </TableCell>
                </TableRow>
              ) : sortedInquiries && sortedInquiries.length > 0 ? (
                sortedInquiries.map(inquiry => {
                    const total = (inquiry.smallTicketInquiries || 0) + (inquiry.mediumTicketInquiries || 0) + (inquiry.largeTicketInquiries || 0) + (inquiry.highTicketInquiries || 0);
                    const imageUrl = campaignsMap.get(`${inquiry.adAccount}-${inquiry.adCampaign}`);
                    return (
                        <TableRow key={inquiry.id}>
                            <TableCell className="text-center">{format(new Date(inquiry.date), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="text-center">{inquiry.adAccount}</TableCell>
                            <TableCell className="text-center">{inquiry.adCampaign}</TableCell>
                            <TableCell className="text-center align-middle">
                                {imageUrl ? (
                                    <div
                                        className="relative h-10 w-16 mx-auto cursor-pointer"
                                        onClick={() => setImageInView(imageUrl)}
                                    >
                                        <Image
                                            src={imageUrl}
                                            alt={inquiry.adCampaign}
                                            layout="fill"
                                            objectFit="contain"
                                            className="rounded-sm"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                )}
                            </TableCell>
                            <TableCell className="text-center">{inquiry.submittedBy}</TableCell>
                            <TableCell className="text-center">{inquiry.smallTicketInquiries || 0}</TableCell>
                            <TableCell className="text-center">{inquiry.mediumTicketInquiries || 0}</TableCell>
                            <TableCell className="text-center">{inquiry.largeTicketInquiries || 0}</TableCell>
                            <TableCell className="text-center">{inquiry.highTicketInquiries || 0}</TableCell>
                            <TableCell className="text-center font-bold">{total}</TableCell>
                            {isModifyMode && (
                                <TableCell className="text-center">
                                    <Button variant="ghost" size="icon" onClick={() => onEdit(inquiry)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(inquiry)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            )}
                        </TableRow>
                    )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={isModifyMode ? 11 : 10} className="text-center text-muted-foreground">
                    No inquiry data has been logged yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}


// --- Main Page Component ---
export default function CampaignsPage() {
  const [tableKey, setTableKey] = useState(0);
  const [editingInquiry, setEditingInquiry] = useState<CampaignInquiry | null>(null);
  const [deletingInquiry, setDeletingInquiry] = useState<CampaignInquiry | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isModifyMode, setIsModifyMode] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [imageInView, setImageInView] = useState<string | null>(null);

  const inquiriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'campaign_inquiries'), orderBy('timestamp', 'desc')) : null, [firestore]);
  const { data: inquiries, isLoading, error, refetch: refetchInquiries } = useCollection<CampaignInquiry>(inquiriesQuery, undefined, { listen: false });

  const handleFormSubmit = () => {
    setTableKey(prev => prev + 1);
    refetchInquiries();
  };

  const handleEdit = (inquiry: CampaignInquiry) => {
    setEditingInquiry(inquiry);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleCancelEdit = () => {
    setEditingInquiry(null);
  }

  const handleToggleModifyMode = () => {
    if (isModifyMode && editingInquiry && isFormDirty) {
      setShowDiscardDialog(true);
    } else {
      setIsModifyMode(prev => !prev);
    }
  };

  const handleConfirmDiscard = () => {
    handleCancelEdit();
    setIsModifyMode(false);
    setShowDiscardDialog(false);
  };

  const handleDelete = (inquiry: CampaignInquiry) => {
    setDeletingInquiry(inquiry);
  };

  const confirmDelete = async () => {
    if (!deletingInquiry || !firestore) return;
    try {
        const inquiryRef = doc(firestore, 'campaign_inquiries', deletingInquiry.id);
        await deleteDoc(inquiryRef);
        toast({
            title: 'Success!',
            description: 'Inquiry has been deleted.',
        });
        setDeletingInquiry(null);
        handleFormSubmit();
    } catch (e: any) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: e.message || 'Failed to delete inquiry.',
        });
    }
  };

  return (
    <Header>
      {imageInView && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center animate-in fade-in"
          onClick={() => setImageInView(null)}
        >
          <div className="relative h-[90vh] w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image src={imageInView} alt="Enlarged view" layout="fill" objectFit="contain" />
             <Button
                variant="ghost"
                size="icon"
                onClick={() => setImageInView(null)}
                className="absolute top-4 right-4 text-white hover:bg-white/10 hover:text-white"
            >
                <X className="h-6 w-6" />
                <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>
      )}
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-[auto_1fr] gap-8 items-start">
            <div>
                <CampaignInquiryForm 
                    inquiries={inquiries}
                    onFormSubmit={handleFormSubmit} 
                    editingInquiry={editingInquiry} 
                    onCancelEdit={handleCancelEdit} 
                    onDirtyChange={setIsFormDirty} 
                />
            </div>
            <div>
                <CampaignInquiriesTable 
                    key={tableKey} 
                    inquiries={inquiries}
                    isLoading={isLoading}
                    error={error}
                    onEdit={handleEdit} 
                    onDelete={handleDelete} 
                    isModifyMode={isModifyMode} 
                    onToggleModifyMode={handleToggleModifyMode}
                    setImageInView={setImageInView} 
                />
            </div>
        </div>
      </main>
      <AlertDialog open={!!deletingInquiry} onOpenChange={() => setDeletingInquiry(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the inquiry record.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
                <AlertDialogDescription>
                    You have unsaved changes. Are you sure you want to discard them and exit edit mode?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDiscard}>Discard</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Header>
  );
}
