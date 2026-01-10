
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
import { collection, query, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useMemo, useCallback, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Check, ChevronDown, RefreshCcw } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn, formatDateTime } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Input } from './ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';


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
  courier: string;
  joNumber?: number;
  orders: Order[];
  submissionDateTime: string;
  isEndorsedToLogistics?: boolean;
  isSalesAuditRequested?: boolean;
  salesAuditRequestedTimestamp?: string;
  isSalesAuditComplete?: boolean;
  salesAuditCompleteTimestamp?: string;
  isWaybillPrinted?: boolean;
  isQualityApproved?: boolean;
  qualityApprovedTimestamp?: string;
  isRecheckingQuality?: boolean;
  isPacked?: boolean;
  packedTimestamp?: string;
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  shippedTimestamp?: string;
}

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

export function ShipmentQueueTable() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads } = useCollection<Lead>(leadsQuery);
  const { toast } = useToast();
  const [disapprovingLead, setDisapprovingLead] = useState<Lead | null>(null);
  const [packingLead, setPackingLead] = useState<{lead: Lead, isPacking: boolean} | null>(null);
  const [remarks, setRemarks] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [excludeShipped, setExcludeShipped] = useState(false);

  const formatJoNumber = useCallback((joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  }, []);

  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || null;
  }, []);

  const handleDisapprove = async () => {
    if (!disapprovingLead || !firestore || !remarks.trim()) {
      toast({
        variant: 'destructive',
        title: 'Remarks are required',
        description: 'Please provide a reason for disapproval.',
      });
      return;
    }

    const caseId = uuidv4();
    const operationalCasesRef = collection(firestore, 'operationalCases');
    const caseDocRef = doc(operationalCasesRef, caseId);
    
    const totalQuantity = disapprovingLead.orders.reduce((sum, item) => sum + item.quantity, 0) || 0;

    const caseData = {
        id: caseId,
        joNumber: formatJoNumber(disapprovingLead.joNumber),
        caseType: 'Quality Errors',
        remarks,
        customerName: disapprovingLead.customerName,
        submissionDateTime: new Date().toISOString(),
        caseItems: disapprovingLead.orders.map(o => ({...o, id: uuidv4()})),
        quantity: totalQuantity,
    };

    try {
        await setDoc(caseDocRef, caseData);
        
        const leadDocRef = doc(firestore, 'leads', disapprovingLead.id);
        await updateDoc(leadDocRef, {
            isEndorsedToLogistics: false,
            isQualityApproved: false,
            isRecheckingQuality: true,
        });

        toast({
            title: 'Order Disapproved',
            description: 'The order has been sent back to production with your remarks.',
        });
        setDisapprovingLead(null);
        setRemarks('');

    } catch (e: any) {
        console.error("Error creating operational case or updating lead:", e);
        toast({
            variant: "destructive",
            title: "Action Failed",
            description: e.message || "Could not complete the disapproval process.",
        });
    }
  };

  const handleRequestSalesAudit = async (lead: Lead) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', lead.id);
    try {
        await updateDoc(leadDocRef, {
            isSalesAuditRequested: true,
            salesAuditRequestedTimestamp: new Date().toISOString(),
        });
        toast({
            title: 'Sales Audit Requested',
            description: `Order for J.O. ${formatJoNumber(lead.joNumber)} has been sent for sales audit.`,
        });
    } catch (e: any) {
        console.error("Error requesting sales audit:", e);
        toast({
            variant: "destructive",
            title: "Request Failed",
            description: e.message || "Could not request sales audit.",
        });
    }
  };
  
  const handleApproveQuality = async (lead: Lead) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', lead.id);
    try {
      await updateDoc(leadDocRef, {
        isQualityApproved: true,
        qualityApprovedTimestamp: new Date().toISOString(),
        isRecheckingQuality: false,
      });
      toast({
        title: 'Quality Approved',
        description: `Order for J.O. ${formatJoNumber(lead.joNumber)} has been approved.`,
      });
    } catch (e: any) {
      console.error("Error approving quality:", e);
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: e.message || "Could not approve the quality check.",
      });
    }
  };

  const confirmPackedChange = useCallback(async (lead: Lead, checked: boolean) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', lead.id);
    try {
      const updateData: any = {
        isPacked: checked,
        packedTimestamp: checked ? new Date().toISOString() : null,
      };

      if(!checked) {
        updateData.isSalesAuditRequested = false;
        updateData.salesAuditRequestedTimestamp = null;
        updateData.isSalesAuditComplete = false;
        updateData.salesAuditCompleteTimestamp = null;
      }

      await updateDoc(leadDocRef, updateData);
    } catch (e: any) {
      console.error("Error updating packed status:", e);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: e.message || "Could not update the packed status.",
      });
    } finally {
        setPackingLead(null);
    }
  }, [firestore, toast]);

  const handleShip = async (lead: Lead) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', lead.id);
    try {
      await updateDoc(leadDocRef, {
        shipmentStatus: 'Shipped',
        shippedTimestamp: new Date().toISOString(),
      });
      toast({
        title: 'Order Shipped',
        description: `Order for J.O. ${formatJoNumber(lead.joNumber)} has been marked as shipped.`,
      });
    } catch (e: any) {
      console.error("Error shipping order:", e);
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: e.message || "Could not mark the order as shipped.",
      });
    }
  };

  const getStatus = (lead: Lead): { text: string; variant: "default" | "secondary" | "destructive" | "warning" | "success", className?: string } => {
    if (lead.shipmentStatus === 'Shipped') {
        return { text: "Shipped", variant: "success", className: "bg-green-700 text-white"};
    }
    if (lead.isPacked) {
      return { text: "Already Packed", variant: "success", className: "bg-teal-600 text-white" };
    }
    if (lead.isSalesAuditRequested) {
      return { text: "On-going Audit", variant: "warning", className: "bg-amber-500 text-white" };
    }
     if (lead.isSalesAuditComplete) {
      return { text: "Ready for Shipment", variant: "success", className: "bg-blue-600 text-white" };
    }
    if (lead.isQualityApproved) {
      return { text: "Approved Quality", variant: "success", className: "bg-green-600 text-white" };
    }
    if (lead.isRecheckingQuality) {
        return { text: "Re-checking Quality", variant: "destructive", className: "bg-red-600 text-white" };
    }
    return { text: "Pending", variant: "secondary" };
  }

  const processedLeads = useMemo(() => {
    if (!leads) return [];
  
    const customerOrderStats: { [key: string]: { orders: Lead[], totalQuantity: number } } = {};
  
    leads.forEach(lead => {
      const name = lead.customerName.toLowerCase();
      if (!customerOrderStats[name]) {
        customerOrderStats[name] = { orders: [], totalQuantity: 0 };
      }
      customerOrderStats[name].orders.push(lead);
      const orderQuantity = lead.orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
      customerOrderStats[name].totalQuantity += orderQuantity;
    });
  
    const enrichedLeads: EnrichedLead[] = [];
  
    Object.values(customerOrderStats).forEach(({ orders, totalQuantity }) => {
      orders.sort((a, b) => new Date(a.submissionDateTime).getTime() - new Date(b.submissionDateTime).getTime());
      orders.forEach((lead, index) => {
        enrichedLeads.push({
          ...lead,
          orderNumber: index + 1,
          totalCustomerQuantity: totalQuantity,
        });
      });
    });
  
    return enrichedLeads;
  }, [leads]);

  const shipmentQueueLeads = useMemo(() => {
    if(!processedLeads) return [];
    
    const endorsed = processedLeads.filter(lead => lead.isEndorsedToLogistics);

    return endorsed.filter(lead => {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        const matchesSearch = searchTerm ?
            (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
            (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
            (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))) ||
            (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))))
            : true;

        const joString = formatJoNumber(lead.joNumber);
        const matchesJo = joNumberSearch ? joString.toLowerCase().includes(joNumberSearch.toLowerCase()) : true;

        const matchesShippedFilter = excludeShipped ? lead.shipmentStatus !== 'Shipped' : true;
        
        return matchesSearch && matchesJo && matchesShippedFilter;
    });
  }, [processedLeads, searchTerm, joNumberSearch, excludeShipped]);

  return (
    <>
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="text-black">Shipment Queue</CardTitle>
                <CardDescription className="text-gray-600">
                Track the status of all shipments.
                </CardDescription>
            </div>
            <div className="flex items-center gap-4">
                <div className="w-full max-w-lg">
                  <Input
                    placeholder="Search customer, company or contact..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-100 text-black placeholder:text-gray-500"
                  />
                </div>
                <div className="w-full max-w-xs">
                    <Input
                    placeholder="Search by J.O. No..."
                    value={joNumberSearch}
                    onChange={(e) => setJoNumberSearch(e.target.value)}
                    className="bg-gray-100 text-black placeholder:text-gray-500"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="exclude-shipped" checked={excludeShipped} onCheckedChange={(checked) => setExcludeShipped(!!checked)} />
                    <Label htmlFor="exclude-shipped" className="text-sm font-medium">Exclude Shipped</Label>
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-neutral-800">
              <TableRow>
                <TableHead className="text-white font-bold text-xs">Customer</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">J.O. No.</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Quality Check</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Packed</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Sales Audit</TableHead>
                <TableHead className="text-white font-bold text-xs">Courier</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Status</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Ship Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipmentQueueLeads && shipmentQueueLeads.length > 0 ? (
                 shipmentQueueLeads.map(lead => {
                   const isRepeat = lead.orderNumber > 1;
                   const status = getStatus(lead);
                   return (
                      <TableRow key={lead.id}>
                        <TableCell className="text-xs">
                          <Collapsible>
                              <CollapsibleTrigger asChild>
                                  <div className="flex items-center cursor-pointer">
                                      <ChevronDown className="h-4 w-4 mr-1 transition-transform [&[data-state=open]]:rotate-180" />
                                      <span className="font-bold">{lead.customerName}</span>
                                  </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="pt-1 pl-6 text-gray-500 text-[11px] font-normal">
                                  {lead.companyName && lead.companyName !== '-' && <div>{lead.companyName}</div>}
                                  {getContactDisplay(lead) && <div>{getContactDisplay(lead)}</div>}
                              </CollapsibleContent>
                          </Collapsible>
                          {isRepeat ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5 cursor-pointer ml-5 mt-1">
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
                          ) : (
                            <div className="text-xs text-blue-600 font-semibold mt-1 ml-5">New Customer</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-center">{formatJoNumber(lead.joNumber)}</TableCell>
                        <TableCell className="text-center">
                            {lead.isQualityApproved ? (
                                <div className="flex flex-col items-center justify-center gap-1">
                                    <div className="flex items-center font-bold text-green-600 text-xs">
                                        <Check className="h-4 w-4 mr-1" />
                                        Approved
                                    </div>
                                    {lead.qualityApprovedTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.qualityApprovedTimestamp).dateTimeShort}</div>}
                                </div>
                            ) : (
                                <div className="flex gap-2 justify-center">
                                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => handleApproveQuality(lead)}>Approve</Button>
                                    <Button size="sm" variant="destructive" className="h-7 text-xs font-bold" onClick={() => setDisapprovingLead(lead)}>Disapprove</Button>
                                </div>
                            )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Checkbox
                              checked={!!lead.isPacked}
                              onCheckedChange={(checked) => {
                                setPackingLead({ lead, isPacking: !!checked });
                              }}
                              disabled={!lead.isQualityApproved}
                            />
                            {lead.isPacked && lead.packedTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.packedTimestamp).dateTimeShort}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                           {lead.isSalesAuditRequested ? (
                                <div className="flex flex-col items-center justify-center gap-1">
                                    <span className="text-orange-500 font-bold text-xs">Requested</span>
                                    {lead.salesAuditRequestedTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.salesAuditRequestedTimestamp).dateTimeShort}</div>}
                                </div>
                           ) : lead.isSalesAuditComplete ? (
                                <div className="flex flex-col items-center justify-center gap-1">
                                    <span className="text-blue-600 font-bold text-xs">Ready for Shipment</span>
                                    {lead.salesAuditCompleteTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.salesAuditCompleteTimestamp).dateTimeShort}</div>}
                                </div>
                           ) : (
                                <Button size="sm" className="h-7 text-xs font-bold" onClick={() => handleRequestSalesAudit(lead)} disabled={!lead.isPacked}>
                                    Request Audit from Sales
                                </Button>
                           )}
                        </TableCell>
                        <TableCell className="text-xs">{lead.courier}</TableCell>
                        <TableCell className="text-xs text-center">
                          <Badge variant={status.variant} className={status.className}>{status.text}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {lead.shipmentStatus === 'Shipped' ? (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <div className="flex items-center font-bold text-green-600 text-xs">
                                <Check className="h-4 w-4 mr-1" />
                                Shipped
                              </div>
                              {lead.shippedTimestamp && <div className="text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(lead.shippedTimestamp).dateTimeShort}</div>}
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 text-xs font-bold"
                              onClick={() => handleShip(lead)}
                              disabled={!lead.isSalesAuditComplete}
                            >
                              Ship Now
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                   )
                 })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground text-xs">
                    No items in shipment queue.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
     {disapprovingLead && (
        <Dialog open={!!disapprovingLead} onOpenChange={() => { setDisapprovingLead(null); setRemarks(''); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disapprove Quality for {formatJoNumber(disapprovingLead.joNumber)}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="remarks">Please provide remarks for disapproval:</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g., incorrect embroidery, wrong item size..."
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleDisapprove} disabled={!remarks.trim()}>
                Save and Send Back to Prod
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {packingLead && (
        <AlertDialog open={!!packingLead} onOpenChange={() => setPackingLead(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Action</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {packingLead.isPacking ? 'mark this order as packed' : 'un-pack this order'}?
                {!packingLead.isPacking && " This will also reset the sales audit status."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPackingLead(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => confirmPackedChange(packingLead.lead, packingLead.isPacking)}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
