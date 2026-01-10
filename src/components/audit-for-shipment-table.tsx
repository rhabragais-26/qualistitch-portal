
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
import { useMemo, useCallback, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Check } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
}

type Lead = {
  id: string;
  customerName: string;
  joNumber?: number;
  orders: Order[];
  submissionDateTime: string;
  isSalesAuditRequested?: boolean;
  isSalesAuditComplete?: boolean;
  salesAuditCompleteTimestamp?: string;
  isWaybillPrinted?: boolean;
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
}

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

export function AuditForShipmentTable() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads } = useCollection<Lead>(leadsQuery);
  const { toast } = useToast();

  const formatJoNumber = useCallback((joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  }, []);

  const handleWaybillPrintedChange = async (lead: Lead, checked: boolean) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', lead.id);
    try {
      await updateDoc(leadDocRef, {
        isWaybillPrinted: checked,
      });
    } catch (e: any) {
      console.error("Error updating waybill status:", e);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: e.message || "Could not update the waybill status.",
      });
    }
  };

  const handleProceedToShipment = async (lead: Lead) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', lead.id);
    try {
      await updateDoc(leadDocRef, {
        isSalesAuditRequested: false, // Remove from audit queue
        isSalesAuditComplete: true,
        salesAuditCompleteTimestamp: new Date().toISOString(),
      });
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

  const auditQueueLeads = useMemo(() => {
    if(!processedLeads) return [];
    return processedLeads.filter(lead => lead.isSalesAuditRequested);
  }, [processedLeads]);

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black">
      <CardHeader>
        <CardTitle className="text-black">Audit for Shipment</CardTitle>
        <CardDescription className="text-gray-600">
          Review orders before they are finalized for shipment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-neutral-800">
              <TableRow>
                <TableHead className="text-white font-bold text-xs">Customer</TableHead>
                <TableHead className="text-white font-bold text-xs">J.O. No.</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Waybill Printed</TableHead>
                <TableHead className="text-white font-bold text-xs text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditQueueLeads && auditQueueLeads.length > 0 ? (
                 auditQueueLeads.map(lead => {
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
                            <Checkbox
                                checked={lead.isWaybillPrinted}
                                onCheckedChange={(checked) => handleWaybillPrintedChange(lead, !!checked)}
                             />
                        </TableCell>
                        <TableCell className="text-center">
                          {lead.isSalesAuditComplete ? (
                            <div className="flex items-center justify-center text-sm text-green-600 font-semibold">
                                <Check className="mr-2 h-4 w-4" />
                                Done Audit
                                {lead.salesAuditCompleteTimestamp && <div className="text-[10px] text-gray-500 ml-2">({formatDateTime(lead.salesAuditCompleteTimestamp).dateTimeShort})</div>}
                            </div>
                          ) : (
                            <Button 
                                size="sm" 
                                className="h-7 text-xs font-bold" 
                                onClick={() => handleProceedToShipment(lead)}
                                disabled={!lead.isWaybillPrinted}
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
                  <TableCell colSpan={4} className="text-center text-muted-foreground text-xs">
                    No items in the audit queue.
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
