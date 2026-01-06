
'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

const salesRepresentatives = ['Myreza', 'Quencess', 'Cath', 'Loise', 'Joanne', 'Thors', 'Francis', 'Junary', 'Kenneth'];

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  salesRepresentative: string;
  submissionDateTime: string;
  joNumber?: number;
}

export function DigitizingTable() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [csrFilter, setCsrFilter] = React.useState('All');
  const [openLeadId, setOpenLeadId] = React.useState<string | null>(null);
  
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'), orderBy('submissionDateTime', 'desc'));
  }, [firestore, user]);

  const { data: leads, isLoading: isLeadsLoading, error } = useCollection<Lead>(leadsQuery);

  const toggleLeadDetails = (leadId: string) => {
    setOpenLeadId(openLeadId === leadId ? null : leadId);
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
      
      const matchesCsr = csrFilter === 'All' || lead.salesRepresentative === csrFilter;

      return matchesSearch && matchesCsr;
    });
  }, [leads, searchTerm, csrFilter]);

  const isLoading = isAuthLoading || isLeadsLoading;

  const formatJoNumber = (joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  };

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
               <Select value={csrFilter} onValueChange={setCsrFilter}>
                <SelectTrigger className="w-[180px] bg-gray-100 text-black placeholder:text-gray-500">
                  <SelectValue placeholder="Filter by CSR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All CSRs</SelectItem>
                  {salesRepresentatives.map(csr => (
                    <SelectItem key={csr} value={csr}>{csr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <TableHead className="text-white font-bold align-middle">J.O. No.</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredLeads.map((lead) => (
                  <React.Fragment key={lead.id}>
                    <TableRow>
                      <TableCell className="font-medium text-xs align-middle py-2 text-black">
                         <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLeadDetails(lead.id)}
                          className="h-8 px-2 text-black hover:bg-gray-200 -ml-2"
                        >
                          {lead.customerName}
                          {openLeadId === lead.id ? (
                            <ChevronUp className="h-4 w-4 ml-1" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-1" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-xs align-middle py-2 text-black">{lead.salesRepresentative}</TableCell>
                      <TableCell className="font-medium text-xs align-middle py-2 text-black">{formatJoNumber(lead.joNumber)}</TableCell>
                    </TableRow>
                    {openLeadId === lead.id && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={3} className="p-0">
                          <div className="p-4 bg-gray-100">
                             <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                    <p className="font-semibold text-gray-500">Company Name</p>
                                    <p className="text-black">{lead.companyName === '-' ? 'N/A' : lead.companyName}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-500">Mobile No.</p>
                                    <p className="text-black">{lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-500">Landline No.</p>
                                    <p className="text-black">{lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : 'N/A'}</p>
                                </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
