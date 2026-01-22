
'use client';

import { useFirestore, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { doc, updateDoc, collection, query } from 'firebase/firestore';
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
import React, { useState, useMemo, useCallback } from 'react';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { formatDateTime, toTitleCase, formatCurrency } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { z } from 'zod';
import Link from 'next/link';
import { Label } from './ui/label';
import { addDays, format } from 'date-fns';

const leadSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  companyName: z.string().optional(),
  contactNumber: z.string().optional(),
  landlineNumber: z.string().optional(),
  salesRepresentative: z.string(),
  priorityType: z.string(),
  orderType: z.string(),
  orders: z.array(z.any()),
  submissionDateTime: z.string(),
  lastModified: z.string(),
  grandTotal: z.number().optional(),
  paidAmount: z.number().optional(),
  paymentType: z.string().optional(),
  modeOfPayment: z.string().optional(),
  balance: z.number().optional(),
  productType: z.string().optional(),
  joNumber: z.number().optional(),
  shipmentStatus: z.string().optional(),
  payments: z.array(z.any()).optional(),
  courier: z.string().optional(),
  deliveryDate: z.string().optional().nullable(),
  adjustedDeliveryDate: z.string().optional().nullable(),
});

type Lead = z.infer<typeof leadSchema>;

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

const remittanceOptions = [
    "J&T Remittance",
    "LBC Remittance",
    "CASH",
    "GCash (Jam)",
    "GCash (Jonathan)",
    "GCash (Jhun)",
    "GCash (Jays)",
    "GCash (Tantan)",
    "Paymaya",
    "Bank Transfer to BDO",
    "Bank Transfer to BPI",
    "Bank Transfer to ChinaBank",
];

export function ReceivablesTable({ isReadOnly, filterType = 'RECEIVABLES' }: { isReadOnly: boolean; filterType?: 'RECEIVABLES' | 'FULLY_PAID' }) {
  const firestore = useFirestore();
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const { toast } = useToast();
  const { userProfile } = useUser();

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading: areLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery, leadSchema);

  const [confirmingLead, setConfirmingLead] = useState<Lead | null>(null);
  const [remittanceMode, setRemittanceMode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const [csrFilter, setCsrFilter] = useState('All');
  const [openCustomerDetails, setOpenCustomerDetails] = useState<string | null>(null);

  const salesRepresentatives = useMemo(() => {
    if (!leads) return [];
    return [...new Set(leads.map(lead => lead.salesRepresentative).filter(Boolean))].sort();
  }, [leads]);
  
  const processedLeads = useMemo(() => {
    if (!leads) return [];
  
    const customerOrderStats: { [key: string]: { orders: Lead[], totalCustomerQuantity: number } } = {};
  
    leads.forEach(lead => {
      const name = lead.customerName.toLowerCase();
      if (!customerOrderStats[name]) {
        customerOrderStats[name] = { orders: [], totalCustomerQuantity: 0 };
      }
      customerOrderStats[name].orders.push(lead);
      const orderQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
      customerOrderStats[name].totalCustomerQuantity += orderQuantity;
    });
  
    const enrichedLeads: EnrichedLead[] = [];
  
    Object.values(customerOrderStats).forEach(({ orders, totalCustomerQuantity }) => {
      orders.sort((a, b) => new Date(a.submissionDateTime).getTime() - new Date(b.submissionDateTime).getTime());
      orders.forEach((lead, index) => {
        enrichedLeads.push({
          ...lead,
          orderNumber: index + 1,
          totalCustomerQuantity,
        });
      });
    });
  
    return enrichedLeads;
  }, [leads]);

  const formatJoNumber = useCallback((joNumber: number | undefined) => {
    if (!joNumber) return 'N/A';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  }, []);

  const filteredLeads = useMemo(() => {
    if (!processedLeads) return [];

    return processedLeads.filter(lead => {
      if (filterType === 'RECEIVABLES') {
        if (lead.balance === undefined || lead.balance <= 0) return false;
      } else { // 'FULLY_PAID'
        if (lead.paymentType !== 'Fully Paid' || (lead.balance !== undefined && lead.balance > 0)) return false;
      }

      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ? 
        (toTitleCase(lead.customerName).toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && toTitleCase(lead.companyName).toLowerCase().includes(lowercasedSearchTerm)) ||
        (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))) ||
        (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))))
        : true;
      
      const matchesCsr = csrFilter === 'All' || lead.salesRepresentative === csrFilter;
      
      const lowercasedJoSearch = joNumberSearch.toLowerCase();
      const matchesJo = joNumberSearch ? 
        (lead.joNumber && (
            formatJoNumber(lead.joNumber).toLowerCase().includes(lowercasedJoSearch) ||
            lead.joNumber.toString().padStart(5, '0').slice(-5) === lowercasedJoSearch.slice(-5)
        ))
        : true;

      return matchesSearch && matchesCsr && matchesJo;
    }).sort((a,b) => new Date(b.submissionDateTime).getTime() - new Date(a.submissionDateTime).getTime());
  }, [processedLeads, searchTerm, csrFilter, joNumberSearch, filterType, formatJoNumber]);

  const handleMarkAsFullyPaid = async () => {
    if (!confirmingLead || !firestore || !userProfile || !remittanceMode) {
        if (!remittanceMode) {
            toast({
                variant: 'destructive',
                title: 'Payment Mode Required',
                description: 'Please select a mode of payment.',
            });
        }
        return;
    }

    const lead = confirmingLead;
    const leadDocRef = doc(firestore, 'leads', lead.id);
    try {
        const grandTotal = lead.grandTotal || 0;
        const payments = lead.payments || [];
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

        const updatedPayment: any = {
            type: 'full',
            amount: grandTotal - totalPaid,
            mode: remittanceMode,
        }

        await updateDoc(leadDocRef, {
            paymentType: "Fully Paid",
            balance: 0,
            paidAmount: grandTotal,
            payments: [...payments, updatedPayment],
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile.nickname,
        });
        toast({
            title: "Payment Updated",
            description: `Order for ${lead.customerName} has been marked as fully paid.`,
        });
    } catch (e: any) {
        console.error("Error marking as fully paid:", e);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: e.message || "Could not update payment status.",
        });
    } finally {
        setConfirmingLead(null);
        setRemittanceMode('');
    }
  };

  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || null;
  }, []);

  const toggleCustomerDetails = useCallback((leadId: string) => {
    setOpenCustomerDetails(openCustomerDetails === leadId ? null : leadId);
  }, [openCustomerDetails]);
  
  if (areLeadsLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (<Skeleton key={i} className="h-16 w-full bg-gray-200" />))}
      </div>
    );
  }

  if (leadsError) {
    return <div className="text-red-500 p-4">Error loading records: {leadsError.message}</div>;
  }

  return (
    <>
      <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col border-none">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-black">{filterType === 'RECEIVABLES' ? 'Receivables' : 'Fully Paid Orders'}</CardTitle>
              <CardDescription className="text-gray-600">
                {filterType === 'RECEIVABLES' ? 'Manage and track outstanding payments from customers.' : 'A record of all fully paid orders.'}
              </CardDescription>
            </div>
             <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-4">
                    <Select value={csrFilter} onValueChange={setCsrFilter}>
                        <SelectTrigger className="w-[180px] bg-gray-100 text-black placeholder:text-gray-500">
                        <SelectValue placeholder="Filter by SCES" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="All">All SCES</SelectItem>
                        {salesRepresentatives.map(csr => (<SelectItem key={csr} value={csr}>{csr}</SelectItem>))}
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder="Search by J.O. No..."
                        value={joNumberSearch}
                        onChange={(e) => setJoNumberSearch(e.target.value)}
                        className="bg-gray-100 text-black placeholder:text-gray-500 w-48"
                    />
                    <div className="flex-1 min-w-[300px]">
                        <Input
                        placeholder="Search customer, company or contact..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-100 text-black placeholder:text-gray-500"
                        />
                    </div>
                </div>
                <div className="w-full text-right">
                {filterType === 'RECEIVABLES' ? (
                  <Link href="/finance/fully-paid-orders" className="text-sm text-primary hover:underline">
                    View Fully Paid Orders
                  </Link>
                ) : (
                  <Link href="/finance/receivables" className="text-sm text-primary hover:underline">
                    View Receivables
                  </Link>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="border rounded-md relative">
            <Table>
              <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                <TableRow>
                    <TableHead className="text-white align-middle text-center">Date & Time</TableHead>
                    <TableHead className="text-white align-middle text-center">Customer</TableHead>
                    <TableHead className="text-white align-middle text-center">SCES</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">J.O. Number</TableHead>
                    <TableHead className="text-white align-middle text-center">Total Amount</TableHead>
                    <TableHead className="text-white align-middle text-center">Paid Amount</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">Balance</TableHead>
                    <TableHead className="text-white align-middle text-center">Payment Type</TableHead>
                    <TableHead className="text-white align-middle text-center">Mode of Payment</TableHead>
                    <TableHead className="text-white align-middle text-center">Items</TableHead>
                    <TableHead className="text-white align-middle text-center">Est. Delivery Date</TableHead>
                    {filterType === 'RECEIVABLES' && <TableHead className="text-white font-bold align-middle text-center w-[160px]">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const isRepeat = lead.orderNumber > 1;
                  return (
                    <React.Fragment key={lead.id}>
                        <TableRow>
                            <TableCell className="text-xs align-middle text-center py-2 text-black">{formatDateTime(lead.submissionDateTime).dateTime}</TableCell>
                            <TableCell className="text-xs align-middle text-center py-2 text-black">
                               <div className="flex items-center justify-center">
                                    <Button variant="ghost" size="sm" onClick={() => toggleCustomerDetails(lead.id)} className="h-5 px-1 mr-1">
                                    {openCustomerDetails === lead.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                    <div className='flex flex-col items-center'>
                                        <span className="font-medium">{toTitleCase(lead.customerName)}</span>
                                        {isRepeat ? (
                                            <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                <div className="flex items-center gap-1.5 cursor-pointer">
                                                    <span className="text-xs text-yellow-600 font-semibold">Repeat Buyer</span>
                                                    <span className="flex items-center justify-center h-5 w-5 rounded-full border-2 border-yellow-600 text-yellow-700 text-[10px] font-bold">
                                                    {lead.orderNumber}
                                                    </span>
                                                </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                <p>Total of {lead.totalCustomerQuantity} items ordered.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            </TooltipProvider>
                                        ) : (<span className="text-xs text-blue-600 font-semibold">New Customer</span>)}
                                        {openCustomerDetails === lead.id && (
                                            <div className="mt-1 space-y-0.5 text-gray-500 text-[11px] font-normal text-center">
                                                {lead.companyName && lead.companyName !== '-' && <div>{toTitleCase(lead.companyName)}</div>}
                                                {getContactDisplay(lead) && <div>{getContactDisplay(lead)}</div>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.salesRepresentative}</TableCell>
                            <TableCell className="text-xs align-middle text-center py-2 text-black">{formatJoNumber(lead.joNumber)}</TableCell>
                            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.grandTotal != null ? formatCurrency(lead.grandTotal) : '-'}</TableCell>
                            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.paidAmount != null ? formatCurrency(lead.paidAmount) : '-'}</TableCell>
                            <TableCell className="text-xs align-middle text-center py-2 font-bold text-destructive">{lead.balance != null ? formatCurrency(lead.balance) : '-'}</TableCell>
                            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.paymentType}</TableCell>
                            <TableCell className="text-xs align-middle text-center py-2 text-black">{lead.paymentType === 'COD' ? 'CASH' : (lead.modeOfPayment || '-')}</TableCell>
                            <TableCell className="text-xs align-middle text-center py-2 text-black">
                              <Button variant="secondary" size="sm" onClick={() => setOpenLeadId(openLeadId === lead.id ? null : lead.id)} className="h-8 px-2 text-black hover:bg-gray-200">
                                View
                                {openLeadId === lead.id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                              </Button>
                            </TableCell>
                            <TableCell className="text-xs align-middle text-center py-2 text-black">
                                {format(
                                    lead.adjustedDeliveryDate 
                                        ? new Date(lead.adjustedDeliveryDate) 
                                        : (lead.deliveryDate 
                                            ? new Date(lead.deliveryDate) 
                                            : addDays(new Date(lead.submissionDateTime), lead.priorityType === 'Rush' ? 7 : 22)),
                                    "MMM dd, yyyy"
                                )}
                                {lead.adjustedDeliveryDate && <div className="text-gray-500 text-[10px]">(Adjusted)</div>}
                            </TableCell>
                            {filterType === 'RECEIVABLES' && (
                                <TableCell className="text-center align-middle py-2">
                                    <Button size="sm" className="h-7" onClick={() => setConfirmingLead(lead)} disabled={isReadOnly}>
                                        Mark as Fully Paid
                                    </Button>
                                </TableCell>
                            )}
                        </TableRow>
                        {openLeadId === lead.id && (
                             <TableRow>
                                <TableCell colSpan={filterType === 'RECEIVABLES' ? 13 : 12} className="p-0">
                                    <div className="p-4 max-w-xl mx-auto bg-blue-50 rounded-md my-2">
                                        <h4 className="font-semibold text-black mb-2 text-center">Ordered Items</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                <TableHead className="py-1 px-2 text-black font-bold text-center align-middle">Product Type</TableHead>
                                                <TableHead className="py-1 px-2 text-black font-bold text-center align-middle">Color</TableHead>
                                                <TableHead className="py-1 px-2 text-black font-bold text-center align-middle">Size</TableHead>
                                                <TableHead className="py-1 px-2 text-black font-bold text-center align-middle">Quantity</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {lead.orders?.map((order: any, index: number) => (
                                                <TableRow key={order.id || index} className="border-0">
                                                    <TableCell className="py-1 px-2 text-xs text-black text-center align-middle">{order.productType}</TableCell>
                                                    <TableCell className="py-1 px-2 text-xs text-black text-center align-middle">{order.color}</TableCell>
                                                    <TableCell className="py-1 px-2 text-xs text-black text-center align-middle">{order.size}</TableCell>
                                                    <TableCell className="py-1 px-2 text-xs text-black text-center align-middle">{order.quantity}</TableCell>
                                                </TableRow>
                                                ))}
                                            </TableBody>
                                            {lead.orders && lead.orders.length > 1 && (
                                              <TableFooter>
                                                  <TableRow>
                                                  <TableCell colSpan={3} className="text-right font-bold text-black pt-1 px-2">Total Quantity</TableCell>
                                                  <TableCell className="font-bold text-black text-center pt-1 px-2">{lead.orders?.reduce((sum, order) => sum + order.quantity, 0)}</TableCell>
                                                  </TableRow>
                                              </TableFooter>
                                            )}
                                        </Table>
                                    </div>
                                </TableCell>
                             </TableRow>
                        )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {confirmingLead && (
        <AlertDialog open={!!confirmingLead} onOpenChange={() => setConfirmingLead(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Full Payment</AlertDialogTitle>
                    <AlertDialogDescription>
                        Confirm payment for <strong>{confirmingLead.customerName}</strong>. Select the mode of payment for the remaining balance of <strong>{formatCurrency(confirmingLead.balance || 0)}</strong>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <Label htmlFor="remittance-mode">Mode of Payment</Label>
                    <Select onValueChange={setRemittanceMode} value={remittanceMode}>
                        <SelectTrigger id="remittance-mode">
                            <SelectValue placeholder="Select a mode" />
                        </SelectTrigger>
                        <SelectContent>
                           {remittanceOptions.map(option => (
                               <SelectItem key={option} value={option}>{option}</SelectItem>
                           ))}
                        </SelectContent>
                    </Select>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => { setConfirmingLead(null); setRemittanceMode(''); }}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleMarkAsFullyPaid} disabled={!remittanceMode}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
