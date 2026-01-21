
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
import { doc, collection, query, orderBy, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Cog, Edit, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// --- Data Types ---
type CampaignInquiry = {
    id: string;
    date: string;
    adAccount: string;
    adCampaign: string;
    smallTicketInquiries: number;
    mediumTicketInquiries: number;
    largeTicketInquiries: number;
    xlTicketInquiries: number;
    submittedBy: string;
    timestamp: string;
};

type AdCampaign = {
    id: string;
    name: string;
};

// --- Form Schema ---
const formSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  adAccount: z.string().min(1, 'AD Account is required.'),
  adCampaign: z.string().min(1, 'AD Campaign is required.'),
  smallTicketInquiries: z.coerce.number().min(0, "Cannot be negative."),
  mediumTicketInquiries: z.coerce.number().min(0, "Cannot be negative."),
  largeTicketInquiries: z.coerce.number().min(0, "Cannot be negative."),
  xlTicketInquiries: z.coerce.number().min(0, "Cannot be negative."),
});

type FormValues = z.infer<typeof formSchema>;

const adAccountOptions = ["Personal Account", "AD Account 101", "AD Account 102"];

// --- Manage Campaigns Dialog ---
function ManageCampaignsDialog({ open, onOpenChange, onCampaignsUpdate }: { open: boolean, onOpenChange: (open: boolean) => void, onCampaignsUpdate: () => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const campaignsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'adCampaigns'), orderBy('name')) : null, [firestore]);
    const { data: campaigns, refetch } = useCollection<AdCampaign>(campaignsQuery);
    
    const [newCampaignName, setNewCampaignName] = useState('');
    const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null);

    const handleAddCampaign = async () => {
        if (!newCampaignName.trim() || !firestore) return;
        const id = uuidv4();
        const campaignRef = doc(firestore, 'adCampaigns', id);
        await setDocumentNonBlocking(campaignRef, { id, name: newCampaignName.trim() }, {});
        setNewCampaignName('');
        onCampaignsUpdate();
        toast({ title: "Campaign added!" });
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
                    <div className="flex gap-2">
                        <Input value={newCampaignName} onChange={(e) => setNewCampaignName(e.target.value)} placeholder="New campaign name" />
                        <Button onClick={handleAddCampaign}>Add</Button>
                    </div>
                    <div className="border rounded-md max-h-60 overflow-y-auto">
                        {campaigns?.map(campaign => (
                            <div key={campaign.id} className="flex items-center justify-between p-2 border-b">
                                {editingCampaign?.id === campaign.id ? (
                                    <Input value={editingCampaign.name} onChange={(e) => setEditingCampaign({ ...editingCampaign, name: e.target.value })} />
                                ) : (
                                    <span>{campaign.name}</span>
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
function CampaignInquiryForm({ onFormSubmit }: { onFormSubmit: () => void }) {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [isManageOpen, setIsManageOpen] = useState(false);
  
  const campaignsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'adCampaigns'), orderBy('name')) : null, [firestore]);
  const { data: campaigns, refetch: refetchCampaigns } = useCollection<AdCampaign>(campaignsQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      adAccount: '',
      adCampaign: '',
      smallTicketInquiries: 0,
      mediumTicketInquiries: 0,
      largeTicketInquiries: 0,
      xlTicketInquiries: 0,
    },
  });

  async function onSubmit(values: FormValues) {
    if (!firestore || !userProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to submit inquiries.' });
        return;
    }

    const docId = `${format(values.date, 'yyyy-MM-dd')}_${userProfile.nickname}_${values.adAccount}_${values.adCampaign}`;
    const inquiryRef = doc(firestore, 'campaign_inquiries', docId);

    const data = {
        id: docId,
        date: values.date.toISOString(),
        adAccount: values.adAccount,
        adCampaign: values.adCampaign,
        smallTicketInquiries: values.smallTicketInquiries,
        mediumTicketInquiries: values.mediumTicketInquiries,
        largeTicketInquiries: values.largeTicketInquiries,
        xlTicketInquiries: values.xlTicketInquiries,
        submittedBy: userProfile.nickname,
        timestamp: new Date().toISOString(),
    };
    
    setDocumentNonBlocking(inquiryRef, data, { merge: true });

    toast({
        title: 'Success!',
        description: `Inquiries for ${format(values.date, 'PPP')} have been saved.`,
    });
    
    form.reset({
      date: new Date(),
      adAccount: values.adAccount,
      adCampaign: values.adCampaign,
      smallTicketInquiries: 0,
      mediumTicketInquiries: 0,
      largeTicketInquiries: 0,
      xlTicketInquiries: 0,
    });
    onFormSubmit();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Log Daily Ad Inquiries</CardTitle>
          <CardDescription>Enter the number of inquiries received for each ad ticket size per day.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        max={format(new Date(), 'yyyy-MM-dd')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="adAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AD Account</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                 <FormField
                  control={form.control}
                  name="adCampaign"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel>AD Campaign</FormLabel>
                        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setIsManageOpen(true)}>
                          <Cog className="h-4 w-4"/> Manage
                        </Button>
                      </div>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select Campaign" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              {campaigns?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="smallTicketInquiries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Small Ticket (1-10)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mediumTicketInquiries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medium Ticket (11-50)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="largeTicketInquiries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Large Ticket (51-300)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="xlTicketInquiries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>XL Ticket (301+)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

              <Button type="submit" className="w-full">Save Inquiries</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <ManageCampaignsDialog open={isManageOpen} onOpenChange={setIsManageOpen} onCampaignsUpdate={refetchCampaigns}/>
    </>
  );
}

// --- Table Component ---
function CampaignInquiriesTable({ key }: { key: number }) {
  const firestore = useFirestore();
  const inquiriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'campaign_inquiries'), orderBy('timestamp', 'desc')) : null, [firestore]);
  const { data: inquiries, isLoading, error } = useCollection<CampaignInquiry>(inquiriesQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Inquiry Logs</CardTitle>
        <CardDescription>A log of recently submitted daily inquiries.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>AD Account</TableHead>
                <TableHead>AD Campaign</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead className="text-right">Small</TableHead>
                <TableHead className="text-right">Medium</TableHead>
                <TableHead className="text-right">Large</TableHead>
                <TableHead className="text-right">XL</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-destructive">
                    Error loading data: {error.message}
                  </TableCell>
                </TableRow>
              ) : inquiries && inquiries.length > 0 ? (
                inquiries.map(inquiry => {
                    const total = inquiry.smallTicketInquiries + inquiry.mediumTicketInquiries + inquiry.largeTicketInquiries + inquiry.xlTicketInquiries;
                    return (
                        <TableRow key={inquiry.id}>
                            <TableCell>{format(new Date(inquiry.date), 'PPP')}</TableCell>
                            <TableCell>{inquiry.adAccount}</TableCell>
                            <TableCell>{inquiry.adCampaign}</TableCell>
                            <TableCell>{inquiry.submittedBy}</TableCell>
                            <TableCell className="text-right">{inquiry.smallTicketInquiries}</TableCell>
                            <TableCell className="text-right">{inquiry.mediumTicketInquiries}</TableCell>
                            <TableCell className="text-right">{inquiry.largeTicketInquiries}</TableCell>
                            <TableCell className="text-right">{inquiry.xlTicketInquiries}</TableCell>
                            <TableCell className="text-right font-bold">{total}</TableCell>
                        </TableRow>
                    )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
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
  const handleFormSubmit = () => {
    setTableKey(prev => prev + 1);
  };
  return (
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
            <div className="xl:col-span-2">
                <CampaignInquiryForm onFormSubmit={handleFormSubmit} />
            </div>
            <div className="xl:col-span-3">
                <CampaignInquiriesTable key={tableKey} />
            </div>
        </div>
      </main>
    </Header>
  );
}

    