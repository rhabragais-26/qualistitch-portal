

'use client';

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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, doc, updateDoc } from 'firebase/firestore';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, formatDateTime, formatCurrency, toTitleCase } from '@/lib/utils';
import { Input } from './ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { format } from 'date-fns';

type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
}

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber?: string;
  landlineNumber?: string;
  joNumber?: number;
  orders: Order[];
  submissionDateTime: string;
  isSalesAuditRequested?: boolean;
  isSalesAuditComplete?: boolean;
  salesAuditCompleteTimestamp?: string;
  grandTotal?: number;
  paidAmount?: number;
  balance?: number;
  paymentType?: string;
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  adjustedDeliveryDate?: string | null;
  lastModifiedBy?: string;
  orderType?: string;
  forceNewCustomer?: boolean;
}

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

type AdjustmentState = {
    status: 'Yes' | 'No' | 'NotSelected';
    date?: string;
}

export function AuditForShipmentTable({ isReadOnly }: { isReadOnly: boolean }) {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads } = useCollection<Lead>(leadsQuery, undefined, { listen: false });
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const [openCustomerDetails, setOpenCustomerDetails] = useState<string | null>(null);
  const [adjustmentStates, setAdjustmentStates] = useState<Record<string, AdjustmentState>>({});
  
  useEffect(() => {
    if(leads) {
        const initialAdjustments: Record<string, AdjustmentState> = {};
        leads.forEach(lead => {
            if (lead.adjustedDeliveryDate) {
                initialAdjustments[lead.id] = { status: 'Yes', date: format(new Date(lead.adjustedDeliveryDate), 'yyyy-MM-dd') };
            } else if (lead.isSalesAuditComplete) {
                initialAdjustments[lead.id] = { status: 'No' };
            }
        });
        setAdjustmentStates(initialAdjustments);
    }
  }, [leads]);

  const toggleCustomerDetails = useCallback((leadId: string) => {
    setOpenCustomerDetails(openCustomerDetails === leadId ? null : leadId);
  }, [openCustomerDetails]);

  const handleAdjustmentStateChange = useCallback((leadId: string, updates: Partial<AdjustmentState>) => {
    setAdjustmentStates(prev => ({
        ...prev,
        [leadId]: {
            ...prev[leadId] || { status: 'NotSelected' },
            ...updates,
        }
    }));
  }, []);

  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || null;
  }, []);

  const formatJoNumber = useCallback((joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  }, []);

  const handleProceedToShipment = async (lead: Lead) => {
    if (!firestore) return;

    const leadAdjustmentState = adjustmentStates[lead.id];
    if (!leadAdjustmentState || leadAdjustmentState.status === 'NotSelected') {
        toast({ variant: 'destructive', title: 'Action Required', description: 'Please select an option for Delivery Date Adjustment.'});
        return;
    }

    if(leadAdjustmentState.status === 'Yes' && !leadAdjustmentState.date) {
        toast({ variant: 'destructive', title: 'Action Required', description: 'Please enter an adjusted delivery date.'});
        return;
    }

    const leadDocRef = doc(firestore, 'leads', lead.id);
    try {
      const updateData: any = {
        isSalesAuditRequested: false, // Remove from audit queue
        isSalesAuditComplete: true,
        salesAuditCompleteTimestamp: new Date().toISOString(),
      };

      if (leadAdjustmentState.status === 'Yes' && leadAdjustmentState.date) {
        updateData.adjustedDeliveryDate = new Date(leadAdjustmentState.date).toISOString();
      } else if (leadAdjustmentState.status === 'No') {
        updateData.adjustedDeliveryDate = null;
      }

      await updateDoc(leadDocRef, updateData);
      toast({
        title: 'Audit Complete',
        description: `J.O. ${formatJoNumber(lead.joNumber)} is now ready for shipment.`,
      });
    } catch (e: any) {
      console.error("Error proceeding to shipment:", e);
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: e.message || "Could not complete the audit.",
      });
    }
  };

  const processedLeads = useMemo(() => {
    if (!leads) return [];

    const customerOrderGroups: { [key: string]: Lead[] } = {};

    // Group all orders by customer
    leads.forEach(lead => {
        const name = lead.customerName.toLowerCase();
        if (!customerOrderGroups[name]) {
            customerOrderGroups[name] = [];
        }
        customerOrderGroups[name].push(lead);
    });

    const enrichedLeads: EnrichedLead[] = [];

    Object.values(customerOrderGroups).forEach((orders) => {
        const sortedOrders = [...orders].sort((a, b) => new Date(a.submissionDateTime).getTime() - new Date(b.submissionDateTime).getTime());
        
        const totalCustomerQuantity = orders.reduce((sum, o) => {
          if (!Array.isArray(o.orders)) return sum;
          return sum + o.orders.reduce((orderSum, item) => orderSum + item.quantity, 0)
        }, 0);
        
        for (let i = 0; i < sortedOrders.length; i++) {
            const lead = sortedOrders[i];
            
            // Count previous non-sample orders for this customer
            const previousNonSampleOrders = sortedOrders
                .slice(0, i)
                .filter(o => o.orderType !== 'Item Sample');
            
            enrichedLeads.push({
                ...lead,
                orderNumber: previousNonSampleOrders.length, // 0-indexed count
                totalCustomerQuantity,
            });
        }
    });

    return enrichedLeads;
  }, [leads]);

  const auditQueueLeads = useMemo(() => {
    if(!processedLeads) return [];
    
    let filteredLeads = processedLeads.filter(lead => lead.isSalesAuditRequested);

    if (searchTerm) {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        filteredLeads = filteredLeads.filter(lead => 
            lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
            (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
            (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(lowercasedSearchTerm)) ||
            (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(lowercasedSearchTerm))
        );
    }
    
    if (joNumberSearch) {
        const lowercasedJoSearch = joNumberSearch.toLowerCase();
        filteredLeads = filteredLeads.filter(lead => {
            if (!lead.joNumber) return false;
            const fullJoNumber = formatJoNumber(lead.joNumber).toLowerCase();
            return fullJoNumber.includes(lowercasedJoSearch) || lead.joNumber.toString().padStart(5, '0').slice(-5) === lowercasedJoSearch.slice(-5);
        });
    }

    return filteredLeads;
  }, [processedLeads, searchTerm, joNumberSearch, formatJoNumber]);

  return (
    <>
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black border-none">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-black">Auditing before Shipment</CardTitle>
            <CardDescription className="text-gray-600">
              Review orders before they are finalized for shipment.
            </CardDescription>
          </div>
            <div className="flex items-center gap-4">
                <Input
                    placeholder="Search J.O. No..."
                    value={joNumberSearch}
                    onChange={(e) => setJoNumberSearch(e.target.value)}
                    className="bg-gray-100 text-black placeholder:text-gray-500"
                />
                <Input
                    placeholder="Search Customer, Company, Contact..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-100 text-black placeholder:text-gray-500"
                />
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-neutral-800">
              <TableRow>
                <TableHead className="text-white font-bold text-xs text-center">Customer</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">J.O. No.</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Total Amount</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Paid Amount</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Balance</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Payment Type</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Customer Asked for Specific Delivery Date</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Set Adjusted Date of Delivery</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditQueueLeads && auditQueueLeads.length > 0 ? (
                 auditQueueLeads.map(lead => {
                   const isRepeat = !lead.forceNewCustomer && lead.orderType !== 'Item Sample' && lead.orderNumber > 0;
                   const leadAdjustmentState = adjustmentStates[lead.id] || { status: 'NotSelected' };
                   const isProceedDisabled = leadAdjustmentState.status === 'NotSelected' || (leadAdjustmentState.status === 'Yes' && !leadAdjustmentState.date);

                   return (
                      <TableRow key={lead.id}>
                        <TableCell className="text-xs text-center">
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
                                          {lead.orderNumber + 1}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Total of {lead.totalCustomerQuantity} items ordered.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <div className="text-xs text-blue-600 font-semibold mt-1">New Customer</div>
                              )}
                              {openCustomerDetails === lead.id && (
                                <div className="mt-1 space-y-0.5 text-gray-500 text-[11px] font-normal">
                                  {lead.companyName && lead.companyName !== '-' && <div>{toTitleCase(lead.companyName)}</div>}
                                  {getContactDisplay(lead) && <div>{getContactDisplay(lead)}</div>}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-center">{formatJoNumber(lead.joNumber)}</TableCell>
                        <TableCell className={cn("text-xs text-center font-semibold", lead.balance === 0 ? "text-green-700" : "text-black")}>
                            {formatCurrency(lead.grandTotal || 0)}
                        </TableCell>
                        <TableCell className={cn("text-xs text-center", lead.paidAmount == null || lead.paidAmount === 0 ? "text-muted-foreground" : "text-black")}>
                            {formatCurrency(lead.paidAmount || 0)}
                        </TableCell>
                        <TableCell className={cn("text-xs text-center font-bold", lead.balance === 0 ? "text-muted-foreground" : "text-destructive")}>
                            {formatCurrency(lead.balance || 0)}
                        </TableCell>
                        <TableCell className="text-xs text-center">{lead.paymentType}</TableCell>
                        <TableCell className="text-center">
                          <RadioGroup
                              value={leadAdjustmentState.status}
                              onValueChange={(status: 'Yes' | 'No') => handleAdjustmentStateChange(lead.id, { status })}
                              className="flex gap-4 justify-center"
                              disabled={isReadOnly}
                          >
                              <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="Yes" id={`yes-${lead.id}`} />
                                  <Label htmlFor={`yes-${lead.id}`}>Yes</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="No" id={`no-${lead.id}`} />
                                  <Label htmlFor={`no-${lead.id}`}>No</Label>
                              </div>
                          </RadioGroup>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="date"
                            className="text-xs w-[150px] mx-auto"
                            value={leadAdjustmentState.date || ''}
                            onChange={(e) => handleAdjustmentStateChange(lead.id, { date: e.target.value })}
                            disabled={leadAdjustmentState.status !== 'Yes' || isReadOnly}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {lead.isSalesAuditComplete ? (
                            <div className="flex flex-col items-center justify-center text-sm text-green-600 font-semibold">
                                <Check className="mr-2 h-4 w-4" />
                                Done Audit
                                {lead.salesAuditCompleteTimestamp && <div className="text-[10px] text-gray-500">({formatDateTime(lead.salesAuditCompleteTimestamp).dateTimeShort})</div>}
                            </div>
                          ) : (
                            <Button 
                                size="sm" 
                                className="h-7 text-xs font-bold" 
                                onClick={() => handleProceedToShipment(lead)}
                                disabled={isProceedDisabled || isReadOnly}
                            >
                                Proceed to Shipment
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                   )
                 })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground text-xs">
                    No items in the audit queue.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    </>
  );
}
