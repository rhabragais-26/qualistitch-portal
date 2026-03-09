'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, updateDoc, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Header } from '@/components/header';
import { formatJoNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { toTitleCase } from '@/lib/utils';

type Lead = {
  id: string;
  joNumber?: number;
  customerName: string;
  deliveryDate: string | null;
  submissionDateTime: string;
  city?: string;
  province?: string;
  houseStreet?: string;
  barangay?: string;
  location?: string;
  isInternational?: boolean;
  salesRepresentative: string;
};

const addressSchema = z.object({
  isInternational: z.boolean(),
  houseStreet: z.string().optional(),
  barangay: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  internationalAddress: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.isInternational) {
      if (!data.internationalAddress || data.internationalAddress.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['internationalAddress'],
          message: 'International address is required.',
        });
      }
    } else {
      if (!data.houseStreet || data.houseStreet.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['houseStreet'],
          message: 'House/Street is required for PH addresses.',
        });
      }
    }
  });

type AddressFormValues = z.infer<typeof addressSchema>;

const AddressEditDialog = ({ lead, isOpen, onSave, onCancel }: { lead: Lead; isOpen: boolean; onSave: () => void; onCancel: () => void; }) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const formMethods = useForm<AddressFormValues>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
            isInternational: lead.isInternational || false,
            houseStreet: lead.houseStreet || '',
            barangay: lead.barangay || '',
            city: lead.city || '',
            province: lead.province || '',
            internationalAddress: lead.isInternational ? lead.location : '',
        }
    });

    const { handleSubmit, watch, control } = formMethods;
    const isInternational = watch('isInternational');
    
    const onSubmit = async (data: AddressFormValues) => {
        setIsSaving(true);
        try {
            const location = data.isInternational 
                ? data.internationalAddress 
                : [
                    [data.houseStreet, data.barangay].filter(Boolean).map(toTitleCase).join(' '), 
                    [data.city, data.province].filter(Boolean).map(toTitleCase).join(' ')
                  ].filter(Boolean).join(', ');
            
            const updateData = {
                isInternational: data.isInternational,
                houseStreet: data.isInternational ? '' : toTitleCase(data.houseStreet || ''),
                barangay: data.isInternational ? '' : toTitleCase(data.barangay || ''),
                city: data.isInternational ? '' : toTitleCase(data.city || ''),
                province: data.isInternational ? '' : toTitleCase(data.province || ''),
                internationalAddress: data.isInternational ? data.internationalAddress : '',
                location: location || '',
            };

            const leadDocRef = doc(firestore, 'leads', lead.id);
            await updateDoc(leadDocRef, updateData);

            toast({ title: 'Address Updated', description: `Address for ${lead.customerName} has been saved.` });
            onSave();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Address for {lead.customerName}</DialogTitle>
                    <DialogDescription>J.O. No: {formatJoNumber(lead.joNumber)}</DialogDescription>
                </DialogHeader>
                <FormProvider {...formMethods}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {isInternational ? (
                             <FormField
                                control={control}
                                name="internationalAddress"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>International Address</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Enter full international address" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                             <div className="space-y-4">
                                <FormField control={control} name="houseStreet" render={({ field }) => (
                                    <FormItem><FormLabel>House No., Street, Village, Landmark & Others</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <div className="grid grid-cols-2 gap-4">
                                <FormField control={control} name="barangay" render={({ field }) => (
                                    <FormItem><FormLabel>Barangay</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={control} name="city" render={({ field }) => (
                                    <FormItem><FormLabel>City / Municipality</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                </div>
                                <FormField control={control} name="province" render={({ field }) => (
                                    <FormItem><FormLabel>Province</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                             </div>
                        )}
                        <FormField
                            control={control}
                            name="isInternational"
                            render={({ field }) => (
                                <FormItem className="flex items-center gap-2 pt-4">
                                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <FormLabel className="!mt-0">Is this order for delivery outside the Philippines?</FormLabel>
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Address'}</Button>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}

export default function DataIssuesPage() {
  const firestore = useFirestore();
  const [joFilter, setJoFilter] = useState('All');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [locationSearch, setLocationSearch] = useState('');

  const allLeadsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'leads'));
  }, [firestore]);

  const { data: leads, isLoading, error, refetch } = useCollection<Lead>(allLeadsQuery, undefined, { listen: false });

  const leadsToDisplay = useMemo(() => {
    if (!leads) return [];
    
    let filtered = leads;

    if (joFilter === 'With JO') {
      filtered = filtered.filter(lead => !!lead.joNumber);
    } else if (joFilter === 'Without JO') {
      filtered = filtered.filter(lead => !lead.joNumber);
    }

    if (locationSearch) {
        const lowerLocationSearch = locationSearch.toLowerCase();
        filtered = filtered.filter(lead => 
            (lead.city && lead.city.toLowerCase().includes(lowerLocationSearch)) ||
            (lead.province && lead.province.toLowerCase().includes(lowerLocationSearch))
        );
    }

    return filtered
      .sort((a, b) => {
        const dateA = new Date(a.submissionDateTime).getTime();
        const dateB = new Date(b.submissionDateTime).getTime();
        return dateB - dateA;
      });
  }, [leads, joFilter, locationSearch]);

  return (
    <>
    <Header>
      <main className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
             <div className="flex justify-between items-center">
              <div>
                <CardTitle>Data Integrity Checking</CardTitle>
                <CardDescription>Review all orders to ensure data integrity.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search City or Province..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="w-[200px]"
                />
                <Select value={joFilter} onValueChange={setJoFilter}>
                    <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by J.O." />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="All">All Orders</SelectItem>
                    <SelectItem value="With JO">With J.O.</SelectItem>
                    <SelectItem value="Without JO">Without J.O.</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submission Date</TableHead>
                    <TableHead>J.O. Number</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>City/Municipality</TableHead>
                    <TableHead>Province</TableHead>
                    <TableHead>SCES</TableHead>
                    <TableHead>Delivery Date Value</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-24 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-destructive">
                        Error loading data: {error.message}. You may need to create a Firestore index for this query. Check the browser console for a link.
                      </TableCell>
                    </TableRow>
                  ) : leadsToDisplay.length > 0 ? (
                    leadsToDisplay.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell>{format(new Date(lead.submissionDateTime), 'MMM-dd-yy')}</TableCell>
                        <TableCell className={cn(!lead.joNumber && 'text-red-500 font-bold')}>
                          {lead.joNumber ? formatJoNumber(lead.joNumber) : 'N/A'}
                        </TableCell>
                        <TableCell>{lead.customerName}</TableCell>
                        <TableCell className={cn(!lead.city && 'text-red-500 font-bold')}>{lead.city || 'N/A'}</TableCell>
                        <TableCell>{lead.province || 'N/A'}</TableCell>
                        <TableCell>{lead.salesRepresentative}</TableCell>
                        <TableCell className={cn('font-mono', !lead.deliveryDate && 'text-red-500 font-bold')}>
                          {lead.deliveryDate === null ? 'null' : lead.deliveryDate === '' ? '"" (empty string)' : lead.deliveryDate ? format(new Date(lead.deliveryDate), 'MMM-dd-yy') : 'undefined'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/job-order/${lead.id}`}>
                                Edit J.O.
                                </Link>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setEditingLead(lead)}>
                                Edit Address
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No orders found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </Header>
    {editingLead && (
        <AddressEditDialog
            lead={editingLead}
            isOpen={!!editingLead}
            onSave={() => {
              setEditingLead(null);
              refetch();
            }}
            onCancel={() => setEditingLead(null)}
        />
    )}
    </>
  );
}
    