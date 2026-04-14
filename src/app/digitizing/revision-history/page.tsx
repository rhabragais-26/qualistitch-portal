'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, updateDoc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatJoNumber, toTitleCase, formatDateTime } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { User, Building, Phone, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Header } from '@/components/header';

type Lead = {
  id: string;
  joNumber?: number;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  revisionCount?: number;
  assignedDigitizer?: string;
};

type Revision = {
  id: string;
  leadId: string;
  joNumber: number;
  revisionNumber: number;
  reason: "Client's Request" | "Digitizer's Output Concern";
  details: string;
  timestamp: string;
  submittedBy: string;
};

type EnrichedRevision = Revision & {
    customerName?: string;
    assignedDigitizer?: string;
};

const reasonOptions = ["Client's Request", "Digitizer's Output Concern"];

export default function RevisionHistoryPage() {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const [foundLead, setFoundLead] = useState<Lead | null>(null);
  const [joSuggestions, setJoSuggestions] = useState<Lead[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const [newRevisionReason, setNewRevisionReason] = useState<string>('');
  const [newRevisionDetails, setNewRevisionDetails] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: allLeads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsQuery);
  
  const allRevisionsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'revisions'), orderBy('timestamp', 'desc')) : null),
    [firestore]
  );
  const { data: allRevisions, isLoading: areRevisionsLoading } = useCollection<Revision>(allRevisionsQuery);


  const isLoading = areLeadsLoading || areRevisionsLoading;

  const handleSuggestionClick = (lead: Lead) => {
    setFoundLead(lead);
    setJoNumberSearch(lead.joNumber ? formatJoNumber(lead.joNumber) : '');
    setShowSuggestions(false);
  };

  useEffect(() => {
    if (!joNumberSearch || !showSuggestions || !allLeads) {
      setJoSuggestions([]);
      return;
    }
    const searchInput = joNumberSearch.toLowerCase().replace(/[^0-9]/g, '');
    if (searchInput.length > 0) {
      const matchedLeads = allLeads.filter(lead => 
        lead.joNumber && 
        (lead.joNumber.toString().padStart(5, '0').includes(searchInput) ||
         formatJoNumber(lead.joNumber).toLowerCase().includes(joNumberSearch.toLowerCase()))
      ).slice(0, 5);
      setJoSuggestions(matchedLeads);
    } else {
      setJoSuggestions([]);
    }
  }, [joNumberSearch, allLeads, showSuggestions]);

  const getContactDisplay = () => {
    if (!foundLead) return '';
    const mobile = foundLead.contactNumber && foundLead.contactNumber !== '-' ? foundLead.contactNumber.replace(/-/g, '') : null;
    const landline = foundLead.landlineNumber && foundLead.landlineNumber !== '-' ? foundLead.landlineNumber.replace(/-/g, '') : null;
    if (mobile && landline) return `${mobile} / ${landline}`;
    return mobile || landline || '';
  };
  
  const enrichedRevisions = useMemo(() => {
    if (!allRevisions || !allLeads) return [];
    return allRevisions.map(revision => {
      const lead = allLeads.find(l => l.id === revision.leadId);
      return {
        ...revision,
        customerName: lead?.customerName,
        assignedDigitizer: lead?.assignedDigitizer
      };
    });
  }, [allRevisions, allLeads]);

  const filteredHistory = useMemo(() => {
    if (!historySearch) return enrichedRevisions;
    const lowercasedSearch = historySearch.toLowerCase();
    return enrichedRevisions.filter(rev => 
        formatJoNumber(rev.joNumber).toLowerCase().includes(lowercasedSearch) ||
        (rev.customerName && rev.customerName.toLowerCase().includes(lowercasedSearch)) ||
        (rev.assignedDigitizer && rev.assignedDigitizer.toLowerCase().includes(lowercasedSearch))
    );
  }, [enrichedRevisions, historySearch]);


  const handleRecordRevision = async () => {
    if (!foundLead || !newRevisionReason || !newRevisionDetails.trim() || !userProfile || !firestore) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a reason and provide details for the revision.' });
        return;
    }
    setIsSaving(true);
    
    const leadRevisions = allRevisions?.filter(r => r.leadId === foundLead.id) || [];
    const revisionNumber = leadRevisions.length + 1;
    const revisionId = uuidv4();
    const revisionDocRef = doc(firestore, 'revisions', revisionId);
    const leadDocRef = doc(firestore, 'leads', foundLead.id);

    const revisionData: Revision = {
        id: revisionId,
        leadId: foundLead.id,
        joNumber: foundLead.joNumber!,
        revisionNumber: revisionNumber,
        reason: newRevisionReason as any,
        details: newRevisionDetails,
        timestamp: new Date().toISOString(),
        submittedBy: userProfile.nickname,
    };

    try {
        await setDoc(revisionDocRef, revisionData);
        await updateDoc(leadDocRef, {
            revisionCount: revisionNumber,
            isRevision: true,
            revisionTimestamp: new Date().toISOString(),
        });
        toast({ title: 'Revision Recorded', description: `Revision #${revisionNumber} has been saved.` });
        setNewRevisionReason('');
        setNewRevisionDetails('');
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Header>
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Record a Revision</CardTitle>
                    <CardDescription>Search for a Job Order to log a new revision request.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative">
                        <Label htmlFor="jo-search">Search by J.O. Number</Label>
                        <Input
                            id="jo-search"
                            placeholder="e.g., QSBP-24-12345"
                            value={joNumberSearch}
                            onChange={e => {
                                setJoNumberSearch(e.target.value);
                                if (foundLead) setFoundLead(null);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            autoComplete="off"
                        />
                        {showSuggestions && joSuggestions.length > 0 && (
                            <Card className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                                <CardContent className="p-2 max-h-60 overflow-y-auto">
                                {joSuggestions.map((lead) => (
                                    <div
                                        key={lead.id}
                                        className="p-2 cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSuggestionClick(lead)}
                                    >
                                    {formatJoNumber(lead.joNumber!)} - {toTitleCase(lead.customerName)}
                                    </div>
                                ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {foundLead && (
                        <div className="space-y-3 p-4 border rounded-lg bg-gray-50 animate-in fade-in-50">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg">{formatJoNumber(foundLead.joNumber)}</h3>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setFoundLead(null); setJoNumberSearch(''); }}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm">
                                <div className='flex items-center gap-2'>
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-gray-600">Customer:</span>
                                <span className="text-black">{toTitleCase(foundLead.customerName)}</span>
                                </div>
                                <div className='flex items-center gap-2'>
                                <Building className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-gray-600">Company:</span>
                                <span className="text-black">{foundLead.companyName && foundLead.companyName !== '-' ? toTitleCase(foundLead.companyName) : 'N/A'}</span>
                                </div>
                                <div className='flex items-center gap-2'>
                                <Phone className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-gray-600">Contact:</span>
                                <span className="text-black">{getContactDisplay() || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="pt-4 space-y-4">
                                <div className="space-y-2">
                                    <Label>Reason for Revision</Label>
                                    <Select value={newRevisionReason} onValueChange={setNewRevisionReason}>
                                        <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
                                        <SelectContent>
                                            {reasonOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Details / Concern</Label>
                                    <Textarea 
                                        placeholder="Provide specific details about the revision request..." 
                                        value={newRevisionDetails}
                                        onChange={e => setNewRevisionDetails(e.target.value)}
                                        className="min-h-[100px]"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={handleRecordRevision} disabled={isSaving || !newRevisionReason || !newRevisionDetails.trim()}>
                                        {isSaving ? 'Saving...' : 'Record Revision'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Revision History</CardTitle>
                    <CardDescription>History of all recorded revision requests.</CardDescription>
                    <Input
                        placeholder="Search History by J.O., Customer, or Digitizer..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="mt-2"
                    />
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[60vh] border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>J.O. Number</TableHead>
                                    <TableHead>Digitizer</TableHead>
                                    <TableHead>#</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead>Submitted By</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? <TableRow><TableCell colSpan={7}><Skeleton className="h-24 w-full"/></TableCell></TableRow> 
                                : filteredHistory && filteredHistory.length > 0 ? (
                                    filteredHistory.map(rev => (
                                        <TableRow key={rev.id}>
                                            <TableCell>{formatJoNumber(rev.joNumber)}</TableCell>
                                            <TableCell>{rev.assignedDigitizer || 'N/A'}</TableCell>
                                            <TableCell className="font-bold">{rev.revisionNumber}</TableCell>
                                            <TableCell>{formatDateTime(rev.timestamp).dateTime}</TableCell>
                                            <TableCell>{rev.reason}</TableCell>
                                            <TableCell className="max-w-[250px] whitespace-pre-wrap">{rev.details}</TableCell>
                                            <TableCell>{rev.submittedBy}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground h-48">
                                            No revisions recorded yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      </main>
    </Header>
  );
}