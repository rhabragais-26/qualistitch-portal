
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
import { collection, query } from 'firebase/firestore';
import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

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
  lastModified: string;
  joNumber?: number;
  orders: Order[];
  submissionDateTime: string;
}

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

export function ShipmentQueueTable() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads } = useCollection<Lead>(leadsQuery);

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

  return (
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
                <TableHead className="text-white font-bold">J.O. No.</TableHead>
                <TableHead className="text-white font-bold">Customer</TableHead>
                <TableHead className="text-white font-bold">Courier</TableHead>
                <TableHead className="text-white font-bold">Status</TableHead>
                <TableHead className="text-white font-bold">Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedLeads && processedLeads.length > 0 ? (
                 processedLeads.map(lead => {
                   const isRepeat = lead.orderNumber > 1;
                   return (
                      <TableRow key={lead.id}>
                        <TableCell>{lead.joNumber}</TableCell>
                        <TableCell>
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
                        <TableCell>{lead.courier}</TableCell>
                        <TableCell>Pending</TableCell>
                        <TableCell>{lead.lastModified}</TableCell>
                      </TableRow>
                   )
                 })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No shipment data available.
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
