
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose, DialogFooter } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { Skeleton } from './ui/skeleton';

const unclosedLeadSchema = z.object({
  id: z.string(),
  date: z.string(),
  customerName: z.string().nullable().optional().transform(v => v || ''),
  contactDetails: z.string().optional(),
  quantity: z.string().optional(),
  estimatedTotalAmount: z.string().optional(),
  layoutSent: z.boolean().default(false),
  quotationSent: z.boolean().default(false),
  forSampleJacket: z.boolean().default(false),
  forMeetUp: z.boolean().default(false),
  dateOfMeetUp: z.string().optional(),
  estimatedDateForDp: z.string().optional(),
  status: z.string().optional(),
  remarks: z.string().optional(),
  nextFollowUpDate: z.string().optional(),
  sces: z.string().min(1, 'SCES is required'),
  createdBy: z.string(),
}).refine(data => data.customerName.length > 0, {
    message: "Customer name is required",
    path: ["customerName"],
});


type UnclosedLead = z.infer<typeof unclosedLeadSchema>;

const LeadForm = ({ onSave, lead, onClose }: { onSave: (data: UnclosedLead) => void; lead: Partial<UnclosedLead> | null; onClose: () => void; }) => {
  const { userProfile } = useUser();
  const form = useForm<UnclosedLead>({
    resolver: zodResolver(unclosedLeadSchema),
    defaultValues: {
      id: lead?.id || uuidv4(),
      date: lead?.date ? format(new Date(lead.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      customerName: lead?.customerName || '',
      contactDetails: lead?.contactDetails || '',
      quantity: lead?.quantity || '',
      estimatedTotalAmount: lead?.estimatedTotalAmount || '',
      layoutSent: lead?.layoutSent || false,
      quotationSent: lead?.quotationSent || false,
      forSampleJacket: lead?.forSampleJacket || false,
      forMeetUp: lead?.forMeetUp || false,
      dateOfMeetUp: lead?.dateOfMeetUp ? format(new Date(lead.dateOfMeetUp), 'yyyy-MM-dd') : '',
      estimatedDateForDp: lead?.estimatedDateForDp ? format(new Date(lead.estimatedDateForDp), 'yyyy-MM-dd') : '',
      status: lead?.status || '',
      remarks: lead?.remarks || '',
      nextFollowUpDate: lead?.nextFollowUpDate ? format(new Date(lead.nextFollowUpDate), 'yyyy-MM-dd') : '',
      sces: lead?.sces || userProfile?.nickname || '',
      createdBy: lead?.createdBy || userProfile?.nickname || '',
    },
  });
  
  const formId = `lead-form-${lead?.id || 'new'}`;

  const onSubmit = (data: UnclosedLead) => {
    onSave({
      ...data,
      date: new Date(data.date).toISOString(),
      dateOfMeetUp: data.dateOfMeetUp ? new Date(data.dateOfMeetUp).toISOString() : '',
      estimatedDateForDp: data.estimatedDateForDp ? new Date(data.estimatedDateForDp).toISOString() : '',
      nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate).toISOString() : '',
    });
  };
  
  const formFields = [
    { name: "date", label: "Date", type: "date" },
    { name: "customerName", label: "Customer Name" },
    { name: "contactDetails", label: "Contact Details" },
    { name: "quantity", label: "Quantity" },
    { name: "estimatedTotalAmount", label: "Est. Total Amount" },
    { name: "dateOfMeetUp", label: "Date of Meetup", type: "date" },
    { name: "estimatedDateForDp", label: "Est. Date for DP", type: "date" },
    { name: "status", label: "Status" },
    { name: "remarks", label: "Remarks", type: "textarea" },
    { name: "nextFollowUpDate", label: "Next Follow-up", type: "date" },
    { name: "sces", label: "SCES" },
  ] as const;

  const checkboxFields = [
    { name: "layoutSent", label: "Layout Sent" },
    { name: "quotationSent", label: "Quotation Sent" },
    { name: "forSampleJacket", label: "For Sample Jacket" },
    { name: "forMeetUp", label: "For Meetup" },
  ] as const;

  return (
    <FormProvider {...form}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{lead?.id ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
        </DialogHeader>
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
          <ScrollArea className="max-h-[70vh] -mx-6 px-6">
            <div className="grid grid-cols-2 gap-4 p-4">
              {formFields.map(f => {
                if (f.name === 'estimatedTotalAmount') {
                  return (
                    <div key={f.name} className="space-y-2">
                      <Label htmlFor={f.name}>{f.label}</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black">₱</span>
                        <Input
                          id={f.name}
                          type="text"
                          className="pl-7 text-right"
                          value={
                            form.watch(f.name)
                              ? new Intl.NumberFormat('en-US').format(Number(String(form.watch(f.name)).replace(/[^0-9]/g, '')))
                              : ''
                          }
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            form.setValue(f.name, value, { shouldValidate: true, shouldDirty: true });
                          }}
                        />
                      </div>
                      {form.formState.errors[f.name] && <p className="text-sm text-destructive">{form.formState.errors[f.name]?.message}</p>}
                    </div>
                  )
                }
                return (
                  <div key={f.name} className="space-y-2">
                    <Label htmlFor={f.name}>{f.label}</Label>
                    {f.type === 'textarea' ? (
                      <Textarea id={f.name} {...form.register(f.name)} />
                    ) : (
                      <Input id={f.name} type={f.type || 'text'} {...form.register(f.name)} />
                    )}
                    {form.formState.errors[f.name] && <p className="text-sm text-destructive">{form.formState.errors[f.name]?.message}</p>}
                  </div>
                )
              })}
              <div className="col-span-2 grid grid-cols-2 gap-4">
                {checkboxFields.map(f => (
                  <div key={f.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={f.name}
                      checked={form.watch(f.name)}
                      onCheckedChange={(checked) => {
                        form.setValue(f.name, !!checked, { shouldDirty: true });
                      }}
                    />
                    <Label htmlFor={f.name}>{f.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </form>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></DialogClose>
          <Button type="submit" form={formId}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </FormProvider>
  );
};


export function UnclosedLeadsTable({ isReadOnly }: { isReadOnly: boolean }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const leadsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'unclosedLeads'), orderBy('date', 'desc')) : null), [firestore]);
  const { data: leads, isLoading, error, refetch } = useCollection<UnclosedLead>(leadsQuery, unclosedLeadSchema);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<UnclosedLead | null>(null);
  const [deletingLead, setDeletingLead] = useState<UnclosedLead | null>(null);
  
  const handleSave = async (data: UnclosedLead) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'unclosedLeads', data.id);
    try {
      await setDoc(docRef, data, { merge: true });
      toast({ title: `Lead ${editingLead ? 'updated' : 'added'} successfully!` });
      setIsDialogOpen(false);
      setEditingLead(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: e.message });
    }
  };

  const handleDelete = async () => {
    if (!deletingLead || !firestore) return;
    const docRef = doc(firestore, 'unclosedLeads', deletingLead.id);
    try {
      await deleteDoc(docRef);
      toast({ title: 'Lead deleted successfully!' });
      setDeletingLead(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete failed', description: e.message });
    }
  };

  const columns = [
    { key: 'date', label: 'Date', format: (d: string) => format(parseISO(d), 'MM-dd-yyyy') },
    { key: 'customerName', label: 'Customer Name' },
    { key: 'contactDetails', label: 'Contact Details' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'estimatedTotalAmount', label: 'Est. Total Amount' },
    { key: 'layoutSent', label: 'Layout Sent' },
    { key: 'quotationSent', label: 'Quotation Sent' },
    { key: 'forSampleJacket', label: 'For Sample Jacket' },
    { key: 'forMeetUp', label: 'For Meet Up' },
    { key: 'dateOfMeetUp', label: 'Date of Meet Up' },
    { key: 'estimatedDateForDp', label: 'Est. Date for DP', format: (d: string) => d ? format(new Date(d), 'MM-dd-yyyy') : '' },
    { key: 'status', label: 'Status' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'nextFollowUpDate', label: 'Next Follow-up', format: (d: string) => d ? format(new Date(d), 'MM-dd-yyyy') : '' },
    { key: 'sces', label: 'SCES' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Unclosed Leads</CardTitle>
          <CardDescription>A record of leads that have not yet been converted to orders.</CardDescription>
        </div>
        {!isReadOnly && (
          <Button onClick={() => { setEditingLead(null); setIsDialogOpen(true); }}>
            <Plus className="mr-2" /> Add Lead
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-20rem)]">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(c => <TableHead key={c.key} className="py-2 px-1 text-center align-middle">{c.label}</TableHead>)}
                {!isReadOnly && <TableHead className="py-2 px-1 text-center align-middle">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                    <Skeleton className="h-24 w-full" />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center text-destructive">Error: {error.message}</TableCell>
                </TableRow>
              ) : leads && leads.length > 0 ? (
                leads.map(lead => (
                  <TableRow key={lead.id}>
                    {columns.map(col => (
                      <TableCell key={col.key} className="p-2 text-center align-middle text-xs">
                        {typeof lead[col.key as keyof UnclosedLead] === 'boolean' ? (
                          (lead[col.key as keyof UnclosedLead] ? <Check className="text-green-500 mx-auto" /> : <X className="text-red-500 mx-auto" />)
                        ) : col.key === 'dateOfMeetUp' ? (
                          lead.dateOfMeetUp ? format(new Date(lead.dateOfMeetUp), 'MM-dd-yyyy') : <span className="text-gray-500">-</span>
                        ) : col.format ? (
                          (lead[col.key as keyof UnclosedLead] ? col.format(lead[col.key as keyof UnclosedLead] as string) : '')
                        ) : col.key === 'estimatedTotalAmount' && lead.estimatedTotalAmount ? (
                          `₱${new Intl.NumberFormat('en-US').format(Number(String(lead.estimatedTotalAmount).replace(/,/g, '')))}`
                        ) : (
                          (lead[col.key as keyof UnclosedLead] as string | number) || ''
                        )}
                      </TableCell>
                    ))}
                    {!isReadOnly && (
                      <TableCell className="p-1 text-center align-middle text-xs">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingLead(lead); setIsDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingLead(lead)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                    No Record Yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>

      {isDialogOpen && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <LeadForm onSave={handleSave} lead={editingLead} onClose={() => setIsDialogOpen(false)} />
        </Dialog>
      )}

      {deletingLead && (
        <AlertDialog open={!!deletingLead} onOpenChange={() => setDeletingLead(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete this lead entry. This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
