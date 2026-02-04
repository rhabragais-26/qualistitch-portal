

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
import { addDays, differenceInDays, format } from 'date-fns';
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
  const { userProfile, isAdmin } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [overdueFilter, setOverdueFilter] = useState('All');
  const [uncheckConfirmation, setUncheckConfirmation] = useState<{ leadId: string; field: CheckboxField | 'isJoHardcopyReceived'; } | null>(null);
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
  
  const [viewingJoLead, setViewingJoLead] = useState<Lead | null>(null);
  
  const isViewOnly = isReadOnly || filterType === 'COMPLETED';

  const handleImageUpload = useCallback((file: File, setter: React.Dispatch<React.SetStateAction<(string | null)[]>>, index: number) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setter(prev => {
        const newImages = [...prev];
        if (e.target?.result) {
          newImages[index] = e.target.result as string;
        }
        return newImages;
      });
    };
    reader.readAsDataURL(file);
  }, []);
  
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

  const confirmUncheck = useCallback(() => {
    if (!uncheckConfirmation || !firestore || !leads) return;
    const { leadId, field } = uncheckConfirmation;

    const leadToUpdate = leads.find(l => l.id === leadId);
    if (!leadToUpdate) {
        toast({ variant: 'destructive', title: 'Error', description: 'Lead not found for update.' });
        setUncheckConfirmation(null);
        return;
    }

    const optimisticUpdate: Partial<Lead> = {};
    const originalState: Partial<Lead> = {};

    const processField = (fieldName: CheckboxField | 'isJoHardcopyReceived') => {
        const timestampFieldName = `${fieldName.replace('is', '').charAt(0).toLowerCase() + fieldName.slice(3)}Timestamp` as keyof Lead;
        
        optimisticUpdate[fieldName] = false;
        optimisticUpdate[timestampFieldName] = null;
        
        originalState[fieldName] = leadToUpdate[fieldName];
        originalState[timestampFieldName] = leadToUpdate[timestampFieldName];
    };

    processField(field);

    if (field !== 'isJoHardcopyReceived') {
        const sequence: CheckboxField[] = ['isUnderProgramming', 'isInitialApproval', 'isLogoTesting', 'isRevision', 'isFinalApproval', 'isFinalProgram'];
        const currentIndex = sequence.indexOf(field as CheckboxField);

        if (currentIndex > -1) {
            for (let i = currentIndex + 1; i < sequence.length; i++) {
                const nextField = sequence[i];
                if (nextField) {
                    processField(nextField);
                }
            }
        }
    }

    setOptimisticChanges(prev => ({
        ...prev,
        [leadId]: {
            ...(prev[leadId] || {}),
            ...optimisticUpdate,
        }
    }));

    setUncheckConfirmation(null);

    const saveAndUpdate = async () => {
        try {
            const leadDocRef = doc(firestore, 'leads', leadId);
            await updateDoc(leadDocRef, optimisticUpdate);
            toast({
                title: 'Status Updated',
                description: 'The status has been successfully reverted.',
            });
            refetch(); // Sync with DB state
        } catch (e: any) {
            console.error(`Error unchecking ${field}:`, e);
            toast({ variant: "destructive", title: "Update Failed", description: e.message || "Could not update the status." });
            
            // Rollback UI on failure
            setOptimisticChanges(prev => ({
                ...prev,
                [leadId]: {
                    ...(prev[leadId] || {}),
                    ...originalState,
                }
            }));
        }
    };

    saveAndUpdate();
    
}, [uncheckConfirmation, firestore, toast, leads, refetch]);

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
                images.push(...pluralField.map(i => i?.url || null));
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
                        onDoubleClick={() => !isDisabled && !image && (document.getElementById(`file-input-job-order-${label.replace(/\s+/g, '-')}-${index}`)?.click())}
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
                          <input id={`file-input-job-order-${label.replace(/\s+/g, '-')}-${index}`} type="file" accept="image/*" className="hidden" onChange={(e) => {if(e.target.files?.[0]) handleImageUpload(e.target.files[0], setter, index)}} disabled={!isDisabled}/>
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
        <div className="grid grid-cols-2 gap-4">
            {renderUploadBoxes('Logo Left', initialLogoLeftImages, setInitialLogoLeftImages)}
            {renderUploadBoxes('Logo Right', initialLogoRightImages, setInitialLogoRightImages)}
            {renderUploadBoxes('Back Logo', initialBackLogoImages, setInitialBackLogoImages)}
            {renderUploadBoxes('Back Design', initialBackDesignImages, setInitialBackDesignImages)}
        </div>
      );
    } else if (uploadField === 'isLogoTesting') {
       return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                {renderUploadBoxes('Logo Left', testLogoLeftImages, setTestLogoLeftImages)}
                {renderUploadBoxes('Logo Right', testLogoRightImages, setTestLogoRightImages)}
                {renderUploadBoxes('Back Logo', testBackLogoImages, setTestBackLogoImages)}
                {renderUploadBoxes('Back Design', testBackDesignImages, setTestBackDesignImages)}
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="no-testing" checked={noTestingNeeded} onCheckedChange={(checked) => setNoTestingNeeded(!!checked)} disabled={isViewOnly} />
                <Label htmlFor="no-testing">No need for testing</Label>
            </div>
        </div>
      );
    } else if (uploadField === 'isFinalProgram') {
      return (
          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  {renderMultipleFileUpload('Logo (EMB)', finalLogoEmb, setFinalLogoEmb, finalLogoEmbUploadRefs)}
                  {renderMultipleFileUpload('Back Design (EMB)', finalBackDesignEmb, setFinalBackDesignEmb, finalBackDesignEmbUploadRefs)}
                  {renderMultipleFileUpload('Logo (DST)', finalLogoDst, setFinalLogoDst, finalLogoDstUploadRefs)}
                  {renderMultipleFileUpload('Back Design (DST)', finalBackDesignDst, setFinalBackDesignDst, finalBackDesignDstUploadRefs)}
              </div>
              <div className="flex items-center space-x-2">
                  <Checkbox id="names-only" checked={isNamesOnly} onCheckedChange={(checked) => setIsNamesOnly(!!checked)} disabled={isViewOnly} />
                  <Label htmlFor="names-only">Customer wanted Names Only</Label>
              </div>
              {isNamesOnly && (
                  <div className="pl-6 border-l-2 ml-2">
                      <h4 className="font-medium mb-2">Names (DST)</h4>
                      {renderMultipleFileUpload('', finalNamesDst, setFinalNamesDst, finalNamesDstUploadRefs)}
                  </div>
              )}
              {!isNamesOnly && (
                  <>
                    <Separator />
                    <h4 className="font-medium">Final Programmed Files</h4>
                    <div className="grid grid-cols-2 gap-4">
                        {renderUploadBoxes('Final Programmed Logo', finalProgrammedLogo, setFinalProgrammedLogo)}
                        {renderUploadBoxes('Final Programmed Back Design', finalProgrammedBackDesign, setFinalProgrammedBackDesign)}
                    </div>
                    <Separator />
                    <h4 className="font-medium">Sequence Files</h4>
                    <div className="grid grid-cols-2 gap-4">
                        {renderUploadBoxes('Sequence Logo', sequenceLogo, setSequenceLogo)}
                        {renderUploadBoxes('Sequence Back Design', sequenceBackDesign, setSequenceBackDesign)}
                    </div>
                  </>
              )}
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
      <div className="p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full mb-2" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive p-4">Error loading records: {error.message}</p>;
  }
  
  return (
    <>
      <AlertDialog open={!!uncheckConfirmation} onOpenChange={(open) => !open && setUncheckConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Unchecking this box will mark the task as not done. This will also uncheck all subsequent steps. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUncheck}>Confirm</AlertDialogAction>
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
        <Dialog open={!!reviewConfirmLead} onOpenChange={() => setReviewConfirmLead(null)}>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Review Before Endorsement</DialogTitle>
                <DialogDescription>
                  Please review the uploaded files before proceeding. This action will send the project to the Item Preparation queue.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-80 overflow-y-auto space-y-2 p-1">
                  There are no files uploaded for this project
                </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleConfirmReview}>Done</Button>
              </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent className="max-w-4xl">
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
              <div className="py-4 max-h-[70vh] overflow-y-auto">
                {renderUploadDialogContent()}
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                      <Button type="button" variant="outline"> Cancel </Button>
                  </DialogClose>
                  <Button onClick={handleUploadDialogSave} disabled={isSaveDisabled || isViewOnly}>Save and Update Status</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      {imageInView && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center animate-in fade-in"
          onClick={() => setImageInView(null)}
        >
          <div className="relative h-[90vh] w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image src={imageInView} alt="Enlarged view" layout="fill" objectFit="contain" />
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

      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle>{filterType === 'COMPLETED' ? 'Completed Programs' : 'Programming Queue'}</CardTitle>
              <CardDescription>
                {filterType === 'COMPLETED' ? 'Job orders with completed program files.' : 'Leads with saved Job Orders ready for digitizing.'}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-4">
                    <div className='flex items-center gap-2'>
                        <span className="text-sm font-medium">Filter by Priority Type:</span>
                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Priorities</SelectItem>
                                <SelectItem value="Rush">Rush</SelectItem>
                                <SelectItem value="Regular">Regular</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className='flex items-center gap-2'>
                        <span className="text-sm font-medium">Filter Overdue Status:</span>
                        <Select value={overdueFilter} onValueChange={setOverdueFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Statuses</SelectItem>
                                <SelectItem value="Overdue">Overdue</SelectItem>
                                <SelectItem value="Nearly Overdue">Nearly Overdue</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Input
                        placeholder="Search J.O. No..."
                        value={joNumberSearch}
                        onChange={(e) => setJoNumberSearch(e.target.value)}
                        className="bg-gray-100 text-black placeholder:text-gray-500"
                    />
                    <Input
                        placeholder="Search Customer or Company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-100 text-black placeholder:text-gray-500"
                    />
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
      <CardContent>
           <div className="border rounded-md">
            <Table>
                <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                  <TableRow>
                      <TableHead className="text-white font-bold text-xs">Customer</TableHead>
                      <TableHead className="text-white font-bold text-xs text-center">SCES</TableHead>
                      <TableHead className="text-white font-bold text-xs text-center">Priority</TableHead>
                      <TableHead className="text-white font-bold text-xs text-center">J.O. No.</TableHead>
                      <TableHead className="text-white font-bold text-xs text-center">Overdue Status</TableHead>
                      <TableHead className="text-white font-bold text-xs text-center">Digitizer</TableHead>
                      <TableHead className="text-white font-bold text-xs text-center w-24">Initial Program</TableHead>
                      <TableHead className="text-white font-bold text-xs text-center w-24">Initial Approval</TableHead>
                      <TableHead className="text-white font-bold text-xs text-center w-24">Tested</TableHead>
                      <TableHead className="text-white font-bold text-xs text-center w-24">Under Revision</TableHead>
                      <TableHead className="text-white font-bold text-xs text-center w-24">Final Approval</TableHead>
                      <TableHead className="text-white font-bold text-xs text-center w-24">Final Program</TableHead>
                      <TableHead className="text-white font-bold text-xs text-center">Details</TableHead>
                      <TableHead className="text-white font-bold text-xs text-center w-24">Received Printed J.O.?</TableHead>
                      <TableHead className="text-white font-bold text-xs text-center">{filterType === 'COMPLETED' ? 'Date Completed' : 'Review'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {displayedLeads.map((lead) => {
                  const deadlineInfo = calculateDigitizingDeadline(lead);
                  const isRepeat = !lead.forceNewCustomer && lead.orderType !== 'Item Sample' && lead.orderNumber > 0;
                  const specialOrderTypes = ["MTO", "Stock Design", "Stock (Jacket Only)", "Item Sample"];
                  
                  return (
                  <React.Fragment key={lead.id}>
                    <TableRow>
                      <TableCell className="text-xs align-middle">
                          <div className="flex items-center justify-start">
                            <Button variant="ghost" size="sm" onClick={() => {}} className="h-5 px-1 mr-1">
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                            <div className='flex flex-col'>
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
                                <div className="text-xs text-blue-600 font-semibold">New Customer</div>
                                )}
                              </div>
                         </div>
                      </TableCell>
                      <TableCell className="text-xs text-center">{lead.salesRepresentative}</TableCell>
                      <TableCell className="text-center">
                          <Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>{lead.priorityType}</Badge>
                          {specialOrderTypes.includes(lead.orderType) && <p className="text-xs font-bold mt-1">{lead.orderType}</p>}
                      </TableCell>
                      <TableCell className="text-xs text-center">{formatJoNumber(lead.joNumber)}</TableCell>
                      <TableCell className={cn(
                          "text-center text-xs",
                          deadlineInfo.isOverdue ? "text-red-500 font-bold" : (deadlineInfo.isUrgent ? "text-amber-600 font-bold" : "text-gray-500")
                        )}>{deadlineInfo.text}</TableCell>
                        <TableCell className="text-center">
                            <Select 
                                value={lead.assignedDigitizer || 'unassigned'}
                                onValueChange={(value) => handleDigitizerChange(lead.id, value)}
                                disabled={(isViewOnly && !isAdmin && filterType !== 'COMPLETED') || (filterType === 'COMPLETED' && !isAdmin)}
                            >
                                <SelectTrigger className={cn("text-xs h-7", getDigitizerColor(lead.assignedDigitizer))}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {digitizers.map(d => (
                                        <SelectItem key={d.uid} value={d.nickname}>{d.nickname}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </TableCell>
                        
                        {(['isUnderProgramming', 'isInitialApproval', 'isLogoTesting', 'isRevision', 'isFinalApproval', 'isFinalProgram'] as CheckboxField[]).map(field => {
                            const timestamp = lead[`${field.replace('is', '').charAt(0).toLowerCase() + field.slice(3)}Timestamp` as keyof Lead] as string | undefined;
                            return (
                                <TableCell key={field} className="text-center align-middle">
                                <div className="flex flex-col items-center justify-center gap-1">
                                    <Checkbox
                                        checked={lead[field] || false}
                                        onCheckedChange={(checked) => handleCheckboxChange(lead.id, field, !!checked)}
                                        disabled={isViewOnly || (field === 'isRevision' && lead.isFinalApproval)}
                                        className={isViewOnly ? 'disabled:opacity-100' : ''}
                                    />
                                    {timestamp && <div className="text-[10px] text-gray-500">{formatDateTime(timestamp).dateTimeShort}</div>}
                                </div>
                                </TableCell>
                            );
                        })}
                        
                        <TableCell className="text-center align-middle">
                            <div className="flex items-center justify-center">
                                <Button variant="ghost" size="sm" onClick={() => setOpenLeadId(prev => prev === lead.id ? null : lead.id)} className="h-7 px-2">
                                    View
                                    {openLeadId === lead.id ? (
                                    <ChevronUp className="h-4 w-4" />
                                    ) : (
                                    <ChevronDown className="h-4 w-4" />
                                    )}
                                </Button>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewingJoLead(lead)}>
                                                <FileText className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>View Job Order Form</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </TableCell>
                      <TableCell className="text-center align-middle">
                            <div className="flex flex-col items-center justify-center gap-1">
                            <Checkbox
                                checked={lead.isJoHardcopyReceived || false}
                                onCheckedChange={(checked) => handleJoReceivedChange(lead.id, !!checked)}
                                disabled={isViewOnly}
                                className={isViewOnly ? 'disabled:opacity-100' : ''}
                            />
                            {lead.joHardcopyReceivedTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.joHardcopyReceivedTimestamp).dateTimeShort}</div>}
                            </div>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                           {filterType === 'COMPLETED' ? (
                                lead.digitizingArchivedTimestamp && (
                                    <div className="text-xs text-gray-500">
                                        {formatDateTime(lead.digitizingArchivedTimestamp).dateTime}
                                    </div>
                                )
                           ) : (
                            <Button size="sm" onClick={() => setReviewConfirmLead(lead)} disabled={!lead.isFinalProgram || isViewOnly} className="h-7 px-3">
                                Done
                            </Button>
                           )}
                        </TableCell>
                    </TableRow>
                    {openLeadId === lead.id && (
                      <TableRow>
                        <TableCell colSpan={15}>
                           <div className="p-4 max-w-4xl mx-auto bg-gray-50 rounded-md my-2">
                            {/* Simplified and direct image display */}
                           </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
                })}
                </TableBody>
            </Table>
          </div>
      </CardContent>
      {viewingJoLead && (
        <Dialog open={!!viewingJoLead} onOpenChange={() => setViewingJoLead(null)}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Job Order: {formatJoNumber(viewingJoLead.joNumber)}</DialogTitle>
                    <DialogDescription>Read-only view of the job order form.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="pr-6">
                    <div className="p-4 bg-white text-black">
                        {(() => {
                            const lead = viewingJoLead;
                            const scesProfile = usersData?.find(u => u.nickname === lead.salesRepresentative);
                            const scesFullName = scesProfile ? toTitleCase(`${scesProfile.firstName} ${scesProfile.lastName}`) : toTitleCase(lead.salesRepresentative);
                            const totalQuantity = lead.orders.reduce((sum, order: any) => sum + order.quantity, 0);
                            const contactDisplay = getContactDisplay(lead);
                            
                            const deliveryDate = lead.deliveryDate ? format(new Date(lead.deliveryDate), "MMM dd, yyyy") : format(addDays(new Date(lead.submissionDateTime), lead.priorityType === 'Rush' ? 7 : 22), "MMM dd, yyyy");
                            
                            return (
                                <div className="p-10 mx-auto max-w-4xl printable-area mt-16 print-page">
                                <h1 className="text-2xl font-bold text-center mb-6 border-b-4 border-black pb-2">JOB ORDER FORM</h1>
                        
                                <div className="grid grid-cols-3 gap-x-8 text-sm mb-6 border-b border-black pb-4">
                                    <div className="space-y-1">
                                        <p><strong>Client Name:</strong> {lead.customerName}</p>
                                        <p><strong>Contact No:</strong> {contactDisplay}</p>
                                        <p><strong>Delivery Address:</strong> <span className="whitespace-pre-wrap">{lead.location}</span></p>
                                    </div>
                                    <div className="space-y-1">
                                        <p><strong>Date of Transaction:</strong> {format(new Date(lead.submissionDateTime), 'MMM dd, yyyy')}</p>
                                        <p><strong>Type of Order:</strong> {lead.orderType}</p>
                                        <p><strong>Terms of Payment:</strong> {lead.paymentType}</p>
                                        <p><strong>SCES Name:</strong> {scesFullName}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p><strong>Recipient's Name:</strong> {lead.recipientName || lead.customerName}</p>
                                        <p><strong>Courier:</strong> {lead.courier}</p>
                                        <p><strong>Delivery Date:</strong> {deliveryDate || 'N/A'}</p>
                                    </div>
                                </div>
                        
                                <h2 className="text-xl font-bold text-center mb-4">ORDER DETAILS</h2>
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-gray-200">
                                      <TableHead className="border border-black p-0.5" colSpan={3}>Item Description</TableHead>
                                      <TableHead className="border border-black p-0.5" rowSpan={2}>Qty</TableHead>
                                      <TableHead className="border border-black p-0.5" colSpan={2}>Front Design</TableHead>
                                      <TableHead className="border border-black p-0.5" colSpan={2}>Back Design</TableHead>
                                      <TableHead className="border border-black p-0.5" rowSpan={2}>Remarks</TableHead>
                                    </TableRow>
                                    <TableRow className="bg-gray-200">
                                      <TableHead className="border border-black p-0.5 font-medium">Type of Product</TableHead>
                                      <TableHead className="border border-black p-0.5 font-medium">Color</TableHead>
                                      <TableHead className="border border-black p-0.5 font-medium">Size</TableHead>
                                      <TableHead className="border border-black p-0.5 font-medium w-12">Left</TableHead>
                                      <TableHead className="border border-black p-0.5 font-medium w-12">Right</TableHead>
                                      <TableHead className="border border-black p-0.5 font-medium w-12">Logo</TableHead>
                                      <TableHead className="border border-black p-0.5 font-medium w-12">Text</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {lead.orders.map((order: any, index: number) => (
                                      <TableRow key={index}>
                                        <TableCell className="border border-black p-0.5 text-center align-middle">{order.productType}</TableCell>
                                        <TableCell className="border border-black p-0.5 text-center align-middle">{order.color}</TableCell>
                                        <TableCell className="border border-black p-0.5 text-center">{order.size}</TableCell>
                                        <TableCell className="border border-black p-0.5 text-center">{order.quantity}</TableCell>
                                        <TableCell className="border border-black p-0.5 text-center">
                                            <Checkbox className="mx-auto disabled:opacity-100" checked={order.design?.left || false} disabled />
                                        </TableCell>
                                        <TableCell className="border border-black p-0.5 text-center">
                                           <Checkbox className="mx-auto disabled:opacity-100" checked={order.design?.right || false} disabled />
                                        </TableCell>
                                        <TableCell className="border border-black p-0.5 text-center">
                                          <Checkbox className="mx-auto disabled:opacity-100" checked={order.design?.backLogo || false} disabled />
                                        </TableCell>
                                        <TableCell className="border border-black p-0.5 text-center">
                                          <Checkbox className="mx-auto disabled:opacity-100" checked={order.design?.backText || false} disabled />
                                        </TableCell>
                                        <TableCell className="border border-black p-0.5">
                                           <p className="text-xs">{order.remarks}</p>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                     <TableRow>
                                        <TableCell colSpan={3} className="text-right font-bold p-0.5">TOTAL</TableCell>
                                        <TableCell className="text-center font-bold p-0.5">{totalQuantity} PCS</TableCell>
                                        <TableCell colSpan={5}></TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                                </div>
                            )
                        })()}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )}
    </>
  );
});
DigitizingTableMemo.displayName = 'DigitizingTable';

export { DigitizingTableMemo as DigitizingTable };


    



