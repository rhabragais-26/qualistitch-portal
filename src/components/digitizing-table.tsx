'use client';

import { doc, updateDoc, collection, query } from 'firebase/firestore';
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
import React, { ChangeEvent, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, Trash2, Upload, PlusCircle, CheckCircle2, Circle, X, FileText, Download, Save, Edit } from 'lucide-react';
import { Badge } from './ui/badge';
import { addDays, differenceInDays } from 'date-fns';
import { cn, formatDateTime, toTitleCase, formatJoNumber as formatJoNumberUtil } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import Link from 'next/link';

type NamedOrder = {
  name: string;
  color: string;
  size: string;
  quantity: number;
  backText: string;
};

type FileObject = {
  name: string;
  url: string;
};

type Layout = {
  layoutImage?: string;
  layoutImageUploadTime?: string | null;
  layoutImageUploadedBy?: string | null;
  refLogoLeftImage?: string | null;
  refLogoLeftImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  refLogoLeftImageUploadTime?: string | null;
  refLogoLeftImageUploadedBy?: string | null;
  refLogoRightImage?: string | null;
  refLogoRightImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  refLogoRightImageUploadTime?: string | null;
  refLogoRightImageUploadedBy?: string | null;
  refBackLogoImage?: string | null;
  refBackLogoImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  refBackLogoImageUploadTime?: string | null;
  refBackLogoImageUploadedBy?: string | null;
  refBackDesignImage?: string | null;
  refBackDesignImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  refBackDesignImageUploadTime?: string | null;
  refBackDesignImageUploadedBy?: string | null;
  dstLogoLeft?: string;
  dstLogoRight?: string;
  dstBackLogo?: string;
  dstBackText?: string;
  namedOrders?: NamedOrder[];
  logoLeftImage?: string | null;
  logoLeftImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  logoLeftImageUploadTime?: string | null;
  logoLeftImageUploadedBy?: string | null;
  logoRightImage?: string | null;
  logoRightImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  logoRightImageUploadTime?: string | null;
  logoRightImageUploadedBy?: string | null;
  backLogoImage?: string | null;
  backLogoImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  backLogoImageUploadTime?: string | null;
  backLogoImageUploadedBy?: string | null;
  backDesignImage?: string | null;
  backDesignImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  backDesignImageUploadTime?: string | null;
  backDesignImageUploadedBy?: string | null;
  testLogoLeftImage?: string | null;
  testLogoLeftImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  testLogoLeftImageUploadTime?: string | null;
  testLogoLeftImageUploadedBy?: string | null;
  testLogoRightImage?: string | null;
  testLogoRightImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  testLogoRightImageUploadTime?: string | null;
  testLogoRightImageUploadedBy?: string | null;
  testBackLogoImage?: string | null;
  testBackLogoImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  testBackLogoImageUploadTime?: string | null;
  testBackLogoImageUploadedBy?: string | null;
  testBackDesignImage?: string | null;
  testBackDesignImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  testBackDesignImageUploadTime?: string | null;
  testBackDesignImageUploadedBy?: string | null;
  finalLogoEmb?: (FileObject | null)[];
  finalLogoEmbUploadTimes?: (string | null)[];
  finalLogoEmbUploadedBy?: (string | null)[];
  finalBackDesignEmb?: (FileObject | null)[];
  finalBackDesignEmbUploadTimes?: (string | null)[];
  finalBackDesignEmbUploadedBy?: (string | null)[];
  finalLogoDst?: (FileObject | null)[];
  finalLogoDstUploadTimes?: (string | null)[];
  finalLogoDstUploadedBy?: (string | null)[];
  finalBackDesignDst?: (FileObject | null)[];
  finalBackDesignDstUploadTimes?: (string | null)[];
  finalBackDesignDstUploadedBy?: (string | null)[];
  finalNamesDst?: (FileObject | null)[];
  finalNamesDstUploadTimes?: (string | null)[];
  finalNamesDstUploadedBy?: (string | null)[];
  sequenceLogo?: (FileObject | null)[];
  sequenceLogoUploadTimes?: (string | null)[];
  sequenceLogoUploadedBy?: (string | null)[];
  sequenceBackDesign?: (FileObject | null)[];
  sequenceBackDesignUploadTimes?: (string | null)[];
  sequenceBackDesignUploadedBy?: (string | null)[];
  finalProgrammedLogo?: (FileObject | null)[];
  finalProgrammedLogoUploadTimes?: (string | null)[];
  finalProgrammedLogoUploadedBy?: (string | null)[];
  finalProgrammedBackDesign?: (FileObject | null)[];
  finalProgrammedBackDesignUploadTimes?: (string | null)[];
  finalProgrammedBackDesignUploadedBy?: string | null)[];
};

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  salesRepresentative: string;
  orderType: string;
  priorityType: 'Rush' | 'Regular';
  submissionDateTime: string;
  orders: { productType: string }[];
  joNumber?: number;
  isJoPrinted?: boolean;
  isJoHardcopyReceived?: boolean;
  joHardcopyReceivedTimestamp?: string;
  isUnderProgramming?: boolean;
  isInitialApproval?: boolean;
  isLogoTesting?: boolean;
  isRevision?: boolean;
  isFinalApproval?: boolean;
  isFinalProgram?: boolean;
  isDigitizingArchived?: boolean;
  layouts?: Layout[];
  assignedDigitizer?: string | null;
  underProgrammingTimestamp?: string;
  initialApprovalTimestamp?: string;
  logoTestingTimestamp?: string;
  revisionTimestamp?: string;
  finalApprovalTimestamp?: string;
  finalProgramTimestamp?: string;
  digitizingArchivedTimestamp?: string;
  isPreparedForProduction?: boolean;
  isSentToProduction?: boolean;
}

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

type CheckboxField = 'isUnderProgramming' | 'isInitialApproval' | 'isLogoTesting' | 'isRevision' | 'isFinalApproval' | 'isFinalProgram';

type FileUploadChecklistItem = {
  label: string;
  uploaded: boolean;
  fileInfo?: string;
  timestamp?: string | null;
};

type DigitizingTableProps = {
  isReadOnly: boolean;
  filterType?: 'ONGOING' | 'COMPLETED';
};

type UserProfileInfo = {
    uid: string;
    nickname: string;
    position: string;
};

const DigitizingTableMemo = React.memo(function DigitizingTable({ isReadOnly, filterType = 'ONGOING' }: DigitizingTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userProfile, isAdmin } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [overdueFilter, setOverdueFilter] = useState('All');
  const [uncheckConfirmation, setUncheckConfirmation] = useState<{ leadId: string; field: CheckboxField | 'isJoHardcopyReceived'; } | null>(null);
  const [openCustomerDetails, setOpenCustomerDetails] = useState<string | null>(null);
  const [joReceivedConfirmation, setJoReceivedConfirmation] = useState<string | null>(null);
  const [optimisticChanges, setOptimisticChanges] = useState<Record<string, Partial<Lead>>>({});


  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading: areLeadsLoading, error: leadsError, refetch } = useCollection<Lead>(leadsQuery, undefined, { listen: false });
  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const { data: usersData, isLoading: areUsersLoading, error: usersError } = useCollection<UserProfileInfo>(usersQuery, undefined, { listen: false });

  const isLoading = areLeadsLoading || areUsersLoading;
  const error = leadsError || usersError;

  const digitizers = useMemo(() => {
    if (!usersData) return [];
    return usersData.filter(user => user.position === 'Digitizer').sort((a,b) => a.nickname.localeCompare(b.nickname));
  }, [usersData]);
  
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadLeadId, setUploadLeadId] = useState<string | null>(null);
  const [uploadField, setUploadField] = useState<CheckboxField | null>(null);
  
  const [initialLogoLeftImages, setInitialLogoLeftImages] = useState<(string | null)[]>([]);
  const [initialLogoRightImages, setInitialLogoRightImages] = useState<(string | null)[]>([]);
  const [initialBackLogoImages, setInitialBackLogoImages] = useState<(string | null)[]>([]);
  const [initialBackDesignImages, setInitialBackDesignImages] = useState<(string | null)[]>([]);
  const [testLogoLeftImages, setTestLogoLeftImages] = useState<(string | null)[]>([]);
  const [testLogoRightImages, setTestLogoRightImages] = useState<(string | null)[]>([]);
  const [testBackLogoImages, setTestBackLogoImages] = useState<(string | null)[]>([]);
  const [testBackDesignImages, setTestBackDesignImages] = useState<(string | null)[]>([]);
  const [noTestingNeeded, setNoTestingNeeded] = useState(false);
  
  const [finalLogoEmb, setFinalLogoEmb] = useState<(FileObject | null)[]>([null]);
  const [finalBackDesignEmb, setFinalBackDesignEmb] = useState<(FileObject | null)[]>([null]);
  const [finalLogoDst, setFinalLogoDst] = useState<(FileObject | null)[]>([null]);
  const [finalBackDesignDst, setFinalBackDesignDst] = useState<(FileObject | null)[]>([]);
  const [finalNamesDst, setFinalNamesDst] = useState<(FileObject | null)[]>([]);
  const [sequenceLogo, setSequenceLogo] = useState<(string | null)[]>([]);
  const [sequenceBackDesign, setSequenceBackDesign] = useState<(string | null)[]>([]);
  const [finalProgrammedLogo, setFinalProgrammedLogo] = useState<(string | null)[]>([]);
  const [finalProgrammedBackDesign, setFinalProgrammedBackDesign] = useState<(string | null)[]>([]);
  const [isNamesOnly, setIsNamesOnly] = useState(false);


  const finalLogoEmbUploadRefs = useRef<(HTMLInputElement | null)[]>([]);
  const finalBackDesignEmbUploadRefs = useRef<(HTMLInputElement | null)[]>([]);
  const finalLogoDstUploadRefs = useRef<(HTMLInputElement | null)[]>([]);
  const finalBackDesignDstUploadRefs = useRef<(HTMLInputElement | null)[]>([]);
  const finalNamesDstUploadRefs = useRef<(HTMLInputElement | null)[]>([]);


  const [reviewConfirmLead, setReviewConfirmLead] = useState<Lead | null>(null);
  const [imageInView, setImageInView] = useState<string | null>(null);
  
  const isViewOnly = isReadOnly || filterType === 'COMPLETED';
  
  const getDigitizerColor = (nickname?: string | null): string => {
    if (!nickname || nickname === 'unassigned') {
        return 'bg-gray-100 text-gray-800';
    }
    const colors = [
        'bg-sky-100 text-sky-800', 'bg-teal-100 text-teal-800', 'bg-cyan-100 text-cyan-800',
        'bg-emerald-100 text-emerald-800', 'bg-lime-100 text-lime-800', 'bg-amber-100 text-amber-800',
        'bg-orange-100 text-orange-800', 'bg-fuchsia-100 text-fuchsia-800', 'bg-pink-100 text-pink-800',
        'bg-rose-100 text-rose-800', 'bg-violet-100 text-violet-800', 'bg-indigo-100 text-indigo-800',
        'bg-red-100 text-red-800', 'bg-green-100 text-green-800', 'bg-blue-100 text-blue-800',
        'bg-purple-100 text-purple-800', 'bg-yellow-100 text-yellow-800'
    ];
    let hash = 0;
    for (let i = 0; i < nickname.length; i++) {
        hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
  };

  const handleDigitizerChange = (leadId: string, digitizerNickname: string) => {
    if (!firestore || (isViewOnly && !isAdmin && filterType !== 'COMPLETED')) return;
    
    if (filterType === 'COMPLETED' && !isAdmin) return;

    const newValue = digitizerNickname === 'unassigned' ? null : digitizerNickname;

    setOptimisticChanges(prev => ({
        ...prev,
        [leadId]: {
            ...prev[leadId],
            assignedDigitizer: newValue,
        }
    }));

    const leadDocRef = doc(firestore, 'leads', leadId);
    updateDoc(leadDocRef, {
        assignedDigitizer: newValue
    }).then(() => {
        toast({
            title: 'Digitizer Assigned',
            description: `${newValue || 'Unassigned'} has been assigned.`,
        });
    }).catch((e: any) => {
        toast({
            variant: 'destructive',
            title: 'Assignment Failed',
            description: e.message,
        });
        setOptimisticChanges(prev => {
            const currentChanges = { ...prev };
            const leadChanges = { ...currentChanges[leadId] };
            delete leadChanges.assignedDigitizer;
            currentChanges[leadId] = leadChanges;
            return currentChanges;
        });
    });
  };

  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${''}${mobile} / ${landline}${''}`;
    }
    return mobile || landline || null;
  }, []);

  const formatJoNumber = useCallback((joNumber: number | undefined) => {
    if (!joNumber) return '';
    return formatJoNumberUtil(joNumber);
  }, []);

  const calculateDigitizingDeadline = useCallback((lead: Lead) => {
    if (lead.isFinalProgram) {
        const finalProgramTime = lead.finalProgramTimestamp ? new Date(lead.finalProgramTimestamp) : new Date();
        const remainingDays = differenceInDays(addDays(new Date(lead.submissionDateTime), lead.priorityType === 'Rush' ? 2 : 6), finalProgramTime);
        if (remainingDays < 0) {
            return { text: `${Math.abs(remainingDays)} day(s) overdue`, isOverdue: true, isUrgent: false, remainingDays };
        }
        return { text: `${remainingDays} day(s) remaining`, isOverdue: false, isUrgent: false, remainingDays };
    }
    const submissionDate = new Date(lead.submissionDateTime);
    const deadlineDays = lead.priorityType === 'Rush' ? 2 : 6;
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

  const updateStatus = useCallback((leadId: string, field: CheckboxField | 'isJoHardcopyReceived', value: boolean) => {
    if (!firestore) return Promise.reject(new Error("Firestore not available"));
    const leadDocRef = doc(firestore, 'leads', leadId);
    const now = new Date().toISOString();

    const timestampField = `${field.replace('is', '').charAt(0).toLowerCase() + field.slice(3)}Timestamp`;
    
    const updateData: { [key: string]: any } = { 
        [field]: value,
        [timestampField]: value ? now : null,
        lastModified: now,
    };

    if (!value && field !== 'isJoHardcopyReceived') {
        const sequence: CheckboxField[] = ['isUnderProgramming', 'isInitialApproval', 'isLogoTesting', 'isRevision', 'isFinalApproval', 'isFinalProgram'];
        const currentIndex = sequence.indexOf(field);
        if (currentIndex > -1) {
            for (let i = currentIndex + 1; i < sequence.length; i++) {
                const nextField = sequence[i];
                if (nextField) {
                  updateData[nextField] = false;
                  const nextTimestampField = `${nextField.replace('is', '').charAt(0).toLowerCase() + nextField.slice(3)}Timestamp`;
                  updateData[nextTimestampField] = null;
                }
            }
        }
    }
    
    if (field === 'isFinalApproval' && value) {
        // Do not uncheck revision, just disable it
    }

    return updateDoc(leadDocRef, updateData).catch(e => {
        console.error('Error updating status:', e);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: e.message || 'Could not update the status.',
        });
        throw e; // Re-throw to be caught by the caller for UI reversal
    });
  }, [firestore, toast]);
  
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
        
        const totalCustomerQuantity = orders.reduce((sum, o) => sum + o.orders.reduce((orderSum, item) => orderSum + (item.quantity || 0), 0), 0);
        
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

  
  const filteredLeads = React.useMemo(() => {
    if (!processedLeads) return [];
    
    const leadsWithJo = processedLeads.filter(lead => {
        const matchesFilterType = filterType === 'COMPLETED' ? lead.isDigitizingArchived : !lead.isDigitizingArchived;
        const shouldBypass = ['Stock (Jacket Only)', 'Stock Design', 'Item Sample'].includes(lead.orderType);
        return lead.joNumber && matchesFilterType && !shouldBypass;
    });

    const filtered = leadsWithJo.filter(lead => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ?
        (toTitleCase(lead.customerName).toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && toTitleCase(lead.companyName).toLowerCase().includes(lowercasedSearchTerm)) ||
        (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))) ||
        (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))))
        : true;
      
      const joString = formatJoNumber(lead.joNumber);
      const matchesJo = joNumberSearch ? 
        (joString.toLowerCase().includes(joNumberSearch.toLowerCase()))
        : true;
      
      const matchesPriority = priorityFilter === 'All' || lead.priorityType === priorityFilter;

      const deadlineInfo = calculateDigitizingDeadline(lead);
      const matchesOverdue = overdueFilter === 'All' ||
        (overdueFilter === 'Overdue' && deadlineInfo.isOverdue) ||
        (overdueFilter === 'Nearly Overdue' && !deadlineInfo.isOverdue && deadlineInfo.isUrgent);

      return matchesSearch && matchesJo && matchesPriority && matchesOverdue;
    });

    return filtered.sort((a, b) => {
        const aDeadline = calculateDigitizingDeadline(a);
        const bDeadline = calculateDigitizingDeadline(b);
        return aDeadline.remainingDays - bDeadline.remainingDays;
    });

  }, [processedLeads, searchTerm, joNumberSearch, priorityFilter, overdueFilter, formatJoNumber, calculateDigitizingDeadline, filterType]);

  const displayedLeads = useMemo(() => {
    if (!filteredLeads) return [];
    return filteredLeads.map(lead => {
      return { ...lead, ...(optimisticChanges[lead.id] || {}) };
    });
  }, [filteredLeads, optimisticChanges]);
  
  const handleJoReceivedChange = useCallback((leadId: string, checked: boolean) => {
    const lead = displayedLeads?.find((l) => l.id === leadId);
    if (!lead) return;
    const isCurrentlyChecked = lead.isJoHardcopyReceived || false;

    if (!checked && isCurrentlyChecked) {
      setUncheckConfirmation({ leadId, field: 'isJoHardcopyReceived' });
    } else if (checked && !isCurrentlyChecked) {
      setJoReceivedConfirmation(leadId);
    }
  }, [displayedLeads]);
  
  const confirmJoReceived = useCallback(() => {
    if (joReceivedConfirmation) {
      const leadId = joReceivedConfirmation;
      const optimisticUpdate = { isJoHardcopyReceived: true, joHardcopyReceivedTimestamp: new Date().toISOString() };
      setOptimisticChanges(prev => ({ ...prev, [leadId]: { ...prev[leadId], ...optimisticUpdate } }));
      
      setJoReceivedConfirmation(null);

      updateStatus(leadId, 'isJoHardcopyReceived', true).catch(() => {
          toast({ variant: 'destructive', title: 'Update Failed', description: 'Changes could not be saved.' });
          setOptimisticChanges(prev => {
            const { isJoHardcopyReceived: _r, joHardcopyReceivedTimestamp: _t, ...rest } = prev[leadId] || {};
            return { ...prev, [leadId]: rest };
          });
      });
    }
  }, [joReceivedConfirmation, updateStatus, toast]);

  const confirmUncheck = useCallback(async () => {
    if (!uncheckConfirmation || !firestore) return;
    const { leadId, field } = uncheckConfirmation;
    try {
        const leadDocRef = doc(firestore, 'leads', leadId);
        const updateData: { [key: string]: any } = { 
            [field]: false, 
            [`${field.replace('is', '').charAt(0).toLowerCase() + field.slice(3)}Timestamp`]: null 
        };

        if (field !== 'isJoHardcopyReceived') {
            const sequence: CheckboxField[] = ['isUnderProgramming', 'isInitialApproval', 'isLogoTesting', 'isRevision', 'isFinalApproval', 'isFinalProgram'];
            const currentIndex = sequence.indexOf(field);
            if (currentIndex > -1) {
                for (let i = currentIndex + 1; i < sequence.length; i++) {
                    const nextField = sequence[i];
                    if (nextField) {
                      updateData[nextField] = false;
                      const nextTimestampField = `${nextField.replace('is', '').charAt(0).toLowerCase() + nextField.slice(3)}Timestamp`;
                      updateData[nextTimestampField] = null;
                    }
                }
            }
        }
        await updateDoc(leadDocRef, updateData);
    } catch (e: any) {
        console.error(`Error unchecking ${field}:`, e);
        toast({ variant: "destructive", title: "Update Failed", description: e.message || "Could not update the status." });
    } finally {
        setUncheckConfirmation(null);
    }
  }, [uncheckConfirmation, firestore, toast]);

  const handleConfirmReview = useCallback(async () => {
    if (!reviewConfirmLead || !firestore) return;
    try {
        const lead = reviewConfirmLead;
        const leadDocRef = doc(firestore, 'leads', lead.id);
        const isClientOrPatchOnly = lead.orders.every(o => o.productType === 'Client Owned' || o.productType === 'Patches');
        
        const updateData: any = {
            isDigitizingArchived: true,
            digitizingArchivedTimestamp: new Date().toISOString(),
        };

        if (isClientOrPatchOnly) {
            updateData.isSentToProduction = true;
            updateData.sentToProductionTimestamp = new Date().toISOString();
        } else {
            updateData.isPreparedForProduction = true;
        }

        await updateDoc(leadDocRef, updateData);
        
        const deadlineInfo = calculateDigitizingDeadline(lead);
        const notification = {
            id: `progress-${lead.id}-${new Date().toISOString()}`,
            type: 'progress',
            leadId: lead.id,
            joNumber: formatJoNumberUtil(lead.joNumber),
            customerName: toTitleCase(lead.customerName),
            companyName: lead.companyName,
            contactNumber: getContactDisplay(lead),
            message: isClientOrPatchOnly 
              ? 'Order endorsed to Production.' 
              : 'Order endorsed to Inventory for item preparation.',
            overdueStatus: deadlineInfo.text,
            isRead: false,
            timestamp: new Date().toISOString(),
            isDisapproved: false
        };
        const existingNotifications = JSON.parse(localStorage.getItem('progress-notifications') || '[]') as any[];
        localStorage.setItem('progress-notifications', JSON.stringify([...existingNotifications, notification]));
        window.dispatchEvent(new StorageEvent('storage', { key: 'progress-notifications' }));


        toast({
            title: "Project Endorsed",
            description: isClientOrPatchOnly
                ? "The project has been sent directly to the Production queue."
                : "The project has been moved to the Item Preparation queue.",
        });
        setReviewConfirmLead(null);
    } catch (e: any) {
        console.error('Error sending to production:', e);
        toast({
            variant: 'destructive',
            title: 'Action Failed',
            description: e.message || 'Could not send the project to production.',
        });
    }
  }, [reviewConfirmLead, firestore, toast, calculateDigitizingDeadline, getContactDisplay, formatJoNumberUtil]);


  const toggleLeadDetails = useCallback((leadId: string) => {
    setOpenLeadId(openLeadId === leadId ? null : leadId);
  }, [openLeadId]);
  
  const fileChecklistItems: FileUploadChecklistItem[] = useMemo(() => {
    if (!reviewConfirmLead) return [];
    const layout = reviewConfirmLead.layouts?.[0];
    if (!layout) return [];

    const finalProgramFiles = [
      ...(layout.sequenceLogo || []).map((file, i) => file && { src: file.url, label: `Sequence Logo ${i + 1}`, timestamp: layout.sequenceLogoUploadTimes?.[i], uploadedBy: layout.sequenceLogoUploadedBy?.[i] }),
      ...(layout.sequenceBackDesign || []).map((file, i) => file && { src: file.url, label: `Sequence Back Design ${i+1}`, timestamp: layout.sequenceBackDesignUploadTimes?.[i], uploadedBy: layout.sequenceBackDesignUploadedBy?.[i] }),
      ...(layout.finalProgrammedLogo || []).map((file, i) => file && { src: file.url, label: `Final Programmed Logo ${i + 1}`, timestamp: layout.finalProgrammedLogoUploadTimes?.[i], uploadedBy: layout.finalProgrammedLogoUploadedBy?.[i] }),
      ...(layout.finalProgrammedBackDesign || []).map((file, i) => file && { src: file.url, label: `Final Programmed Back Design ${i + 1}`, timestamp: layout.finalProgrammedBackDesignUploadTimes?.[i], uploadedBy: layout.finalProgrammedBackDesignUploadedBy?.[i] }),
    ];
    
    return finalProgramFiles.filter((item): item is FileUploadChecklistItem => !!item);
  }, [reviewConfirmLead]);
  
    const handleImageUpload = useCallback((file: File, setter: React.Dispatch<React.SetStateAction<(string | null)[]>>, index: number) => {
      if (isViewOnly) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          setter(prev => {
              const newImages = [...prev];
              newImages[index] = e.target.result as string;
              return newImages;
          });
      };
      reader.readAsDataURL(file);
    }, [isViewOnly]);

  const handleImagePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>, setter: React.Dispatch<React.SetStateAction<(string | null)[]>>, index: number) => {
    if (isViewOnly) return;
    const file = e.clipboardData.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageUpload(file, setter, index);
    }
  }, [isViewOnly, handleImageUpload]);

  const handleClearImage = useCallback((setter: React.Dispatch<React.SetStateAction<(string | null)[]>>, index: number) => {
    setter(prev => {
        const newImages = [...prev];
        newImages[index] = null;
        return newImages;
    });
  }, []);

  const handleRemoveImage = useCallback((e: React.MouseEvent, setter: React.Dispatch<React.SetStateAction<(string|null)[]>>, index: number) => {
    e.stopPropagation();
    setter(prev => prev.filter((_, i) => i !== index));
  }, []);

  const addFile = useCallback((setter: React.Dispatch<React.SetStateAction<(string | null)[]>>) => {
    setter(prev => [...prev, null]);
  }, []);

  const handleMultipleFileUpload = useCallback((event: ChangeEvent<HTMLInputElement>, setFilesState: React.Dispatch<React.SetStateAction<(FileObject | null)[]>>, filesState: (FileObject | null)[], index: number) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newFiles = [...filesState];
        newFiles[index] = { name: file.name, url: e.target!.result as string };
        setFilesState(newFiles);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const addFileMultiple = useCallback((setFilesState: React.Dispatch<React.SetStateAction<(FileObject | null)[]>>) => {
    setFilesState(prev => [...prev, null]);
  }, []);

  const removeFile = useCallback((setFilesState: React.Dispatch<React.SetStateAction<(FileObject | null)[]>>, index: number, refs: React.MutableRefObject<(HTMLInputElement | null)[]>) => {
    setFilesState(prev => prev.filter((_, i) => i !== index));
    if (refs.current && refs.current[index]) {
      refs.current[index]!.value = '';
    }
  }, []);

  const handleUploadDialogSave = useCallback(async () => {
    if (!uploadLeadId || !uploadField || !firestore || !leads || !userProfile) return;
    
    if (uploadField === 'isLogoTesting' && noTestingNeeded) {
        const optimisticUpdate = {
            [uploadField]: true,
            [`${uploadField.replace('is', '').charAt(0).toLowerCase() + uploadField.slice(3)}Timestamp`]: new Date().toISOString()
        };
        setOptimisticChanges(prev => ({ ...prev, [uploadLeadId]: { ...prev[uploadLeadId], ...optimisticUpdate } }));
        setIsUploadDialogOpen(false);
        updateStatus(uploadLeadId, uploadField, true).catch(() => {
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Changes could not be saved.' });
            setOptimisticChanges(prev => {
                const { [uploadField!]: _removed, [`${uploadField!.replace('is', '').charAt(0).toLowerCase() + uploadField!.slice(3)}Timestamp`]: _removedTs, ...rest } = prev[uploadLeadId] || {};
                return { ...prev, [uploadLeadId]: rest };
             });
        });
        return;
    }
  
    // Optimistic UI updates
    const optimisticUpdate = {
        [uploadField]: true,
        [`${uploadField.replace('is', '').charAt(0).toLowerCase() + uploadField.slice(3)}Timestamp`]: new Date().toISOString()
    };
    setOptimisticChanges(prev => ({ ...prev, [uploadLeadId]: { ...prev[uploadLeadId], ...optimisticUpdate } }));
    setIsUploadDialogOpen(false); // Close dialog immediately
  
    const storage = getStorage();
    const now = new Date().toISOString();
  
    const uploadAndGetURL = async (lead: Lead, imageData: string | null, fieldName: string, index: number): Promise<{ url: string; uploadTime: string; uploadedBy: string } | null> => {
        if (!imageData) return null;
        if (imageData.startsWith('http')) {
            const pluralFieldName = `${fieldName}s`;
            const existingArray = (lead.layouts?.[0]?.[pluralFieldName as keyof Layout] as { url: string; uploadTime: string; uploadedBy: string }[]) || [];
            const existingImageObject = existingArray.find(img => img.url === imageData);
            if (existingImageObject) return existingImageObject;
            
            if (lead.layouts?.[0]?.[fieldName as keyof Layout] === imageData) {
                const timestamp = lead.layouts?.[0]?.[`${fieldName}UploadTime` as keyof Layout] as string | null;
                const uploader = lead.layouts?.[0]?.[`${fieldName}UploadedBy` as keyof Layout] as string | null;
                return { url: imageData, uploadTime: timestamp || now, uploadedBy: uploader || userProfile.nickname };
            }
            return { url: imageData, uploadTime: now, uploadedBy: userProfile.nickname };
        }
        if(!imageData.startsWith('data:')) return null;

        const storageRef = ref(storage, `leads-images/${uploadLeadId}/${fieldName}_${index}_${Date.now()}`);
        const snapshot = await uploadString(storageRef, imageData, 'data_url');
        const downloadURL = await getDownloadURL(snapshot.ref);
        return { url: downloadURL, uploadTime: now, uploadedBy: userProfile.nickname };
    };
  
    const uploadFileArray = async (lead: Lead, files: (FileObject | null)[], folderName: string): Promise<(FileObject | null)[]> => {
      return Promise.all(
        files.map(async (file, index) => {
          if (!file || !file.url.startsWith('data:')) return file;
          const urlData = await uploadAndGetURL(lead, file.url, `${folderName}/${index}_${file.name}`, index);
          return urlData ? { name: file.name, url: urlData.url } : null;
        })
      );
    };
  
    const uploadImageArrayAndCreateFileObjects = async (lead: Lead, images: (string | null)[], fieldName: string): Promise<{
        files: FileObject[],
        timestamps: string[],
        uploaders: string[]
    }> => {
        if (!images) return { files: [], timestamps: [], uploaders: [] };
        const uploads = await Promise.all(images.map((img, i) => uploadAndGetURL(lead, img, fieldName, i)));
        const successfulUploads = uploads.filter((u): u is { url: string; uploadTime: string; uploadedBy: string } => !!u);
        return {
            files: successfulUploads.map(u => ({ name: `${fieldName}_${Date.now()}.png`, url: u.url })),
            timestamps: successfulUploads.map(u => u.uploadTime),
            uploaders: successfulUploads.map(u => u.uploadedBy)
        };
    };

    try {
      const lead = leads.find(l => l.id === uploadLeadId);
      if (!lead) throw new Error("Lead not found");

      const currentLayouts = lead.layouts?.length ? JSON.parse(JSON.stringify(lead.layouts)) : [{}];
      let updatedFirstLayout = currentLayouts[0] || {};
  
      if (uploadField === 'isUnderProgramming') {
        const [leftImages, rightImages, backLogoImages, backDesignImages] = await Promise.all([
            Promise.all(initialLogoLeftImages.map((img, i) => uploadAndGetURL(lead, img, 'logoLeftImage', i))),
            Promise.all(initialLogoRightImages.map((img, i) => uploadAndGetURL(lead, img, 'logoRightImage', i))),
            Promise.all(initialBackLogoImages.map((img, i) => uploadAndGetURL(lead, img, 'backLogoImage', i))),
            Promise.all(initialBackDesignImages.map((img, i) => uploadAndGetURL(lead, img, 'backDesignImage', i))),
        ]);

        updatedFirstLayout = {
            ...updatedFirstLayout,
            logoLeftImages: leftImages.filter(Boolean),
            logoRightImages: rightImages.filter(Boolean),
            backLogoImages: backLogoImages.filter(Boolean),
            backDesignImages: backDesignImages.filter(Boolean),
        };
        
        delete updatedFirstLayout.logoLeftImage;
        delete updatedFirstLayout.logoRightImage;
        delete updatedFirstLayout.backLogoImage;
        delete updatedFirstLayout.backDesignImage;
        delete updatedFirstLayout.logoLeftImageUploadTime;
        delete updatedFirstLayout.logoLeftImageUploadedBy;
        delete updatedFirstLayout.logoRightImageUploadTime;
        delete updatedFirstLayout.logoRightImageUploadedBy;
        delete updatedFirstLayout.backLogoImageUploadTime;
        delete updatedFirstLayout.backLogoImageUploadedBy;
        delete updatedFirstLayout.backDesignImageUploadTime;
        delete updatedFirstLayout.backDesignImageUploadedBy;

      } else if (uploadField === 'isLogoTesting') {
        const [leftImages, rightImages, backLogoImages, backDesignImages] = await Promise.all([
            Promise.all(testLogoLeftImages.map((img, i) => uploadAndGetURL(lead, img, `testLogoLeftImage`, i))),
            Promise.all(testLogoRightImages.map((img, i) => uploadAndGetURL(lead, img, `testLogoRightImage`, i))),
            Promise.all(testBackLogoImages.map((img, i) => uploadAndGetURL(lead, img, `testBackLogoImage`, i))),
            Promise.all(testBackDesignImages.map((img, i) => uploadAndGetURL(lead, img, `testBackDesignImage`, i))),
        ]);
        
        updatedFirstLayout = {
            ...updatedFirstLayout,
            testLogoLeftImages: leftImages.filter(Boolean),
            testLogoRightImages: rightImages.filter(Boolean),
            testBackLogoImages: backLogoImages.filter(Boolean),
            testBackDesignImages: backDesignImages.filter(Boolean),
        };

        delete updatedFirstLayout.testLogoLeftImage;
        delete updatedFirstLayout.testLogoRightImage;
        delete updatedFirstLayout.testBackLogoImage;
        delete updatedFirstLayout.testBackDesignImage;
        delete updatedFirstLayout.testLogoLeftImageUploadTime;
        delete updatedFirstLayout.testLogoLeftImageUploadedBy;
        delete updatedFirstLayout.testLogoRightImageUploadTime;
        delete updatedFirstLayout.testLogoRightImageUploadedBy;
        delete updatedFirstLayout.testBackLogoImageUploadTime;
        delete updatedFirstLayout.testBackLogoImageUploadedBy;
        delete updatedFirstLayout.testBackDesignImageUploadTime;
        delete updatedFirstLayout.testBackDesignImageUploadedBy;
      } else if (uploadField === 'isFinalProgram') {
        const { files: programmedLogoFiles, timestamps: programmedLogoTimes, uploaders: programmedLogoUploaders } = await uploadImageArrayAndCreateFileObjects(lead, finalProgrammedLogo, 'finalProgrammedLogo');
        const { files: programmedBackFiles, timestamps: programmedBackTimes, uploaders: programmedBackUploaders } = await uploadImageArrayAndCreateFileObjects(lead, finalProgrammedBackDesign, 'finalProgrammedBackDesign');
        const { files: sequenceLogoFiles, timestamps: sequenceLogoTimes, uploaders: sequenceLogoUploaders } = await uploadImageArrayAndCreateFileObjects(lead, sequenceLogo, 'sequenceLogo');
        const { files: sequenceBackFiles, timestamps: sequenceBackTimes, uploaders: sequenceBackUploaders } = await uploadImageArrayAndCreateFileObjects(lead, sequenceBackDesign, 'sequenceBackDesign');
        
        const finalNamesToUpload = isNamesOnly ? finalNamesDst : [];
        const [
          finalLogoEmbUrls, finalBackDesignEmbUrls, finalLogoDstUrls, finalBackDesignDstUrls, finalNamesDstUrls,
        ] = await Promise.all([
          uploadFileArray(lead, finalLogoEmb, 'finalLogoEmb'),
          uploadFileArray(lead, finalBackDesignEmb, 'finalBackDesignEmb'),
          uploadFileArray(lead, finalLogoDst, 'finalLogoDst'),
          uploadFileArray(lead, finalBackDesignDst, 'finalBackDesignDst'),
          uploadFileArray(lead, finalNamesToUpload, 'finalNamesDst'),
        ]);

        const createTimestampArray = (newFiles: (FileObject|null)[], oldFiles?: (FileObject|null)[], oldTimes?: (string|null)[]) => newFiles.map((file, index) => {
            const existingFile = oldFiles?.[index];
            const existingTime = oldTimes?.[index];
            return file && file.url === existingFile?.url ? existingTime : (file ? now : null);
        });

        const createUploaderArray = (newFiles: (FileObject|null)[], oldFiles?: (FileObject|null)[], oldUploaders?: (string|null)[]) => newFiles.map((file, index) => {
            const existingFile = oldFiles?.[index];
            const existingUploader = oldUploaders?.[index];
            return file && file.url === existingFile?.url ? existingUploader : (file ? userProfile.nickname : null);
        });
  
        updatedFirstLayout = {
          ...updatedFirstLayout,
          finalLogoEmb: finalLogoEmbUrls,
          finalLogoEmbUploadTimes: createTimestampArray(finalLogoEmbUrls, updatedFirstLayout.finalLogoEmb, updatedFirstLayout.finalLogoEmbUploadTimes),
          finalLogoEmbUploadedBy: createUploaderArray(finalLogoEmbUrls, updatedFirstLayout.finalLogoEmb, updatedFirstLayout.finalLogoEmbUploadedBy),
          finalBackDesignEmb: finalBackDesignEmbUrls,
          finalBackDesignEmbUploadTimes: createTimestampArray(finalBackDesignEmbUrls, updatedFirstLayout.finalBackDesignEmb, updatedFirstLayout.finalBackDesignEmbUploadTimes),
          finalBackDesignEmbUploadedBy: createUploaderArray(finalBackDesignEmbUrls, updatedFirstLayout.finalBackDesignEmb, updatedFirstLayout.finalBackDesignEmbUploadedBy),
          finalLogoDst: finalLogoDstUrls,
          finalLogoDstUploadTimes: createTimestampArray(finalLogoDstUrls, updatedFirstLayout.finalLogoDst, updatedFirstLayout.finalLogoDstUploadTimes),
          finalLogoDstUploadedBy: createUploaderArray(finalLogoDstUrls, updatedFirstLayout.finalLogoDst, updatedFirstLayout.finalLogoDstUploadedBy),
          finalBackDesignDst: finalBackDesignDstUrls,
          finalBackDesignDstUploadTimes: createTimestampArray(finalBackDesignDstUrls, updatedFirstLayout.finalBackDesignDst, updatedFirstLayout.finalBackDesignDstUploadTimes),
          finalBackDesignDstUploadedBy: createUploaderArray(finalBackDesignDstUrls, updatedFirstLayout.finalBackDesignDst, updatedFirstLayout.finalBackDesignDstUploadedBy),
          finalNamesDst: finalNamesDstUrls,
          finalNamesDstUploadTimes: createTimestampArray(finalNamesDstUrls, updatedFirstLayout.finalNamesDst, updatedFirstLayout.finalNamesDstUploadTimes),
          finalNamesDstUploadedBy: createUploaderArray(finalNamesDstUrls, updatedFirstLayout.finalNamesDst, updatedFirstLayout.finalNamesDstUploadedBy),
          
          finalProgrammedLogo: programmedLogoFiles,
          finalProgrammedLogoUploadTimes: programmedLogoTimes,
          finalProgrammedLogoUploadedBy: programmedLogoUploaders,
          
          finalProgrammedBackDesign: programmedBackFiles,
          finalProgrammedBackDesignUploadTimes: programmedBackTimes,
          finalProgrammedBackDesignUploadedBy: programmedBackUploaders,

          sequenceLogo: sequenceLogoFiles,
          sequenceLogoUploadTimes: sequenceLogoTimes,
          sequenceLogoUploadedBy: sequenceLogoUploaders,

          sequenceBackDesign: sequenceBackFiles,
          sequenceBackDesignUploadTimes: sequenceBackTimes,
          sequenceBackDesignUploadedBy: sequenceBackUploaders,
        };
      }
  
      currentLayouts[0] = updatedFirstLayout;
      const leadDocRef = doc(firestore, 'leads', uploadLeadId);

      const timestampField = `${uploadField.replace('is', '').charAt(0).toLowerCase() + uploadField.slice(3)}Timestamp`;
      const updatePayload = {
        layouts: currentLayouts,
        [uploadField]: true,
        [timestampField]: now,
        lastModified: now,
        lastModifiedBy: userProfile.nickname,
      };

      await updateDoc(leadDocRef, updatePayload);
      
      toast({
        title: 'Success!',
        description: 'Status updated and files saved.',
      });
    } catch (e: any) {
      console.error('Error saving images or status:', e);
      // Revert optimistic update
      setOptimisticChanges(prev => {
        const { [uploadField!]: _removed, [`${uploadField!.replace('is', '').charAt(0).toLowerCase() + uploadField!.slice(3)}Timestamp`]: _removedTs, ...rest } = prev[uploadLeadId] || {};
        return { ...prev, [uploadLeadId]: rest };
      });
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: e.message || 'Could not save the images and update status. Changes have been reverted.',
      });
    }
  }, [uploadLeadId, uploadField, firestore, leads, userProfile, toast, noTestingNeeded, updateStatus,
      initialLogoLeftImages, initialLogoRightImages, initialBackLogoImages, initialBackDesignImages, 
      testLogoLeftImages, testLogoRightImages, testBackLogoImages, testBackDesignImages, 
      finalLogoEmb, finalBackDesignEmb, finalLogoDst, finalBackDesignDst, finalNamesDst, isNamesOnly,
      sequenceLogo, sequenceBackDesign, finalProgrammedLogo, finalProgrammedBackDesign
  ]);

  const handleCheckboxChange = useCallback((leadId: string, field: CheckboxField, checked: boolean) => {
    const lead = displayedLeads?.find((l) => l.id === leadId);
    if (!lead) return;
    const isCurrentlyChecked = lead[field] as boolean | undefined || false;

    if (!checked && isCurrentlyChecked) {
      setUncheckConfirmation({ leadId, field });
    } else if (checked && !isCurrentlyChecked) {
      if (field === 'isUnderProgramming' || field === 'isLogoTesting' || field === 'isFinalProgram') {
        setUploadLeadId(leadId);
        setUploadField(field);
        const layout = lead.layouts?.[0];
        
        const getInitialImages = (pluralField: ({ url: string } | null)[] | undefined, singularField: string | null | undefined): (string | null)[] => {
            const images: (string | null)[] = [];
            if (pluralField && pluralField.length > 0) {
                images.push(...pluralField.map(item => item?.url || null));
            } else if (singularField) {
                images.push(singularField);
            }
            if (images.length === 0) {
                return [null];
            }
            return images;
        };

        const getInitialSequenceImages = (files?: (FileObject | null)[]): (string|null)[] => {
            if (!files || files.length === 0) return [null];
            return files.map(f => f?.url || null);
        }

        if (field === 'isUnderProgramming') {
            setInitialLogoLeftImages(getInitialImages((layout as any)?.logoLeftImages, layout?.logoLeftImage));
            setInitialLogoRightImages(getInitialImages((layout as any)?.logoRightImages, layout?.logoRightImage));
            setInitialBackLogoImages(getInitialImages((layout as any)?.backLogoImages, layout?.backLogoImage));
            setInitialBackDesignImages(getInitialImages((layout as any)?.backDesignImages, layout?.backDesignImage));
        } else if (field === 'isLogoTesting') {
            setNoTestingNeeded(false);
            setTestLogoLeftImages(getInitialImages((layout as any)?.testLogoLeftImages, layout?.testLogoLeftImage));
            setTestLogoRightImages(getInitialImages((layout as any)?.testLogoRightImages, layout?.testLogoRightImage));
            setTestBackLogoImages(getInitialImages((layout as any)?.testBackLogoImages, layout?.testBackLogoImage));
            setTestBackDesignImages(getInitialImages((layout as any)?.testBackDesignImages, layout?.testBackDesignImage));
        } else { // isFinalProgram
          setIsNamesOnly(false);
          setFinalLogoEmb(layout?.finalLogoEmb?.length ? layout.finalLogoEmb : [null]);
          setFinalBackDesignEmb(layout?.finalBackDesignEmb?.length ? layout.finalBackDesignEmb : [null]);
          setFinalLogoDst(layout?.finalLogoDst?.length ? layout.finalLogoDst : [null]);
          setFinalBackDesignDst(layout?.finalBackDesignDst?.length ? layout.finalBackDesignDst : [null]);
          setFinalNamesDst(layout?.finalNamesDst || []);
          setSequenceLogo(getInitialSequenceImages(layout?.sequenceLogo));
          setSequenceBackDesign(getInitialSequenceImages(layout?.sequenceBackDesign));
          setFinalProgrammedLogo(getInitialImages((layout as any)?.finalProgrammedLogo, undefined));
          setFinalProgrammedBackDesign(getInitialImages((layout as any)?.finalProgrammedBackDesign, undefined));
        }
        setIsUploadDialogOpen(true);
      } else {
        const optimisticUpdate = { [field]: true, [`${field.replace('is', '').charAt(0).toLowerCase() + field.slice(3)}Timestamp`]: new Date().toISOString() };
        setOptimisticChanges(prev => ({ ...prev, [leadId]: { ...prev[leadId], ...optimisticUpdate } }));
        updateStatus(leadId, field, true).catch(() => {
             toast({ variant: 'destructive', title: 'Update Failed', description: 'Changes could not be saved.' });
             setOptimisticChanges(prev => {
                const { [field!]: _removed, [`${field!.replace('is', '').charAt(0).toLowerCase() + field!.slice(3)}Timestamp`]: _removedTs, ...rest } = prev[leadId] || {};
                return { ...prev, [leadId]: rest };
             });
        });
      }
    }
  }, [displayedLeads, updateStatus, toast]);

  const renderUploadDialogContent = useCallback(() => {
    if (!uploadField || !uploadLeadId) return null;
    const isDisabled = isViewOnly;
    
    const renderMultipleFileUpload = (label: string, filesState: (FileObject|null)[], setFilesState: React.Dispatch<React.SetStateAction<(FileObject|null)[]>>, refs: React.MutableRefObject<(HTMLInputElement | null)[]>) => {
      const isNamesDst = label === '';
      return (
          <div className={cn(isNamesDst && "col-span-2")}>
              <div className="flex items-center gap-2">
                  {label && <Label>{label}</Label>}
                  {!isDisabled && (
                      <Button type="button" size="icon" variant="ghost" className="h-5 w-5 hover:bg-gray-200" onClick={() => addFileMultiple(setFilesState)}>
                          <PlusCircle className="h-4 w-4" />
                      </Button>
                  )}
              </div>
              <div className={cn("grid gap-2 mt-2", isNamesDst ? "grid-cols-2" : "grid-cols-1")}>
                  {filesState.map((file, index) => (
                      <div key={index} className="flex items-center gap-2">
                          {file && file.name ? (
                              <div className="flex items-center gap-2 flex-1 p-2 border rounded-md bg-gray-100 h-9">
                                  <FileText className="h-4 w-4 text-gray-500" />
                                  <span className="text-xs truncate font-medium text-blue-600">{file.name}</span>
                              </div>
                          ) : (
                              <Input
                                  ref={el => { if(refs.current) refs.current[index] = el }}
                                  type="file"
                                  className="text-xs flex-1 h-9"
                                  onChange={(e) => handleMultipleFileUpload(e, setFilesState, filesState, index)}
                                  disabled={isDisabled}
                              />
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFile(setFilesState, index, refs)} disabled={isDisabled}>
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      </div>
                  ))}
              </div>
              {isNamesDst && (
                <Button type="button" size="sm" variant="outline" className="h-8 mt-2" onClick={() => addFileMultiple(setFilesState)} disabled={isDisabled}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add File
                </Button>
              )}
          </div>
      );
    };
    
    const renderUploadBoxes = (label: string, images: (string|null)[], setter: React.Dispatch<React.SetStateAction<(string|null)[]>>) => {
        const displayImages = images.length > 0 ? images : [null];
        return (
          <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>{label}</Label>
                  {!isDisabled && displayImages.length < 3 && (
                    <Button type="button" size="icon" variant="ghost" className="h-5 w-5 hover:bg-gray-200" onClick={() => addFile(setter)}>
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                  )}
              </div>
              {displayImages.map((image, index) => (
                  <div key={index} className="flex items-center gap-2">
                      <div
                        tabIndex={0}
                        className={cn(
                            "relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-48 flex-1 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
                            !isDisabled && "cursor-pointer"
                        )}
                        onClick={() => image && setImageInView(image)}
                        onDoubleClick={() => handleImagePaste(e, setter, index)}
                        onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}
                      >
                          {image ? (<>
                            <Image src={image} alt={`${label} ${index + 1}`} layout="fill" objectFit="contain" className="rounded-md" />
                            {!isDisabled && (
                                <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClearImage(setter, index);
                                }}
                                >
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                          </>) : (<div className="text-gray-500">  No image uploaded"}</p> </div>)}
                          
                      </div>
                      {!isDisabled && index > 0 && (
                          <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive self-center"
                              onClick={(e) => handleRemoveImage(e, setter, index)}
                          >
                              <X className="h-5 w-5" />
                          </Button>
                      )}
                  </div>
              ))}
          </div>
        );
      };

    if (uploadField === 'isUnderProgramming') {
      return (
        
            {renderUploadBoxes('Logo Left', initialLogoLeftImages, setInitialLogoLeftImages)}
            {renderUploadBoxes('Logo Right', initialLogoRightImages, setInitialLogoRightImages)}
            {renderUploadBoxes('Back Logo', initialBackLogoImages, setInitialBackLogoImages)}
            {renderUploadBoxes('Back Design', initialBackDesignImages, setInitialBackDesignImages)}
        
      );
    } else if (uploadField === 'isLogoTesting') {
       return (
        

            
                {renderUploadBoxes('Logo Left', testLogoLeftImages, setTestLogoLeftImages)}
                {renderUploadBoxes('Logo Right', testLogoRightImages, setTestLogoRightImages)}
                {renderUploadBoxes('Back Logo', testBackLogoImages, setTestBackLogoImages)}
                {renderUploadBoxes('Back Design', testBackDesignImages, setTestBackDesignImages)}
            

            
                
                    No need for testing
                
            
        
      );
    } else if (uploadField === 'isFinalProgram') {
      return (
          

              
                  {renderMultipleFileUpload('Logo (EMB)', finalLogoEmb, setFinalLogoEmb, finalLogoEmbUploadRefs)}
                  {renderMultipleFileUpload('Back Design (EMB)', finalBackDesignEmb, setFinalBackDesignEmb, finalBackDesignEmbUploadRefs)}
                  {renderMultipleFileUpload('Logo (DST)', finalLogoDst, setFinalLogoDst, finalLogoDstUploadRefs)}
                  {renderMultipleFileUpload('Back Design (DST)', finalBackDesignDst, setFinalBackDesignDst, finalBackDesignDstUploadRefs)}
              

              
                  
                      
                          {renderMultipleFileUpload('', finalNamesDst, setFinalNamesDst, finalNamesDstUploadRefs)}
                      
                  
                  
                      Customer wanted Names Only
                  
              

              
                  
                      
                          {renderUploadBoxes('Final Programmed Logo', finalProgrammedLogo, setFinalProgrammedLogo)}
                          {renderUploadBoxes('Final Programmed Back Design', finalProgrammedBackDesign, setFinalProgrammedBackDesign)}
                      
                  
              

              
                  
                      
                          {renderUploadBoxes('Sequence Logo', sequenceLogo, setSequenceLogo)}
                          {renderUploadBoxes('Sequence Back Design', sequenceBackDesign, setSequenceBackDesign)}
                      
                  
              
          
      );
    }
    return null;
  }, [
      uploadField, uploadLeadId, isViewOnly, handleImagePaste, handleImageUpload, handleClearImage, 
      handleRemoveImage, addFile, handleMultipleFileUpload, removeFile, addFileMultiple, setImageInView,
      initialLogoLeftImages, initialLogoRightImages, initialBackLogoImages, initialBackDesignImages, 
      testLogoLeftImages, testLogoRightImages, testBackLogoImages, testBackDesignImages, 
      finalLogoEmb, finalBackDesignEmb, finalLogoDst, finalBackDesignDst, finalNamesDst, isNamesOnly,
      sequenceLogo, sequenceBackDesign, finalProgrammedLogo, finalProgrammedBackDesign, noTestingNeeded,
      finalLogoEmbUploadRefs, finalBackDesignEmbUploadRefs, finalLogoDstUploadRefs, finalBackDesignDstUploadRefs, finalNamesDstUploadRefs
  ]);
  
  const isSaveDisabled = useMemo(() => {
      if (uploadField !== 'isFinalProgram') return false;

      if (isNamesOnly) {
          return finalNamesDst.every(f => !f);
      }
      
      const hasEmb = finalLogoEmb.some(f => f) || finalBackDesignEmb.some(f => f);
      const hasDst = finalLogoDst.some(f => f) || finalBackDesignDst.some(f => f);
      const hasSequence = sequenceLogo.some(img => img) || sequenceBackDesign.some(img => img);
      const hasProgrammedImage = finalProgrammedLogo.some(img => img) || finalProgrammedBackDesign.some(img => img);

      return !(hasEmb && hasDst && hasSequence && hasProgrammedImage);
  }, [isNamesOnly, finalNamesDst, finalLogoEmb, finalBackDesignEmb, finalLogoDst, finalBackDesignDst, sequenceLogo, sequenceBackDesign, finalProgrammedLogo, finalProgrammedBackDesign, uploadField]);


  if (isLoading) {
    return (
      
        {[...Array(5)].map((_, i) => (
          
        ))}
      
    );
  }

  if (error) {
    return Error loading records: {error.message}
  }
  
  return (
    
       
        
          
            
              Are you sure?
            
              Unchecking this box will also uncheck all subsequent steps in the process. This action cannot be undone.
            
          
          
            Cancel
            Continue
          
        
      
       
        
          
            
              Confirm Receipt
            
              Are you sure that the printed J.O. was received and the J.O. number is correct?
            
          
          
            Cancel
            Confirm
          
        
      

      {reviewConfirmLead && (
        
            
              
                
                  
                    Please review the uploaded files before proceeding. This action will send the project to the Item Preparation queue.
                  
                
              
                
                  {fileChecklistItems.map((item, index) => (
                    
                      
                      {item.label}
                      
                      {item.timestamp ? formatDateTime(item.timestamp).dateTime : ''}
                    
                  ))}
                  {fileChecklistItems.length === 0 && (
                    
                        
                        No files have been uploaded for this project.
                    
                  )}
                
              
              
                Cancel
                Done
              
            
        
      )}

       
        
          
              
                  {uploadField === 'isUnderProgramming' && 'Upload Initial Program Images'}
                  {uploadField === 'isLogoTesting' && 'Upload Tested Images'}
                  {uploadField === 'isFinalProgram' && 'Upload Final Program Files'}
              
              
                  {uploadField === 'isUnderProgramming' && 'Upload the initial program images for client approval.'}
                  {uploadField === 'isLogoTesting' && 'Upload images of the tested embroidery.'}
                  {uploadField === 'isFinalProgram' && 'Upload all final DST, EMB, and sequence files.'}
              
          
          
              
                {renderUploadDialogContent()}
              
          
          
              
                  Cancel
              
              Save and Update Status
          
        
      
      
        
          
            
            
              
                Close
              
            
          
        
      

      
        
            
              
                
                  Programming Queue
                
                Job orders with completed program files.' : 'Leads with saved Job Orders ready for digitizing.'}
              
            
             
                
                    
                        Filter by Priority Type:
                        
                          
                            
                          
                          
                            All Priorities
                            Rush
                            Regular
                          
                        
                    
                    
                        Filter Overdue Status:
                        
                          
                            
                          
                          
                            All Statuses
                            Overdue
                            Nearly Overdue
                          
                        
                    
                    
                       
                    
                    
                      
                    
                  
                  
                    
                      View Programming Queue
                    
                     Programming Queue
                
            
        
      
      
           
            
                
                
                  
                      Customer
                      SCES
                      Priority
                      J.O. No.
                      Overdue Status
                      Digitizer
                      
                      
                      
                      
                      
                      Details
                      
                      Received Printed J.O.?
                      {filterType === 'COMPLETED' ? 'Date Completed' : 'Review'}
                  
                
                
                {displayedLeads.map((lead) => {
                  const deadlineInfo = calculateDigitizingDeadline(lead);
                  const isRepeat = lead.orderNumber > 0;
                  const specialOrderTypes = ["MTO", "Stock Design", "Stock (Jacket Only)", "Item Sample"];
                  
                  return (
                  
                    
                      
                         
                            
                                  {openCustomerDetails === lead.id ?  : }
                            
                            
                                {toTitleCase(lead.customerName)}
                                {isRepeat ? (
                                    
                                      
                                        
                                          Repeat Buyer
                                          
                                            {lead.orderNumber + 1}
                                          
                                        
                                        
                                          Total of {lead.totalCustomerQuantity} items ordered.
                                        
                                      
                                    
                                  ) : (
                                     New Customer
                                  )}
                                {openCustomerDetails === lead.id && (
                                     
                                    {lead.companyName && lead.companyName !== '-' && {getContactDisplay(lead) &&  
                                )}
                            
                        
                      
                      {lead.salesRepresentative}
                      
                        
                            
                              {lead.priorityType}
                            
                            
                                {lead.orderType}
                            
                        
                      
                      {formatJoNumber(lead.joNumber)}
                       
                          {deadlineInfo.text}
                        
                        
                            
                                
                                    
                                    Unassigned
                                    {digitizers.map(d => (
                                         {d.nickname}
                                    ))}
                                
                            
                        
                        
                          
                            
                              
                              {lead.underProgrammingTimestamp && 
                            
                        
                        
                           
                            
                              
                              {lead.initialApprovalTimestamp && 
                            
                        
                        
                          
                            
                              
                              {lead.logoTestingTimestamp && 
                            
                        
                        
                          
                            
                              
                              {lead.revisionTimestamp && 
                            
                        
                        
                           
                            
                              
                              {lead.finalApprovalTimestamp && 
                            
                        
                        
                           
                            
                              
                              {lead.finalProgramTimestamp && 
                            
                        
                        
                          
                            
                                View
                                {openLeadId === lead.id ? (
                                
                                ) : (
                                
                                )}
                            
                            
                        
                      
                       
                            
                              
                              {lead.joHardcopyReceivedTimestamp && 
                            
                        
                        
                           {filterType === 'COMPLETED' ? (
                                lead.digitizingArchivedTimestamp && (
                                    
                                        {formatDateTime(lead.digitizingArchivedTimestamp).dateTime}
                                    
                                )
                           ) : (
                             
                                Done
                            
                           )}
                        
                    
                    {openLeadId === lead.id && (
                      
                        
                           
                                
                                {(() => {
                                    const layout = lead.layouts?.[0];
                                    if (!layout) return null;

                                    const imageGroups = [
                                        {
                                            title: 'Reference Images',
                                            images: [
                                                ...((layout as any).refLogoLeftImages || []).map((img: any, i: number) => ({ ...img, label: `Logo Left ${i + 1}`, src: img.url })),
                                                ...((layout as any).refLogoRightImages || []).map((img: any, i: number) => ({ ...img, label: `Logo Right ${i + 1}`, src: img.url })),
                                                ...((layout as any).refBackLogoImages || []).map((img: any, i: number) => ({ ...img, label: `Back Logo ${i + 1}`, src: img.url })),
                                                ...((layout as any).refBackDesignImages || []).map((img: any, i: number) => ({ ...img, label: `Back Design ${i + 1}`, src: img.url })),
                                            ].filter(Boolean) as { src: string; label: string; timestamp?: string | null; uploadedBy?: string | null }[]
                                        },
                                        {
                                            title: 'Layout Designs',
                                            images: lead.layouts?.map((l, i) => l.layoutImage && { src: l.layoutImage, label: `Layout ${i + 1}`, timestamp: l.layoutImageUploadTime, uploadedBy: l.layoutImageUploadedBy }).filter(Boolean) as { src: string; label: string; timestamp?: string | null; uploadedBy?: string | null }[]
                                        },
                                        {
                                            title: 'Initial Program Images',
                                            images: [
                                                ...((layout as any).logoLeftImages || []).map((img: any, i: number) => ({ src: img.url, label: `Logo Left ${i + 1}`, timestamp: img.uploadTime, uploadedBy: img.uploadedBy })),
                                                ...((layout as any).logoRightImages || []).map((img: any, i: number) => ({ src: img.url, label: `Logo Right ${i + 1}`, timestamp: img.uploadTime, uploadedBy: img.uploadedBy })),
                                                ...((layout as any).backLogoImages || []).map((img: any, i: number) => ({ src: img.url, label: `Back Logo ${i + 1}`, timestamp: img.uploadTime, uploadedBy: img.uploadedBy })),
                                                ...((layout as any).backDesignImages || []).map((img: any, i: number) => ({ src: img.url, label: `Back Design ${i + 1}`, timestamp: img.uploadTime, uploadedBy: img.uploadedBy })),
                                            ].filter(Boolean) as { src: string; label: string; timestamp?: string | null; uploadedBy?: string | null }[]
                                        },
                                        {
                                            title: 'Tested Images',
                                            images: [
                                                ...((layout as any).testLogoLeftImages || []).map((img: any, i: number) => ({ src: img.url, label: `Logo Left ${i + 1}`, timestamp: img.uploadTime, uploadedBy: img.uploadedBy })),
                                                ...((layout as any).testLogoRightImages || []).map((img: any, i: number) => ({ src: img.url, label: `Logo Right ${i + 1}`, timestamp: img.uploadTime, uploadedBy: img.uploadedBy })),
                                                ...((layout as any).testBackLogoImages || []).map((img: any, i: number) => ({ src: img.url, label: `Back Logo ${i + 1}`, timestamp: img.uploadTime, uploadedBy: img.uploadedBy })),
                                                ...((layout as any).testBackDesignImages || []).map((img: any, i: number) => ({ src: img.url, label: `Back Design ${i + 1}`, timestamp: img.uploadTime, uploadedBy: img.uploadedBy })),
                                            ].filter(Boolean) as { src: string; label: string; timestamp?: string | null; uploadedBy?: string | null }[]
                                        },
                                        {
                                            title: 'Final Program Files',
                                            images: [
                                                ...(layout.finalProgrammedLogo || []).map((file, i) => file && { src: file.url, label: `Final Logo ${i + 1}`, timestamp: layout.finalProgrammedLogoUploadTimes?.[i], uploadedBy: layout.finalProgrammedLogoUploadedBy?.[i] }),
                                                ...(layout.finalProgrammedBackDesign || []).map((file, i) => file && { src: file.url, label: `Final Back Design ${i + 1}`, timestamp: layout.finalProgrammedBackDesignUploadTimes?.[i], uploadedBy: layout.finalProgrammedBackDesignUploadedBy?.[i] }),
                                                ...(layout.sequenceLogo || []).map((file: any, i) => {
                                                    if (!file) return null;
                                                    const url = typeof file === 'string' ? file : file.url;
                                                    if (!url) return null;
                                                    return { src: url, label: `Sequence Logo ${i + 1}`, timestamp: layout.sequenceLogoUploadTimes?.[i], uploadedBy: layout.sequenceLogoUploadedBy?.[i] };
                                                }),
                                                ...(layout.sequenceBackDesign || []).map((file: any, i) => {
                                                    if (!file) return null;
                                                    const url = typeof file === 'string' ? file : file.url;
                                                    if (!url) return null;
                                                    return { src: url, label: `Sequence Back Design ${i + 1}`, timestamp: layout.sequenceBackDesignUploadTimes?.[i], uploadedBy: layout.sequenceBackDesignUploadedBy?.[i] };
                                                }),
                                            ].filter(Boolean) as { src: string; label: string; timestamp?: string | null; uploadedBy?: string | null }[]
                                        }
                                    ];

                                   return imageGroups.map(group => );
                               })()}
                            
                           
                        
                      
                    )}
                  
                })}
                
            
          
      
    
  );
});
DigitizingTableMemo.displayName = 'DigitizingTable';

export { DigitizingTableMemo as DigitizingTable };

const ImageDisplayCard = ({ title, images, onImageClick }: { title: string; images: { src: string; label: string; timestamp?: string | null; uploadedBy?: string | null }[], onImageClick: (src: string) => void }) => {
    if (images.length === 0) return null;

    return (
        
            
                {title}
            
            
                {images.map((img, index) => (
                    
                        
                             {img.label}
                        
                         (img.src)} alt={img.label} layout="fill" objectFit="contain" />
                        
                        {img.timestamp && {img.uploadedBy && {formatDateTime(img.timestamp).dateTimeShort}
    );
};

export default ImageDisplayCard;
