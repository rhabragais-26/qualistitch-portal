
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
import React, { useMemo, useCallback } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Check, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';

const salesRepresentatives = ['Myreza', 'Quencess', 'Cath', 'Loise', 'Joanne', 'Thors', 'Francis', 'Junary', 'Kenneth'];

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
  contactNumber: string;
  landlineNumber?: string;
  salesRepresentative: string;
  priorityType: 'Rush' | 'Regular';
  submissionDateTime: string;
  lastModified: string;
  orders: Order[];
  joNumber?: number;
  courier?: string;
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  isUnderProgramming?: boolean;
  isPreparedForProduction?: boolean;
  isSentToProduction?: boolean;
  isEndorsedToLogistics?: boolean;
  isRecheckingQuality?: boolean;
}

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

export function JobOrderTable() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [joNumberSearch, setJoNumberSearch] = React.useState('');
  const [csrFilter, setCsrFilter] = React.useState('All');
  const [hoveredLeadId, setHoveredLeadId] = React.useState<string | null>(null);
  const router = useRouter();

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

  const handleProcessJobOrder = useCallback((lead: Lead) => {
    router.push(`/job-order/${lead.id}`);
  }, [router]);
  
  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || 'N/A';
  }, []);

  const formatJoNumber = useCallback((joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  }, []);
  
  const getJoStatus = useCallback((lead: Lead) => {
    if (lead.isRecheckingQuality) return <span className="font-bold text-red-600">Need to Reprint</span>;
    if (lead.isEndorsedToLogistics) return "Already on Logistics";
    if (lead.isSentToProduction) return "Already on Production Dept.";
    if (lead.isPreparedForProduction) return "Already on Inventory";
    if (lead.isUnderProgramming) return "Already on Programming Dept.";
    return <span className="text-gray-500">Not yet processed</span>;
  }, []);
  
  const processedLeads = useMemo(() => {
    if (!leads) return [];
  
    const customerOrderStats: { [key: string]: { orders: Lead[], totalQuantity: number } } = {};
  
    leads.forEach(lead => {
      const name = lead.customerName.toLowerCase();
      if (!customerOrderStats[name]) {
        customerOrderStats[name] = { orders: [], totalQuantity: 0 };
      }
      customerOrderStats[name].orders.push(lead);
      const orderQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
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

  const filteredLeads = React.useMemo(() => {
    if (!processedLeads) return [];
    
    return processedLeads.filter(lead => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ?
        (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
        (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(lowercasedSearchTerm)) ||
        (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(lowercasedSearchTerm)))
        : true;
      
      const matchesCsr = csrFilter === 'All' || lead.salesRepresentative === csrFilter;
      
      const lowercasedJoSearch = (joNumberSearch || '').toLowerCase();
      const matchesJo = joNumberSearch ? 
        (lead.joNumber && (
            formatJoNumber(lead.joNumber).toLowerCase().includes(lowercasedJoSearch) ||
            lead.joNumber.toString().padStart(5, '0').slice(-5) === lowercasedJoSearch.slice(-5)
        ))
        : true;

      return matchesSearch && matchesCsr && matchesJo;
    });
  }, [processedLeads, searchTerm, csrFilter, joNumberSearch, formatJoNumber]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full bg-gray-200" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading records: {error.message}</div>;
  }

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-black">Process Job Order</CardTitle>
              <CardDescription className="text-gray-600">
                Search for a lead and process their job order.
              </CardDescription>
            </div>
             <div className="flex items-center gap-4">
               <Select value={csrFilter} onValueChange={setCsrFilter}>
                <SelectTrigger className="w-[180px] bg-gray-100 text-black placeholder:text-gray-500">
                  <SelectValue placeholder="Filter by SCES" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All SCES</SelectItem>
                  {salesRepresentatives.map(csr => (
                    <SelectItem key={csr} value={csr}>{csr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-full max-w-sm">
                <Input
                  placeholder="Search by J.O. No..."
                  value={joNumberSearch}
                  onChange={(e) => setJoNumberSearch(e.target.value)}
                  className="bg-gray-100 text-black placeholder:text-gray-500"
                />
              </div>
              <div className="w-full max-w-sm">
                <Input
                  placeholder="Search by customer, company, or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-100 text-black placeholder:text-gray-500"
                />
              </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
           <div className="border rounded-md h-full">
                <Table>
                  <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-white font-bold align-middle">Customer Name</TableHead>
                      <TableHead className="text-white font-bold align-middle">Company Name</TableHead>
                      <TableHead className="text-white font-bold align-middle">Contact No.</TableHead>
                      <TableHead className="text-white font-bold align-middle">Courier</TableHead>
                      <TableHead className="text-white font-bold align-middle">SCES</TableHead>
                      <TableHead className="text-white font-bold align-middle">Priority</TableHead>
                      <TableHead className="text-white font-bold align-middle">J.O. No.</TableHead>
                      <TableHead className="text-center text-white font-bold align-middle">Action</TableHead>
                      <TableHead className="text-white font-bold align-middle">Date Created</TableHead>
                      <TableHead className="text-white font-bold align-middle">J.O. Status</TableHead>
                    </TableRow>
                  </TableHeader>
                    <TableBody>
                    {filteredLeads.map((lead) => {
                      const isJoSaved = !!lead.joNumber;
                      const isCompleted = lead.shipmentStatus === 'Shipped' || lead.shipmentStatus === 'Delivered';
                      const creationDate = formatDateTime(lead.submissionDateTime);
                      const modifiedDate = formatDateTime(lead.lastModified);
                      const isRepeat = lead.orderNumber > 1;
                      return (
                        <TableRow key={lead.id}>
                            <TableCell className="font-medium text-xs align-middle py-2 text-black">
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
                            <TableCell className="text-xs align-middle py-2 text-black">{lead.companyName === '-' ? '' : lead.companyName}</TableCell>
                            <TableCell className="text-xs align-middle py-2 text-black">{getContactDisplay(lead)}</TableCell>
                            <TableCell className="text-xs align-middle py-2 text-black">{lead.courier === '-' ? '' : lead.courier}</TableCell>
                            <TableCell className="text-xs align-middle py-2 text-black">{lead.salesRepresentative}</TableCell>
                            <TableCell className="align-middle py-2">
                               <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                                {lead.priorityType}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-xs align-middle py-2 text-black">{formatJoNumber(lead.joNumber)}</TableCell>
                            <TableCell className="text-center align-middle py-2">
                               <Button 
                                  size="sm" 
                                  className={cn(
                                    'h-8 px-3 text-white font-bold',
                                     isCompleted ? 'bg-slate-500' : (isJoSaved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-primary hover:bg-primary/90')
                                  )}
                                  onClick={() => handleProcessJobOrder(lead)}
                                   onMouseEnter={() => setHoveredLeadId(lead.id)}
                                   onMouseLeave={() => setHoveredLeadId(null)}
                                   disabled={isCompleted}
                                >
                                  {isCompleted ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        J.O. Saved
                                    </>
                                  ) : isJoSaved ? (
                                    hoveredLeadId === lead.id ? 'Edit J.O.' : 'J.O. Saved'
                                  ) : (
                                    'Process J.O.'
                                  )}
                                </Button>
                            </TableCell>
                             <TableCell className="text-xs align-middle py-2 text-black">
                              <Collapsible>
                                <CollapsibleTrigger asChild>
                                    <div className="flex items-center cursor-pointer">
                                        <ChevronDown className="h-4 w-4 mr-1 transition-transform [&[data-state=open]]:rotate-180" />
                                        <div>
                                            <div>{creationDate.dateTime}</div>
                                            <div className="text-gray-500">{creationDate.dayOfWeek}</div>
                                        </div>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="pt-1 pl-5 text-gray-500 text-[11px]">
                                    <span className='font-bold text-gray-600'>Last Modified:</span>
                                    <div>{modifiedDate.dateTime}</div>
                                    <div>{modifiedDate.dayOfWeek}</div>
                                </CollapsibleContent>
                              </Collapsible>
                            </TableCell>
                            <TableCell className="text-xs align-middle py-2 text-black font-medium">{getJoStatus(lead)}</TableCell>
                        </TableRow>
                      );
                    })}
                    </TableBody>
                </Table>
          </div>
      </CardContent>
    </Card>
  );
}
