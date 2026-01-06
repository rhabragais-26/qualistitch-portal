
'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
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
import { Skeleton } from './ui/skeleton';
import React from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from './ui/badge';
import { addDays, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

type NamedOrder = {
  name: string;
  color: string;
  size: string;
  quantity: number;
  backText: string;
};

type Layout = {
  layoutImage?: string;
  dstLogoLeft?: string;
  dstLogoRight?: string;
  dstBackLogo?: string;
  dstBackText?: string;
  namedOrders?: NamedOrder[];
};

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  salesRepresentative: string;
  priorityType: 'Rush' | 'Regular';
  submissionDateTime: string;
  joNumber?: number;
  isUnderProgramming?: boolean;
  isInitialApproval?: boolean;
  isLogoTesting?: boolean;
  isRevision?: boolean;
  isFinalApproval?: boolean;
  isFinalProgram?: boolean;
  layouts?: Layout[];
}

export function DigitizingTable() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [joNumberSearch, setJoNumberSearch] = React.useState('');
  const [openLeadId, setOpenLeadId] = React.useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = React.useState('All');
  const [overdueFilter, setOverdueFilter] = React.useState('All');
  
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'), orderBy('submissionDateTime', 'desc'));
  }, [firestore, user]);

  const { data: leads, isLoading: isLeadsLoading, error } = useCollection<Lead>(leadsQuery);

  const handleStatusChange = async (leadId: string, field: 'isUnderProgramming' | 'isInitialApproval' | 'isLogoTesting' | 'isRevision' | 'isFinalApproval' | 'isFinalProgram', value: boolean) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', leadId);
    try {
      await updateDoc(leadDocRef, { 
        [field]: value,
        lastModified: new Date().toISOString(),
      });
      toast({
        title: 'Status Updated',
        description: `The status for the lead has been updated.`,
      });
    } catch (e: any) {
      console.error('Error updating status:', e);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: e.message || 'Could not update the status.',
      });
    }
  };

  const toggleLeadDetails = (leadId: string) => {
    setOpenLeadId(openLeadId === leadId ? null : leadId);
  };
  
  const formatJoNumber = (joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  };

  const calculateDigitizingDeadline = (lead: Lead) => {
    const submissionDate = new Date(lead.submissionDateTime);
    const deadlineDays = lead.priorityType === 'Rush' ? 2 : 6;
    const deadlineDate = addDays(submissionDate, deadlineDays);
    const remainingDays = differenceInDays(deadlineDate, new Date());
    
    if (remainingDays < 0) {
      return { text: `${Math.abs(remainingDays)} day(s) overdue`, isOverdue: true, isUrgent: false };
    } else if (remainingDays <= 2) {
      return { text: `${remainingDays} day(s) remaining`, isOverdue: false, isUrgent: true };
    } else {
      return { text: `${remainingDays} day(s) remaining`, isOverdue: false, isUrgent: false };
    }
  };

  const filteredLeads = React.useMemo(() => {
    if (!leads) return [];
    
    // Only show leads that have a joNumber
    const leadsWithJo = leads.filter(lead => lead.joNumber);

    return leadsWithJo.filter(lead => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ?
        (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
        (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))) ||
        (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))))
        : true;
      
      const matchesJo = joNumberSearch ? 
        formatJoNumber(lead.joNumber).includes(joNumberSearch) ||
        (lead.joNumber?.toString().padStart(5, '0').endsWith(joNumberSearch))
        : true;
      
      const matchesPriority = priorityFilter === 'All' || lead.priorityType === priorityFilter;

      const deadlineInfo = calculateDigitizingDeadline(lead);
      const matchesOverdue = overdueFilter === 'All' ||
        (overdueFilter === 'Overdue' && deadlineInfo.isOverdue) ||
        (overdueFilter === 'Nearly Overdue' && !deadlineInfo.isOverdue && deadlineInfo.isUrgent);

      return matchesSearch && matchesJo && matchesPriority && matchesOverdue;
    });
  }, [leads, searchTerm, joNumberSearch, priorityFilter, overdueFilter]);

  const isLoading = isAuthLoading || isLeadsLoading;

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-black">Digitizing Queue</CardTitle>
              <CardDescription className="text-gray-600">
                Leads with saved Job Orders ready for digitizing.
              </CardDescription>
            </div>
             <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Filter by Priority Type:</span>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[180px] bg-gray-100 text-black placeholder:text-gray-500">
                    <SelectValue placeholder="Filter by Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Priorities</SelectItem>
                    <SelectItem value="Rush">Rush</SelectItem>
                    <SelectItem value="Regular">Regular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Filter Overdue Status:</span>
                <Select value={overdueFilter} onValueChange={setOverdueFilter}>
                  <SelectTrigger className="w-[180px] bg-gray-100 text-black placeholder:text-gray-500">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                    <SelectItem value="Nearly Overdue">Nearly Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full max-w-xs">
                 <Input
                  placeholder="Search by J.O. No..."
                  value={joNumberSearch}
                  onChange={(e) => setJoNumberSearch(e.target.value)}
                  className="bg-gray-100 text-black placeholder:text-gray-500"
                />
              </div>
              <div className="w-full max-w-xs">
                <Input
                  placeholder="Search customer, company, or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-100 text-black placeholder:text-gray-500"
                />
              </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {isLoading && (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-gray-200" />
            ))}
          </div>
        )}
        {error && (
          <div className="text-red-500 p-4">
            Error loading records: {error.message}
          </div>
        )}
        {!isLoading && !error && (
           <div className="border rounded-md h-full">
            <Table>
                <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                <TableRow>
                    <TableHead className="text-white font-bold align-middle">Customer</TableHead>
                    <TableHead className="text-white font-bold align-middle">CSR</TableHead>
                    <TableHead className="text-white font-bold align-middle">Priority</TableHead>
                    <TableHead className="text-white font-bold align-middle">J.O. No.</TableHead>
                    <TableHead className="text-white font-bold align-middle">Overdue Status</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-36">Initial Program</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-36">Initial Approval</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-36">Test</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-36">Revision</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-36">Final Approval</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-36">Final Program</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">Details</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredLeads.map((lead) => {
                  const deadlineInfo = calculateDigitizingDeadline(lead);
                  return (
                  <React.Fragment key={lead.id}>
                    <TableRow>
                      <TableCell className="font-medium text-xs align-middle py-2 text-black">
                        {lead.customerName}
                      </TableCell>
                      <TableCell className="text-xs align-middle py-2 text-black">{lead.salesRepresentative}</TableCell>
                      <TableCell className="align-middle py-2">
                        <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>
                          {lead.priorityType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-xs align-middle py-2 text-black">{formatJoNumber(lead.joNumber)}</TableCell>
                       <TableCell className={cn(
                          "text-center text-xs align-middle py-2 font-medium",
                          deadlineInfo.isOverdue && "text-red-600",
                          deadlineInfo.isUrgent && "text-amber-600",
                          !deadlineInfo.isOverdue && !deadlineInfo.isUrgent && "text-green-600"
                        )}>
                          {deadlineInfo.text}
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                          <Checkbox
                            checked={lead.isUnderProgramming || false}
                            onCheckedChange={(checked) => handleStatusChange(lead.id, 'isUnderProgramming', !!checked)}
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                          <Checkbox
                            checked={lead.isInitialApproval || false}
                            onCheckedChange={(checked) => handleStatusChange(lead.id, 'isInitialApproval', !!checked)}
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                          <Checkbox
                            checked={lead.isLogoTesting || false}
                            onCheckedChange={(checked) => handleStatusChange(lead.id, 'isLogoTesting', !!checked)}
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                          <Checkbox
                            checked={lead.isRevision || false}
                            onCheckedChange={(checked) => handleStatusChange(lead.id, 'isRevision', !!checked)}
                            disabled={lead.isFinalApproval || false}
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                          <Checkbox
                            checked={lead.isFinalApproval || false}
                            onCheckedChange={(checked) => handleStatusChange(lead.id, 'isFinalApproval', !!checked)}
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                          <Checkbox
                            checked={lead.isFinalProgram || false}
                            onCheckedChange={(checked) => handleStatusChange(lead.id, 'isFinalProgram', !!checked)}
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLeadDetails(lead.id)}
                            className="h-8 px-2 text-black hover:bg-gray-200"
                          >
                            View
                            {openLeadId === lead.id ? (
                              <ChevronUp className="h-4 w-4 ml-1" />
                            ) : (
                              <ChevronDown className="h-4 w-4 ml-1" />
                            )}
                          </Button>
                      </TableCell>
                    </TableRow>
                    {openLeadId === lead.id && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={12} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(lead.layouts || []).map((layout, index) => (
                              <Card key={index} className="bg-white">
                                <CardHeader>
                                  <CardTitle className="text-base">Layout {index + 1}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-xs">
                                  {layout.layoutImage && (
                                    <div>
                                      <p className="font-semibold text-gray-500 mb-2">Layout Image</p>
                                      <Image src={layout.layoutImage} alt={`Layout ${index + 1}`} width={200} height={150} className="rounded-md border" />
                                    </div>
                                  )}
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                     <div>
                                      <p className="font-semibold text-gray-500">DST Logo Left</p>
                                      <p className="text-black whitespace-pre-wrap">{layout.dstLogoLeft || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-500">DST Logo Right</p>
                                      <p className="text-black whitespace-pre-wrap">{layout.dstLogoRight || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-500">DST Back Logo</p>
                                      <p className="text-black whitespace-pre-wrap">{layout.dstBackLogo || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-500">DST Back Text</p>
                                      <p className="text-black whitespace-pre-wrap">{layout.dstBackText || 'N/A'}</p>
                                    </div>
                                  </div>

                                  {layout.namedOrders && layout.namedOrders.length > 0 && (
                                    <div>
                                      <p className="font-semibold text-gray-500 mt-4 mb-2">Named Orders</p>
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="p-1 text-xs">Name</TableHead>
                                            <TableHead className="p-1 text-xs">Back Text</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {layout.namedOrders.map((namedOrder, i) => (
                                            <TableRow key={i}>
                                              <TableCell className="p-1 text-xs">{namedOrder.name}</TableCell>
                                              <TableCell className="p-1 text-xs">{namedOrder.backText}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}

                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )})}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
