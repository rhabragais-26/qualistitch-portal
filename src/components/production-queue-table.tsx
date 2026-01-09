

'use client';

import { collection, query, doc, updateDoc } from 'firebase/firestore';
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
import React, { useState, useMemo, useCallback } from 'react';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { formatDateTime, cn } from '@/lib/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { ChevronDown, Send } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { addDays, differenceInDays } from 'date-fns';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';


type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
}

type ProductionType = "Pending" | "In-house" | "Outsource 1" | "Outsource 2" | "Outsource 3";

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  orderType: string;
  orders: Order[];
  joNumber?: number;
  isSentToProduction?: boolean;
  priorityType: 'Rush' | 'Regular';
  submissionDateTime: string;
  isCutting?: boolean;
  isSewing?: boolean;
  isTrimming?: boolean;
  isDone?: boolean;
  productionType?: ProductionType;
  sewerType?: ProductionType;
  isEmbroideryDone?: boolean;
  isEndorsedToLogistics?: boolean;
}

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

type ProductionSelectField = 'productionType' | 'sewerType';
type CheckboxField = 'isEmbroideryDone' | 'isSewing';

const productionOptions: ProductionType[] = ["Pending", "In-house", "Outsource 1", "Outsource 2", "Outsource 3"];

const getStatusColor = (status?: ProductionType) => {
  switch (status) {
    case 'In-house':
      return 'bg-yellow-100 text-yellow-800';
    case 'Outsource 1':
      return 'bg-purple-100 text-purple-800';
    case 'Outsource 2':
        return 'bg-indigo-100 text-indigo-800';
    case 'Outsource 3':
        return 'bg-blue-100 text-blue-800';
    case 'Pending':
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getProductionStatusLabel = (lead: Lead): { text: string; variant: "success" | "warning" | "secondary" | "default" } => {
    if (lead.isEndorsedToLogistics) return { text: "Endorsed to Logistics", variant: "success" };
    if (lead.isSewing) return { text: "Done Production", variant: "success" };
    if (lead.isEmbroideryDone) return { text: "Ongoing with Sewer", variant: "warning" };
    if (lead.productionType && lead.productionType !== 'Pending') return { text: "Ongoing Embroidery", variant: "warning" };
    return { text: "Pending", variant: "secondary" };
};


export function ProductionQueueTable() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const { toast } = useToast();
  const [uncheckConfirmation, setUncheckConfirmation] = useState<{ leadId: string; field: CheckboxField } | null>(null);

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);
  
  const formatJoNumber = useCallback((joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  }, []);

  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;
    if (mobile && landline) return `${mobile} / ${landline}`;
    return mobile || landline || null;
  }, []);

  const handleStatusChange = useCallback(async (leadId: string, field: ProductionSelectField, value: string) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', leadId);
    try {
      await updateDoc(leadDocRef, { [field]: value });
      toast({
        title: "Status Updated",
        description: "The production status has been updated.",
      });
    } catch (e: any) {
      console.error(`Error updating ${field}:`, e);
      toast({
        variant: 'destructive',
        title: "Update Failed",
        description: e.message || "Could not update the status.",
      });
    }
  }, [firestore, toast]);
  
  const handleCheckboxChange = useCallback((leadId: string, field: CheckboxField, value: boolean) => {
    if (!value) {
        setUncheckConfirmation({ leadId, field });
        return;
    }
    
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', leadId);
    
    const updateData: {[key:string]: any} = { [field]: value };
    if (field === 'isSewing' && value) {
      updateData.isDone = true;
    }

    updateDoc(leadDocRef, updateData).catch((e: any) => {
        console.error(`Error updating ${field}:`, e);
        toast({
            variant: 'destructive',
            title: "Update Failed",
            description: e.message || "Could not update the status.",
        });
    });
  }, [firestore, toast]);
  
  const confirmUncheck = useCallback(async () => {
    if (!uncheckConfirmation || !firestore) return;
    const { leadId, field } = uncheckConfirmation;
    const leadDocRef = doc(firestore, 'leads', leadId);
    try {
        const updateData: {[key:string]: any} = { [field]: false };
        if (field === 'isSewing') {
          updateData.isDone = false;
        }
        await updateDoc(leadDocRef, updateData);
    } catch (e: any) {
        console.error(`Error unchecking ${field}:`, e);
        toast({
            variant: 'destructive',
            title: "Update Failed",
            description: e.message || "Could not update the status.",
        });
    } finally {
        setUncheckConfirmation(null);
    }
  }, [uncheckConfirmation, firestore, toast]);
  
  const handleEndorseToLogistics = useCallback(async (leadId: string) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', leadId);
    try {
        await updateDoc(leadDocRef, { isEndorsedToLogistics: true });
        toast({
            title: "Endorsed to Logistics",
            description: "The order has been sent to the logistics team.",
        });
    } catch (e: any) {
        console.error("Error endorsing to logistics:", e);
        toast({
            variant: 'destructive',
            title: "Endorsement Failed",
            description: e.message || "Could not endorse the order.",
        });
    }
  }, [firestore, toast]);
  
  const calculateProductionDeadline = useCallback((lead: Lead) => {
    if (lead.isDone) {
      return { text: 'Completed', isOverdue: false, isUrgent: false, remainingDays: Infinity };
    }
    
    const submissionDate = new Date(lead.submissionDateTime);
    const deadlineDays = lead.priorityType === 'Rush' ? 6 : 10;
    const deadlineDate = addDays(submissionDate, deadlineDays);
    const remainingDays = differenceInDays(deadlineDate, new Date());
    
    if (remainingDays < 0) {
      return { text: `${Math.abs(remainingDays)} day(s) overdue`, isOverdue: true, isUrgent: false, remainingDays };
    } else if (remainingDays <= 2) {
      return { text: `${remainingDays} day(s) remaining`, isOverdue: false, isUrgent: true, remainingDays };
    } else {
      return { text: `${remainingDays} day(s) remaining`, isOverdue: false, isUrgent: false, remainingDays };
    }
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

  const productionQueue = useMemo(() => {
    if (!processedLeads) return [];
    
    const sentToProd = processedLeads.filter(lead => lead.isSentToProduction && !lead.isEndorsedToLogistics);
    
    return sentToProd.filter(lead => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ?
        (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
        (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))) ||
        (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))))
        : true;
      
      const joString = formatJoNumber(lead.joNumber);
      const matchesJo = joNumberSearch ? joString.toLowerCase().includes(joNumberSearch.toLowerCase()) : true;
      
      return matchesSearch && matchesJo;
    });
  }, [processedLeads, searchTerm, joNumberSearch, formatJoNumber]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-gray-200" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading job orders: {error.message}</div>;
  }

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black">
      <AlertDialog open={!!uncheckConfirmation} onOpenChange={(open) => !open && setUncheckConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Unchecking this box will mark the task as not done. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUncheck}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-black">Production Queue</CardTitle>
            <CardDescription className="text-gray-600">
              Job orders ready for production.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
              <div className="w-full max-w-xs">
                <Input
                  placeholder="Search customer, company, or contact..."
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
            </div>
        </div>
      </CardHeader>
      <CardContent>
           <div className="border rounded-md">
            <Table>
                <TableHeader className="bg-neutral-800">
                  <TableRow>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs text-center">Customer</TableHead>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs text-center">J.O. No.</TableHead>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs text-center">Priority</TableHead>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs text-center">Overdue Status</TableHead>
                    <TableHead className="text-white font-bold align-middle py-2 px-2 text-xs text-center">Ordered Items</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Production Category</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Done Embroidery</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Sewing Category</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Done Sewing</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Production Status</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center py-2 px-2 text-xs">Endorsement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {productionQueue?.map((lead) => {
                  const isRepeat = lead.orderNumber > 1;
                  const deadlineInfo = calculateProductionDeadline(lead);
                  const specialOrderTypes = ["MTO", "Stock Design", "Stock (Jacket Only)"];
                  const productionStatus = getProductionStatusLabel(lead);
                  return (
                    <TableRow key={lead.id}>
                        <TableCell className="font-medium text-xs align-middle py-3 text-black text-center">
                          <Collapsible>
                            <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-center cursor-pointer">
                                    <span>{lead.customerName}</span>
                                    <ChevronDown className="h-4 w-4 ml-1 transition-transform [&[data-state=open]]:rotate-180" />
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-2 text-gray-500 space-y-1">
                                {lead.companyName && lead.companyName !== '-' && <div><strong>Company:</strong> {lead.companyName}</div>}
                                {getContactDisplay(lead) && <div><strong>Contact:</strong> {getContactDisplay(lead)}</div>}
                            </CollapsibleContent>
                          </Collapsible>
                           {isRepeat ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center gap-1.5 cursor-pointer mt-1">
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
                        <TableCell className="text-xs align-middle py-3 text-black text-center">{formatJoNumber(lead.joNumber)}</TableCell>
                        <TableCell className="align-middle py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                              {lead.priorityType}
                            </Badge>
                             <div className={cn("text-gray-500 text-[10px] whitespace-nowrap", specialOrderTypes.includes(lead.orderType) && "font-bold")}>
                              {lead.orderType}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className={cn(
                          "text-center text-xs align-middle py-3 font-medium",
                          deadlineInfo.isOverdue && "text-red-600",
                          deadlineInfo.isUrgent && "text-amber-600",
                          !deadlineInfo.isOverdue && !deadlineInfo.isUrgent && "text-green-600"
                        )}>
                          {deadlineInfo.text}
                        </TableCell>
                        <TableCell className="text-xs align-middle py-3 text-black text-center">
                          <ul className="space-y-1 text-center">
                            {lead.orders.map((order, index) => (
                              <li key={index}>
                                {order.quantity}x {order.productType} ({order.color}, {order.size})
                              </li>
                            ))}
                          </ul>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <Select
                            value={lead.productionType || 'Pending'}
                            onValueChange={(value) => handleStatusChange(lead.id, 'productionType', value)}
                            disabled={lead.isEmbroideryDone}
                          >
                            <SelectTrigger className={cn("w-auto min-w-[120px] text-xs h-8 mx-auto font-semibold disabled:opacity-100", getStatusColor(lead.productionType))}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {productionOptions.map(option => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                           <Checkbox
                            checked={lead.isEmbroideryDone || false}
                            onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isEmbroideryDone', !!checked)}
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle">
                           <Select
                            value={lead.sewerType || 'Pending'}
                            onValueChange={(value) => handleStatusChange(lead.id, 'sewerType', value)}
                            disabled={lead.isSewing}
                           >
                            <SelectTrigger className={cn("w-auto min-w-[120px] text-xs h-8 mx-auto font-semibold disabled:opacity-100", getStatusColor(lead.sewerType))}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                               {productionOptions.map(option => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <Checkbox
                            checked={lead.isSewing || false}
                            onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isSewing', !!checked)}
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle">
                           <Badge variant={productionStatus.variant}>{productionStatus.text}</Badge>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                            <Button
                                size="sm"
                                onClick={() => handleEndorseToLogistics(lead.id)}
                                disabled={!lead.isDone}
                                className={cn("h-8 text-white font-bold", !lead.isDone ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700")}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                Send to Logistics
                            </Button>
                        </TableCell>
                    </TableRow>
                )})}
                </TableBody>
            </Table>
          </div>
      </CardContent>
    </Card>
  );
}
