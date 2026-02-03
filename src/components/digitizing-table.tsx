

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
  finalProgrammedBackDesignUploadedBy?: (string | null)[];
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
  const { userProfile } = useUser();
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
    if (!firestore || isReadOnly) return;
    
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

  const confirmUncheck = useCallback(() => {
    if (uncheckConfirmation) {
      const { leadId, field } = uncheckConfirmation;
      
      const updatedData: { [key: string]: any } = { [field]: false, [`${field.replace('is', '').charAt(0).toLowerCase() + field.slice(3)}Timestamp`]: null };

      if (field !== 'isJoHardcopyReceived') {
        const sequence: CheckboxField[] = ['isUnderProgramming', 'isInitialApproval', 'isLogoTesting', 'isRevision', 'isFinalApproval', 'isFinalProgram'];
        const currentIndex = sequence.indexOf(field);
        if (currentIndex > -1) {
            for (let i = currentIndex + 1; i < sequence.length; i++) {
                const nextField = sequence[i];
                if (nextField) {
                  updatedData[nextField] = false;
                  const nextTimestampField = `${nextField.replace('is', '').charAt(0).toLowerCase() + nextField.slice(3)}Timestamp`;
                  updatedData[nextTimestampField] = null;
                }
            }
        }
      }
      
      setOptimisticChanges(prev => ({ ...prev, [leadId]: { ...prev[leadId], ...updatedData } }));
      setUncheckConfirmation(null);
      
      updateStatus(leadId, field, false).catch(() => {
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Changes could not be saved.' });
        setOptimisticChanges(prev => {
            const { [field]: _removed, ...rest } = prev[leadId] || {};
            // Simplified revert, real-time listener will fix it.
            return { ...prev, [leadId]: rest };
        });
      });
    }
  }, [uncheckConfirmation, updateStatus, toast]);

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
      ...(layout.sequenceBackDesign || []).map((file, i) => file && { src: file.url, label: `Sequence Back Design ${i+1}`, timestamp: Array.isArray(layout.sequenceBackDesignUploadTimes) ? layout.sequenceBackDesignUploadTimes[i] : null }),
      ...(layout.finalProgrammedLogo || []).map((file, i) => file && { src: file.url, label: `Final Programmed Logo ${i + 1}`, timestamp: (layout as any).finalProgrammedLogoUploadTimes?.[i], uploadedBy: (layout as any).finalProgrammedLogoUploadedBy?.[i] }),
      ...(layout.finalProgrammedBackDesign || []).map((file, i) => file && { src: file.url, label: `Final Programmed Back Design ${i + 1}`, timestamp: (layout as any).finalProgrammedBackDesignUploadTimes?.[i], uploadedBy: (layout as any).finalProgrammedBackDesignUploadedBy?.[i] }),
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
        
        const getInitialImages = (pluralField: { url: string }[] | undefined, singularField: string | null | undefined): (string|null)[] => {
            const images: (string | null)[] = [];
            if (pluralField && pluralField.length > 0) {
              images.push(...pluralField.map(i => i.url));
            } else if (singularField) {
              images.push(singularField);
            }
            return images.length > 0 ? images : [null];
        };
        
        const getInitialSequenceImages = (files?: (FileObject | null)[]): (string|null)[] => {
            if (!files || files.length === 0) return [];
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
                            "relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-48 flex-1 flex items-center justify-center focus:outline-none focus:border-primary focus:border-solid select-none",
                            !isDisabled && "cursor-pointer"
                        )}
                        onClick={() => image && setImageInView(image)}
                        onDoubleClick={() => !isDisabled && !image && document.getElementById(`file-input-digitizing-${label}-${index}`)?.click()}
                        onPaste={(e) => handleImagePaste(e, setter, index)}
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
                          </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>{!isDisabled ? "Double-click to upload or paste image" : "No image uploaded"}</p> </div>)}
                          <input id={`file-input-digitizing-${label}-${index}`} type="file" accept="image/*" className="hidden" onChange={(e) => {if(e.target.files?.[0]) handleImageUpload(e.target.files[0], setter, index)}} disabled={isDisabled}/>
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
        <div className="grid grid-cols-2 gap-6">
            {renderUploadBoxes('Logo Left', initialLogoLeftImages, setInitialLogoLeftImages)}
            {renderUploadBoxes('Logo Right', initialLogoRightImages, setInitialLogoRightImages)}
            {renderUploadBoxes('Back Logo', initialBackLogoImages, setInitialBackLogoImages)}
            {renderUploadBoxes('Back Design', initialBackDesignImages, setInitialBackDesignImages)}
        </div>
      );
    } else if (uploadField === 'isLogoTesting') {
       return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
                {renderUploadBoxes('Logo Left', testLogoLeftImages, setTestLogoLeftImages)}
                {renderUploadBoxes('Logo Right', testLogoRightImages, setTestLogoRightImages)}
                {renderUploadBoxes('Back Logo', testBackLogoImages, setTestBackLogoImages)}
                {renderUploadBoxes('Back Design', testBackDesignImages, setTestBackDesignImages)}
            </div>
            <div className="flex items-center space-x-2 pt-4 border-t">
                <Checkbox
                    id="no-testing-needed"
                    checked={noTestingNeeded}
                    onCheckedChange={(checked) => setNoTestingNeeded(!!checked)}
                    disabled={isDisabled}
                />
                <Label htmlFor="no-testing-needed" className="font-medium">
                    No need for testing
                </Label>
            </div>
        </div>
      );
    } else if (uploadField === 'isFinalProgram') {
      return (
          <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                  {renderMultipleFileUpload('Logo (EMB)', finalLogoEmb, setFinalLogoEmb, finalLogoEmbUploadRefs)}
                  {renderMultipleFileUpload('Back Design (EMB)', finalBackDesignEmb, setFinalBackDesignEmb, finalBackDesignEmbUploadRefs)}
                  {renderMultipleFileUpload('Logo (DST)', finalLogoDst, setFinalLogoDst, finalLogoDstUploadRefs)}
                  {renderMultipleFileUpload('Back Design (DST)', finalBackDesignDst, setFinalBackDesignDst, finalBackDesignDstUploadRefs)}
              </div>

              <Separator />
              <div className="col-span-2">
                  <h4 className="font-semibold text-primary">Names (DST)</h4>
                  <div className="mt-2">
                      {renderMultipleFileUpload('', finalNamesDst, setFinalNamesDst, finalNamesDstUploadRefs)}
                  </div>
              </div>
              <div className="col-span-2 flex items-center space-x-2 pt-2">
                  <Checkbox
                      id="names-only-checkbox"
                      checked={isNamesOnly}
                      onCheckedChange={(checked) => setIsNamesOnly(!!checked)}
                      disabled={isDisabled}
                  />
                  <Label htmlFor="names-only-checkbox" className="font-medium">
                      Customer wanted Names Only
                  </Label>
              </div>
              <Separator />
              <div className="space-y-2">
                  <h4 className="font-semibold text-primary">Final Programmed Images</h4>
                  <div className="grid grid-cols-2 gap-6">
                      {renderUploadBoxes('Final Programmed Logo', finalProgrammedLogo, setFinalProgrammedLogo)}
                      {renderUploadBoxes('Final Programmed Back Design', finalProgrammedBackDesign, setFinalProgrammedBackDesign)}
                  </div>
              </div>
              <Separator />
              <div className="space-y-2">
                  <h4 className="font-semibold text-primary">Sequence Files</h4>
                  <div className="grid grid-cols-2 gap-6">
                      {renderUploadBoxes('Sequence Logo', sequenceLogo, setSequenceLogo)}
                      {renderUploadBoxes('Sequence Back Design', sequenceBackDesign, setSequenceBackDesign)}
                  </div>
              </div>
          </div>
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
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col border-none">
       <AlertDialog open={!!uncheckConfirmation} onOpenChange={(open) => !open && setUncheckConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Unchecking this box will also uncheck all subsequent steps in the process. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUncheck} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-white">Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <AlertDialog open={!!joReceivedConfirmation} onOpenChange={setJoReceivedConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure that the printed J.O. was received and the J.O. number is correct?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmJoReceived}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {reviewConfirmLead && (
        <AlertDialog open={!!reviewConfirmLead} onOpenChange={(open) => !open && setReviewConfirmLead(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Review Uploaded Files</AlertDialogTitle>
                  <AlertDialogDescription>
                    Please review the uploaded files before proceeding. This action will send the project to the Item Preparation queue.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="max-h-60 overflow-y-auto my-4 pr-2">
                <ul className="space-y-2">
                  {fileChecklistItems.map((item, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                      <span className="font-medium flex-1">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.timestamp ? formatDateTime(item.timestamp).dateTime : ''}</span>
                    </li>
                  ))}
                  {fileChecklistItems.length === 0 && (
                    <li className="flex items-center text-sm text-muted-foreground">
                        <Circle className="h-4 w-4 mr-2" />
                        No files have been uploaded for this project.
                    </li>
                  )}
                </ul>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setReviewConfirmLead(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmReview}>Done</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

       <Dialog open={isUploadDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
            setUploadLeadId(null);
            setUploadField(null);
        }
        setIsUploadDialogOpen(isOpen);
       }}>
        <DialogContent className="sm:max-w-4xl flex flex-col h-[90vh]">
          <DialogHeader>
              <DialogTitle>
                  {uploadField === 'isUnderProgramming' && 'Upload Initial Program Images'}
                  {uploadField === 'isLogoTesting' && 'Upload Tested Images'}
                  {uploadField === 'isFinalProgram' && 'Upload Final Program Files'}
              </DialogTitle>
              <DialogDescription>
                  {uploadField === 'isUnderProgramming' && 'Upload the initial program images for client approval.'}
                  {uploadField === 'isLogoTesting' && 'Upload images of the tested embroidery.'}
                  {uploadField === 'isFinalProgram' && 'Upload all final DST, EMB, and sequence files.'}
              </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6 modern-scrollbar">
              <div className="py-4">
                {renderUploadDialogContent()}
              </div>
          </ScrollArea>
          <DialogFooter>
              <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleUploadDialogSave} disabled={isSaveDisabled}>Save and Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {imageInView && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center animate-in fade-in"
          onClick={() => setImageInView(null)}
        >
          <div className="relative h-[90vh] w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image src={imageInView} alt="Enlarged Case Image" layout="fill" objectFit="contain" />
             <Button
                variant="ghost"
                size="icon"
                onClick={() => setImageInView(null)}
                className="absolute top-4 right-4 text-white hover:bg-white/10 hover:text-white"
            >
                <X className="h-6 w-6" />
                <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-black">{filterType === 'COMPLETED' ? 'Completed Programs' : 'Programming Queue'}</CardTitle>
              <CardDescription className="text-gray-600">
                {filterType === 'COMPLETED' ? 'Job orders with completed program files.' : 'Leads with saved Job Orders ready for digitizing.'}
              </CardDescription>
            </div>
             <div className="flex flex-col items-end gap-2">
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
                  <div className="w-full max-w-sm">
                    <Input
                      placeholder="Search customer, company, or contact..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-gray-100 text-black placeholder:text-gray-500"
                    />
                  </div>
                </div>
                <div className="w-full text-right">
                  {filterType === 'COMPLETED' ? (
                    <Link href="/digitizing/programming-queue" className="text-sm text-primary hover:underline">
                      View Programming Queue
                    </Link>
                  ) : (
                    <Link href="/digitizing/completed-programs" className="text-sm text-primary hover:underline">
                      View Completed Programs
                    </Link>
                  )}
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
           <div className="border rounded-md h-full">
            <Table>
                <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                <TableRow>
                    <TableHead className="text-white font-bold align-middle text-center">Customer</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">SCES</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">Priority</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center whitespace-nowrap">J.O. No.</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">Overdue Status</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">Digitizer</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[100px]"><span className="block w-[80px] break-words">Initial Program</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[100px]"><span className="block w-[80px] break-words">Initial Approval</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[100px]"><span className="block w-[80px] break-words">Tested</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[100px]"><span className="block w-[80px] break-words">Under Revision</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[100px]"><span className="block w-[80px] break-words">Final Approval</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[100px]"><span className="block w-[80px] break-words">Final Program</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">Details</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[100px]"><span className="block w-[80px] break-words">Received Printed J.O.?</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">{filterType === 'COMPLETED' ? 'Date Completed' : 'Review'}</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {displayedLeads.map((lead) => {
                  const deadlineInfo = calculateDigitizingDeadline(lead);
                  const isRepeat = lead.orderNumber > 0;
                  const specialOrderTypes = ["MTO", "Stock Design", "Stock (Jacket Only)", "Item Sample"];
                  
                  return (
                  <React.Fragment key={lead.id}>
                    <TableRow>
                      <TableCell className="font-medium text-xs align-middle py-3 text-black text-center">
                         <div className="flex items-center justify-center">
                            <Button variant="ghost" size="sm" onClick={() => toggleCustomerDetails(lead.id)} className="h-5 px-1 mr-1">
                                {openCustomerDetails === lead.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            <div className='flex flex-col items-center'>
                                <span className="font-medium">{toTitleCase(lead.customerName)}</span>
                                {isRepeat ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center gap-1.5 cursor-pointer">
                                            <span className="text-xs text-yellow-600 font-semibold">Repeat Buyer</span>
                                            <span className="flex items-center justify-center h-5 w-5 rounded-full border-2 border-yellow-600 text-yellow-700 text-[10px] font-bold">
                                              {lead.orderNumber + 1}
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
                                {openCustomerDetails === lead.id && (
                                    <div className="mt-1 space-y-0.5 text-gray-500 text-[11px] font-normal">
                                    {lead.companyName && lead.companyName !== '-' && <div>{toTitleCase(lead.companyName)}</div>}
                                    {getContactDisplay(lead) && <div>{getContactDisplay(lead)}</div>}
                                    </div>
                                )}
                            </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs align-middle py-3 text-black text-center">{lead.salesRepresentative}</TableCell>
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
                      <TableCell className="font-medium text-xs align-middle py-3 text-black whitespace-nowrap text-center">{formatJoNumber(lead.joNumber)}</TableCell>
                       <TableCell className={cn(
                          "text-center text-xs align-middle py-3 font-medium",
                          deadlineInfo.isOverdue && "text-red-600",
                          deadlineInfo.isUrgent && "text-amber-600",
                          !deadlineInfo.isOverdue && !deadlineInfo.isUrgent && "text-green-600"
                        )}>
                          {deadlineInfo.text}
                        </TableCell>
                        <TableCell className="text-center align-middle p-2">
                            <Select
                                value={lead.assignedDigitizer || 'unassigned'}
                                onValueChange={(value) => handleDigitizerChange(lead.id, value)}
                                disabled={isViewOnly}
                            >
                                <SelectTrigger className={cn("w-[140px] text-xs h-8 justify-center font-bold", getDigitizerColor(lead.assignedDigitizer))}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {digitizers.map(d => (
                                        <SelectItem key={d.uid} value={d.nickname} className={cn("font-bold", getDigitizerColor(d.nickname))}>{d.nickname}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </TableCell>
                        <TableCell className="text-center align-middle p-2">
                          <div className="flex flex-col items-center justify-start h-full gap-1">
                            <Checkbox
                              checked={lead.isUnderProgramming || false}
                              onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isUnderProgramming', !!checked)}
                              disabled={isViewOnly || !lead.joNumber}
                              className={isViewOnly ? "disabled:opacity-100" : ""}
                            />
                            {lead.underProgrammingTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.underProgrammingTimestamp).dateTimeShort}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle p-2">
                           <div className="flex flex-col items-center justify-start h-full gap-1">
                            <Checkbox
                              checked={lead.isInitialApproval || false}
                              onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isInitialApproval', !!checked)}
                              disabled={!lead.isUnderProgramming || isViewOnly}
                              className={isViewOnly ? "disabled:opacity-100" : ""}
                            />
                            {lead.initialApprovalTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.initialApprovalTimestamp).dateTimeShort}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle p-2">
                          <div className="flex flex-col items-center justify-start h-full gap-1">
                            <Checkbox
                              checked={lead.isLogoTesting || false}
                              onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isLogoTesting', !!checked)}
                              disabled={!lead.isInitialApproval || isViewOnly}
                              className={isViewOnly ? "disabled:opacity-100" : ""}
                            />
                            {lead.logoTestingTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.logoTestingTimestamp).dateTimeShort}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle p-2">
                          <div className="flex flex-col items-center justify-start h-full gap-1">
                            <Checkbox
                              checked={lead.isRevision || false}
                              onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isRevision', !!checked)}
                              disabled={!lead.isLogoTesting || lead.isFinalApproval || isViewOnly}
                              className={cn((lead.isFinalApproval || isViewOnly) && "disabled:opacity-100")}
                            />
                            {lead.revisionTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.revisionTimestamp).dateTimeShort}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle p-2">
                           <div className="flex flex-col items-center justify-start h-full gap-1">
                            <Checkbox
                              checked={lead.isFinalApproval || false}
                              onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isFinalApproval', !!checked)}
                              disabled={!lead.isLogoTesting || isViewOnly}
                              className={isViewOnly ? "disabled:opacity-100" : ""}
                            />
                            {lead.finalApprovalTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.finalApprovalTimestamp).dateTimeShort}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle p-2">
                           <div className="flex flex-col items-center justify-start h-full gap-1">
                            <Checkbox
                              checked={lead.isFinalProgram || false}
                              onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isFinalProgram', !!checked)}
                              disabled={!lead.isFinalApproval || isViewOnly}
                              className={isViewOnly ? "disabled:opacity-100" : ""}
                            />
                            {lead.finalProgramTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.finalProgramTimestamp).dateTimeShort}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                          <div className="flex items-center justify-center">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => toggleLeadDetails(lead.id)}
                                className="h-7 px-2 text-black hover:bg-gray-200"
                            >
                                View
                                {openLeadId === lead.id ? (
                                <ChevronUp className="h-4 w-4 ml-1" />
                                ) : (
                                <ChevronDown className="h-4 w-4 ml-1" />
                                )}
                            </Button>
                            <Button onClick={() => window.open(`/job-order/${lead.id}/print?view=true`, '_blank', 'width=1200,height=800,scrollbars=yes')} variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-gray-200">
                                <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Checkbox
                              checked={lead.isJoHardcopyReceived || false}
                              onCheckedChange={(checked) => handleJoReceivedChange(lead.id, !!checked)}
                              disabled={!lead.isJoPrinted || isViewOnly}
                              className={isViewOnly ? "disabled:opacity-100" : ""}
                            />
                            {lead.joHardcopyReceivedTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.joHardcopyReceivedTimestamp).dateTimeShort}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                           {filterType === 'COMPLETED' ? (
                                lead.digitizingArchivedTimestamp && (
                                    <div className="text-xs text-gray-500">
                                        <p>{formatDateTime(lead.digitizingArchivedTimestamp).dateTime}</p>
                                    </div>
                                )
                           ) : (
                             <Button
                                size="sm"
                                className={cn(
                                    'h-7 px-3 text-white font-bold',
                                    lead.isFinalProgram ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400'
                                )}
                                disabled={!lead.isFinalProgram || !lead.isJoHardcopyReceived || isReadOnly}
                                onClick={() => setReviewConfirmLead(lead)}
                            >
                                Done
                            </Button>
                           )}
                        </TableCell>
                    </TableRow>
                    {openLeadId === lead.id && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={15} className="p-0">
                           <div className="flex justify-between items-start gap-4 p-4">
                               <div className="flex flex-wrap gap-4 items-start">
                                {(() => {
                                    const layout = lead.layouts?.[0];
                                    if (!layout) return null;

                                    const imageGroups = [
                                        {
                                            title: 'Reference Images',
                                            images: [
                                                ...((layout as any).refLogoLeftImages || []).map((img, i) => ({ ...img, label: `Logo Left ${i + 1}`, src: img.url })),
                                                ...((layout as any).refLogoRightImages || []).map((img, i) => ({ ...img, label: `Logo Right ${i + 1}`, src: img.url })),
                                                ...((layout as any).refBackLogoImages || []).map((img, i) => ({ ...img, label: `Back Logo ${i + 1}`, src: img.url })),
                                                ...((layout as any).refBackDesignImages || []).map((img, i) => ({ ...img, label: `Back Design ${i + 1}`, src: img.url })),
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
                                                ...(layout.finalProgrammedLogo || []).map((file, i) => file && { src: file.url, label: `Final Logo ${i + 1}`, timestamp: (layout as any).finalProgrammedLogoUploadTimes?.[i], uploadedBy: (layout as any).finalProgrammedLogoUploadedBy?.[i] }),
                                                ...(layout.finalProgrammedBackDesign || []).map((file, i) => file && { src: file.url, label: `Final Back Design ${i + 1}`, timestamp: (layout as any).finalProgrammedBackDesignUploadTimes?.[i], uploadedBy: (layout as any).finalProgrammedBackDesignUploadedBy?.[i] }),
                                                ...(layout.sequenceLogo || []).map((file, i) => file && { src: file.url, label: `Sequence Logo ${i + 1}`, timestamp: layout.sequenceLogoUploadTimes?.[i], uploadedBy: layout.sequenceLogoUploadedBy?.[i] }),
                                                ...(layout.sequenceBackDesign || []).map((file, i) => file && { src: file.url, label: `Sequence Back Design ${i + 1}`, timestamp: layout.sequenceBackDesignUploadTimes?.[i], uploadedBy: layout.sequenceBackDesignUploadedBy?.[i] }),
                                            ].filter(Boolean) as { src: string; label: string; timestamp?: string | null; uploadedBy?: string | null }[]
                                        }
                                    ];

                                   return imageGroups.map(group => <ImageDisplayCard key={group.title} title={group.title} images={group.images} onImageClick={setImageInView} />);
                               })()}
                            </div>
                           </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )})}
                </TableBody>
            </Table>
          </div>
      </CardContent>
    </Card>
  );
});
DigitizingTableMemo.displayName = 'DigitizingTable';

export { DigitizingTableMemo as DigitizingTable };

const ImageDisplayCard = ({ title, images, onImageClick }: { title: string; images: { src: string; label: string; timestamp?: string | null; uploadedBy?: string | null }[], onImageClick: (src: string) => void }) => {
    if (images.length === 0) return null;

    return (
        <Card className="bg-white">
            <CardHeader className="p-2"><CardTitle className="text-sm text-center">{title}</CardTitle></CardHeader>
            <CardContent className="flex gap-4 text-xs p-2 flex-wrap">
                {images.map((img, index) => (
                    <div key={index} className="flex flex-col items-center text-center w-28">
                        <p className="font-semibold text-gray-500 mb-1 text-xs truncate w-full" title={img.label}>{img.label}</p>
                        <div className="relative w-24 h-24 border rounded-md cursor-pointer" onClick={() => onImageClick(img.src)}>
                            <Image src={img.src} alt={img.label} layout="fill" objectFit="contain" />
                        </div>
                        {img.timestamp && <p className='text-gray-500 text-[10px] mt-1'>{formatDateTime(img.timestamp).dateTimeShort}</p>}
                        {img.uploadedBy && <p className='text-gray-500 text-[10px] font-bold'>by {img.uploadedBy}</p>}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};
