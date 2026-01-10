

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
import { Check } from 'lucide-react';

type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
}

type Lead = {
  id: string;
  customerName: string;
  courier: string;
  joNumber?: number;
  orders: Order[];
  submissionDateTime: string;
  isEndorsedToLogistics?: boolean;
  isSalesAuditRequested?: boolean;
  isWaybillPrinted?: boolean;
  isQualityApproved?: boolean;
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
  const [remarks, setRemarks] = useState('');

  const formatJoNumber = useCallback((joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
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
    return processedLeads.filter(lead => lead.isEndorsedToLogistics);
  }, [processedLeads]);

  return (
    <>
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black">
      <CardHeader>
        <CardTitle className="text-black">Shipment Queue</CardTitle>
        <CardDescription className="text-gray-600">
          Track the status of all shipments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-neutral-800">
              <TableRow>
                <TableHead className="text-white font-bold text-xs">Customer</TableHead>
                <TableHead className="text-white font-bold text-xs">J.O. No.</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Quality Check</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Sales Audit</TableHead>
                <TableHead className="text-white font-bold text-xs">Courier</TableHead>
                <TableHead className="text-white font-bold text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipmentQueueLeads && shipmentQueueLeads.length > 0 ? (
                 shipmentQueueLeads.map(lead => {
                   const isRepeat = lead.orderNumber > 1;
                   return (
                      <TableRow key={lead.id}>
                        <TableCell className="text-xs">
                          {lead.customerName}
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
                          ) : (
                            <div className="text-xs text-blue-600 font-semibold mt-1">New Customer</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{formatJoNumber(lead.joNumber)}</TableCell>
                        <TableCell className="text-center">
                            {lead.isQualityApproved ? (
                                <div className="flex items-center justify-center font-bold text-green-600">
                                    <Check className="h-4 w-4 mr-1" />
                                    Approved
                                </div>
                            ) : (
                                <div className="flex gap-2 justify-center">
                                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => handleApproveQuality(lead)}>Approve</Button>
                                    <Button size="sm" variant="destructive" className="h-7 text-xs font-bold" onClick={() => setDisapprovingLead(lead)}>Disapprove</Button>
                                </div>
                            )}
                        </TableCell>
                        <TableCell className="text-center">
                           {lead.isSalesAuditRequested ? (
                                <span className="text-orange-500 font-bold text-xs">Requested</span>
                           ) : (
                                <Button size="sm" className="h-7 text-xs font-bold" onClick={() => handleRequestSalesAudit(lead)} disabled={!lead.isQualityApproved}>
                                    Request Audit from Sales
                                </Button>
                           )}
                        </TableCell>
                        <TableCell className="text-xs">{lead.courier}</TableCell>
                        <TableCell className="text-xs">Pending</TableCell>
                      </TableRow>
                   )
                 })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground text-xs">
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
    </>
  );
}

    