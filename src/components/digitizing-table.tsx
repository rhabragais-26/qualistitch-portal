
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
import React, { ChangeEvent, useMemo, useState, useCallback, useRef } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, Trash2, Upload, PlusCircle, CheckCircle2, Circle, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { addDays, differenceInDays } from 'date-fns';
import { cn, formatDateTime } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

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
  dstLogoLeft?: string;
  dstLogoRight?: string;
  dstBackLogo?: string;
  dstBackText?: string;
  namedOrders?: NamedOrder[];
  logoLeftImage?: string | null;
  logoLeftImageUploadTime?: string | null;
  logoRightImage?: string | null;
  logoRightImageUploadTime?: string | null;
  backLogoImage?: string | null;
  backLogoImageUploadTime?: string | null;
  backDesignImage?: string | null;
  backDesignImageUploadTime?: string | null;
  testLogoLeftImage?: string | null;
  testLogoLeftImageUploadTime?: string | null;
  testLogoRightImage?: string | null;
  testLogoRightImageUploadTime?: string | null;
  testBackLogoImage?: string | null;
  testBackLogoImageUploadTime?: string | null;
  testBackDesignImage?: string | null;
  testBackDesignImageUploadTime?: string | null;
  finalLogoEmb?: (FileObject | null)[];
  finalLogoEmbUploadTimes?: (string | null)[];
  finalBackDesignEmb?: (FileObject | null)[];
  finalBackDesignEmbUploadTimes?: (string | null)[];
  finalLogoDst?: (FileObject | null)[];
  finalLogoDstUploadTimes?: (string | null)[];
  finalBackDesignDst?: (FileObject | null)[];
  finalBackDesignDstUploadTimes?: (string | null)[];
  finalNamesDst?: (FileObject | null)[];
  finalNamesDstUploadTimes?: (string | null)[];
  sequenceLogo?: (FileObject | null)[];
  sequenceLogoUploadTimes?: (string | null)[];
  sequenceBackDesign?: (FileObject | null)[];
  sequenceBackDesignUploadTimes?: (string | null)[];
  finalProgrammedLogo?: (FileObject | null)[];
  finalProgrammedLogoUploadTimes?: (string | null)[];
  finalProgrammedBackDesign?: (FileObject | null)[];
  finalProgrammedBackDesignUploadTimes?: (string | null)[];
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

const DigitizingTableMemo = React.memo(function DigitizingTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [overdueFilter, setOverdueFilter] = useState('All');
  const [uncheckConfirmation, setUncheckConfirmation] = useState<{ leadId: string; field: CheckboxField | 'isJoHardcopyReceived'; } | null>(null);
  const [openCustomerDetails, setOpenCustomerDetails] = useState<string | null>(null);
  const [joReceivedConfirmation, setJoReceivedConfirmation] = useState<string | null>(null);


  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadLeadId, setUploadLeadId] = useState<string | null>(null);
  const [uploadField, setUploadField] = useState<CheckboxField | null>(null);
  
  const [logoLeftImage, setLogoLeftImage] = useState<string>('');
  const [logoRightImage, setLogoRightImage] = useState<string>('');
  const [backLogoImage, setBackLogoImage] = useState<string>('');
  const [backDesignImage, setBackDesignImage] = useState<string>('');
  const logoLeftImageUploadRef = useRef<HTMLInputElement>(null);
  const logoRightImageUploadRef = useRef<HTMLInputElement>(null);
  const backLogoImageUploadRef = useRef<HTMLInputElement>(null);
  const backDesignImageUploadRef = useRef<HTMLInputElement>(null);

  const [finalLogoEmb, setFinalLogoEmb] = useState<(FileObject | null)[]>([null]);
  const [finalBackDesignEmb, setFinalBackDesignEmb] = useState<(FileObject | null)[]>([null]);
  const [finalLogoDst, setFinalLogoDst] = useState<(FileObject | null)[]>([null]);
  const [finalBackDesignDst, setFinalBackDesignDst] = useState<(FileObject | null)[]>([]);
  const [finalNamesDst, setFinalNamesDst] = useState<(FileObject | null)[]>([]);
  const [sequenceLogo, setSequenceLogo] = useState<(FileObject | null)[]>([null]);
  const [sequenceBackDesign, setSequenceBackDesign] = useState<(FileObject | null)[]>([]);
  const [finalProgrammedLogo, setFinalProgrammedLogo] = useState<(FileObject | null)[]>([null]);
  const [finalProgrammedBackDesign, setFinalProgrammedBackDesign] = useState<(FileObject | null)[]>([]);
  const [isNamesOnly, setIsNamesOnly] = useState(false);


  const finalLogoEmbUploadRefs = useRef<(HTMLInputElement | null)[]>([]);
  const finalBackDesignEmbUploadRefs = useRef<(HTMLInputElement | null)[]>([]);
  const finalLogoDstUploadRefs = useRef<(HTMLInputElement | null)[]>([]);
  const finalBackDesignDstUploadRefs = useRef<(HTMLInputElement | null)[]>([]);
  const finalNamesDstUploadRefs = useRef<(HTMLInputElement | null)[]>([]);
  const sequenceLogoUploadRefs = useRef<(HTMLInputElement | null)[]>([]);
  const sequenceBackDesignUploadRefs = useRef<(HTMLInputElement | null)[]>([]);
  const finalProgrammedLogoUploadRefs = useRef<(HTMLInputElement | null)[]>([]);
  const finalProgrammedBackDesignUploadRefs = useRef<(HTMLInputElement | null)[]>([]);


  const [reviewConfirmLead, setReviewConfirmLead] = useState<Lead | null>(null);
  const [imageInView, setImageInView] = useState<string | null>(null);
  
  const updateStatus = useCallback(async (leadId: string, field: CheckboxField | 'isJoHardcopyReceived', value: boolean, showToast: boolean = true) => {
    if (!firestore) return;
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

    try {
      await updateDoc(leadDocRef, updateData);
    } catch (e) {
        console.error('Error updating status:', e);
        if (e instanceof Error) {
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: e.message || 'Could not update the status.',
            });
        }
    }
  }, [firestore, toast]);

  const handleCheckboxChange = useCallback((leadId: string, field: CheckboxField, checked: boolean) => {
    const lead = leads?.find((l) => l.id === leadId);
    const isCurrentlyChecked = lead ? lead[field] : false;

    if (!checked && isCurrentlyChecked) {
      setUncheckConfirmation({ leadId, field });
    } else if (checked && !isCurrentlyChecked) {
      setUploadLeadId(leadId);
      setUploadField(field);

      if (field === 'isUnderProgramming') {
        setLogoLeftImage(lead?.layouts?.[0]?.logoLeftImage || '');
        setLogoRightImage(lead?.layouts?.[0]?.logoRightImage || '');
        setBackLogoImage(lead?.layouts?.[0]?.backLogoImage || '');
        setBackDesignImage(lead?.layouts?.[0]?.backDesignImage || '');
        setIsUploadDialogOpen(true);
      } else if (field === 'isLogoTesting') {
        setLogoLeftImage(lead?.layouts?.[0]?.testLogoLeftImage || '');
        setLogoRightImage(lead?.layouts?.[0]?.testLogoRightImage || '');
        setBackLogoImage(lead?.layouts?.[0]?.testBackLogoImage || '');
        setBackDesignImage(lead?.layouts?.[0]?.testBackDesignImage || '');
        setIsUploadDialogOpen(true);
      } else if (field === 'isFinalProgram') {
        setFinalLogoEmb(lead?.layouts?.[0]?.finalLogoEmb?.length ? lead?.layouts?.[0]?.finalLogoEmb : [null]);
        setFinalBackDesignEmb(lead?.layouts?.[0]?.finalBackDesignEmb?.length ? lead?.layouts?.[0]?.finalBackDesignEmb : [null]);
        setFinalLogoDst(lead?.layouts?.[0]?.finalLogoDst?.length ? lead?.layouts?.[0]?.finalLogoDst : [null]);
        setFinalBackDesignDst(lead?.layouts?.[0]?.finalBackDesignDst?.length ? lead.layouts[0].finalBackDesignDst : [null]);
        setFinalNamesDst(lead?.layouts?.[0]?.finalNamesDst || []);
        setSequenceLogo(lead?.layouts?.[0]?.sequenceLogo?.length ? lead.layouts[0].sequenceLogo : [null]);
        setSequenceBackDesign(lead?.layouts?.[0]?.sequenceBackDesign?.length ? lead.layouts[0].sequenceBackDesign : [null]);
        setFinalProgrammedLogo(lead?.layouts?.[0]?.finalProgrammedLogo?.length ? lead.layouts[0].finalProgrammedLogo : [null]);
        setFinalProgrammedBackDesign(lead?.layouts?.[0]?.finalProgrammedBackDesign?.length ? lead.layouts[0].finalProgrammedBackDesign : [null]);
        setIsUploadDialogOpen(true);
      }
      else {
        updateStatus(leadId, field, true);
      }
    }
  }, [leads, updateStatus]);

  const handleJoReceivedChange = useCallback((leadId: string, checked: boolean) => {
    const lead = leads?.find((l) => l.id === leadId);
    if (!lead) return;
    const isCurrentlyChecked = lead.isJoHardcopyReceived || false;

    if (!checked && isCurrentlyChecked) {
      setUncheckConfirmation({ leadId, field: 'isJoHardcopyReceived' });
    } else if (checked && !isCurrentlyChecked) {
      setJoReceivedConfirmation(leadId);
    }
  }, [leads]);
  
  const confirmJoReceived = useCallback(() => {
    if (joReceivedConfirmation) {
      updateStatus(joReceivedConfirmation, 'isJoHardcopyReceived', true);
      setJoReceivedConfirmation(null);
    }
  }, [joReceivedConfirmation, updateStatus]);

  const handleUploadDialogSave = useCallback(async () => {
    if (!uploadLeadId || !uploadField || !firestore || !leads) return;

    const lead = leads.find(l => l.id === uploadLeadId);
    if (!lead) return;

    const currentLayouts = lead.layouts && lead.layouts.length > 0 ? [...lead.layouts] : [{}];
    let updatedFirstLayout;
    const now = new Date().toISOString();

    if (uploadField === 'isUnderProgramming') {
        const existingLayout = currentLayouts[0] || {};
        updatedFirstLayout = {
            ...existingLayout,
            logoLeftImage: logoLeftImage || null,
            logoLeftImageUploadTime: logoLeftImage ? (existingLayout.logoLeftImage === logoLeftImage ? existingLayout.logoLeftImageUploadTime : now) : null,
            logoRightImage: logoRightImage || null,
            logoRightImageUploadTime: logoRightImage ? (existingLayout.logoRightImage === logoRightImage ? existingLayout.logoRightImageUploadTime : now) : null,
            backLogoImage: backLogoImage || null,
            backLogoImageUploadTime: backLogoImage ? (existingLayout.backLogoImage === backLogoImage ? existingLayout.backLogoImageUploadTime : now) : null,
            backDesignImage: backDesignImage || null,
            backDesignImageUploadTime: backDesignImage ? (existingLayout.backDesignImage === backDesignImage ? existingLayout.backDesignImageUploadTime : now) : null,
        };
    } else if (uploadField === 'isLogoTesting') {
        const existingLayout = currentLayouts[0] || {};
        updatedFirstLayout = {
            ...existingLayout,
            testLogoLeftImage: logoLeftImage || null,
            testLogoLeftImageUploadTime: logoLeftImage ? (existingLayout.testLogoLeftImage === logoLeftImage ? existingLayout.testLogoLeftImageUploadTime : now) : null,
            testLogoRightImage: logoRightImage || null,
            testLogoRightImageUploadTime: logoRightImage ? (existingLayout.testLogoRightImage === logoRightImage ? existingLayout.testLogoRightImageUploadTime : now) : null,
            testBackLogoImage: backLogoImage || null,
            testBackLogoImageUploadTime: backLogoImage ? (existingLayout.testBackLogoImage === backLogoImage ? existingLayout.testBackLogoImageUploadTime : now) : null,
            testBackDesignImage: backDesignImage || null,
            testBackDesignImageUploadTime: backDesignImage ? (existingLayout.testBackDesignImage === backDesignImage ? existingLayout.testBackDesignImageUploadTime : now) : null,
        };
    } else if (uploadField === 'isFinalProgram') {
      const existingLayout = currentLayouts[0] || {};

      const createTimestampArray = (newFiles: (FileObject|null)[], oldFiles?: (FileObject|null)[], oldTimes?: (string|null)[]) => {
          return newFiles.map((file, index) => {
              const existingFile = oldFiles?.[index];
              const existingTime = oldTimes?.[index];
              return file && file.url === existingFile?.url ? existingTime : (file ? now : null);
          });
      };

      updatedFirstLayout = {
          ...existingLayout,
          finalLogoEmb,
          finalLogoEmbUploadTimes: createTimestampArray(finalLogoEmb, existingLayout.finalLogoEmb, existingLayout.finalLogoEmbUploadTimes),
          finalBackDesignEmb,
          finalBackDesignEmbUploadTimes: createTimestampArray(finalBackDesignEmb, existingLayout.finalBackDesignEmb, existingLayout.finalBackDesignEmbUploadTimes),
          finalLogoDst,
          finalLogoDstUploadTimes: createTimestampArray(finalLogoDst, existingLayout.finalLogoDst, existingLayout.finalLogoDstUploadTimes),
          finalBackDesignDst,
          finalBackDesignDstUploadTimes: createTimestampArray(finalBackDesignDst, existingLayout.finalBackDesignDst, existingLayout.finalBackDesignDstUploadTimes),
          finalNamesDst,
          finalNamesDstUploadTimes: createTimestampArray(finalNamesDst, existingLayout.finalNamesDst, existingLayout.finalNamesDstUploadTimes),
          sequenceLogo,
          sequenceLogoUploadTimes: createTimestampArray(sequenceLogo, existingLayout.sequenceLogo, existingLayout.sequenceLogoUploadTimes),
          sequenceBackDesign,
          sequenceBackDesignUploadTimes: createTimestampArray(sequenceBackDesign, existingLayout.sequenceBackDesign, existingLayout.sequenceBackDesignUploadTimes),
          finalProgrammedLogo,
          finalProgrammedLogoUploadTimes: createTimestampArray(finalProgrammedLogo, existingLayout.finalProgrammedLogo, existingLayout.finalProgrammedLogoUploadTimes),
          finalProgrammedBackDesign,
          finalProgrammedBackDesignUploadTimes: createTimestampArray(finalProgrammedBackDesign, existingLayout.finalProgrammedBackDesign, existingLayout.finalProgrammedBackDesignUploadTimes),
      };
    }
     else {
        return;
    }
    
    const newLayouts = [updatedFirstLayout, ...currentLayouts.slice(1)];
  
    try {
      const leadDocRef = doc(firestore, 'leads', uploadLeadId);
      await updateDoc(leadDocRef, {
        layouts: newLayouts
      });

      await updateStatus(uploadLeadId, uploadField, true, false);
      
      setLogoLeftImage('');
      setLogoRightImage('');
      setBackLogoImage('');
      setBackDesignImage('');
      setFinalLogoEmb([null]);
      setFinalBackDesignEmb([null]);
      setFinalLogoDst([null]);
      setFinalBackDesignDst([]);
      setFinalNamesDst([]);
      setSequenceLogo([null]);
      setSequenceBackDesign([]);
      setFinalProgrammedLogo([null]);
      setFinalProgrammedBackDesign([]);
      setIsUploadDialogOpen(false);
      setUploadLeadId(null);
      setUploadField(null);
      setIsNamesOnly(false);
    } catch (e: any) {
      console.error('Error saving images or status:', e);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: e.message || 'Could not save the images and update status.',
      });
    }
  }, [uploadLeadId, uploadField, firestore, leads, updateStatus, toast, logoLeftImage, logoRightImage, backLogoImage, backDesignImage, finalLogoEmb, finalBackDesignEmb, finalLogoDst, finalBackDesignDst, finalNamesDst, sequenceLogo, sequenceBackDesign, finalProgrammedLogo, finalProgrammedBackDesign]);

  const confirmUncheck = useCallback(() => {
    if (uncheckConfirmation) {
      updateStatus(uncheckConfirmation.leadId, uncheckConfirmation.field, false);
      setUncheckConfirmation(null);
    }
  }, [uncheckConfirmation, updateStatus]);

  const handleImagePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>, imageSetter: React.Dispatch<React.SetStateAction<string>> | ((index: number, value: FileObject) => void), index?: number) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              const fileObject = { name: "pasted-image.png", url: e.target.result as string };
              if (typeof index === 'number' && typeof imageSetter === 'function') {
                (imageSetter as (index: number, value: FileObject) => void)(index, fileObject);
              } else {
                (imageSetter as React.Dispatch<React.SetStateAction<string>>)(fileObject.url);
              }
            }
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  }, []);

  const handleFileUpload = useCallback((event: ChangeEvent<HTMLInputElement>, fileSetter: React.Dispatch<React.SetStateAction<string>> | ((index: number, value: FileObject) => void), index?: number) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                const fileObject = { name: file.name, url: e.target.result as string };
                if (typeof index === 'number' && typeof fileSetter === 'function') {
                    (fileSetter as (index: number, value: FileObject) => void)(index, fileObject);
                } else {
                    (fileSetter as React.Dispatch<React.SetStateAction<string>>)(fileObject.url);
                }
            }
        };
        reader.readAsDataURL(file);
    }
  }, []);
  
  const handleMultipleFileUpload = useCallback((event: ChangeEvent<HTMLInputElement>, filesState: (FileObject|null)[], setFilesState: React.Dispatch<React.SetStateAction<(FileObject|null)[]>>, index: number) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              if (e.target?.result) {
                  const newFiles = [...filesState];
                  newFiles[index] = { name: file.name, url: e.target.result as string };
                  setFilesState(newFiles);
              }
          };
          reader.readAsDataURL(file);
      }
  }, []);


  const addFile = useCallback((filesState: (FileObject|null)[], setFilesState: React.Dispatch<React.SetStateAction<(FileObject|null)[]>>) => {
    setFilesState([...filesState, null]);
  }, []);

  const removeFile = useCallback((filesState: (FileObject | null)[], setFilesState: React.Dispatch<React.SetStateAction<(FileObject | null)[]>>, index: number, refs: React.MutableRefObject<(HTMLInputElement | null)[]>) => {
    const newFiles = [...filesState];
    newFiles.splice(index, 1);
    setFilesState(newFiles);

    const newRefs = [...refs.current];
    newRefs.splice(index, 1);
    refs.current = newRefs;
    
    if(refs.current[index]) {
        refs.current[index]!.value = '';
    }
  }, []);


  const handleRemoveImage = useCallback((e: React.MouseEvent, imageSetter: React.Dispatch<React.SetStateAction<string>>) => {
    e.stopPropagation();
    imageSetter('');
  }, []);

  const handleConfirmReview = useCallback(async () => {
    if (!reviewConfirmLead || !firestore) return;
    try {
        const leadDocRef = doc(firestore, 'leads', reviewConfirmLead.id);
        await updateDoc(leadDocRef, { 
          isPreparedForProduction: true,
        });
        toast({
            title: "Project Sent to Production",
            description: "The project has been moved to the Item Preparation queue.",
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
  }, [reviewConfirmLead, firestore, toast]);


  const toggleLeadDetails = useCallback((leadId: string) => {
    setOpenLeadId(openLeadId === leadId ? null : leadId);
  }, [openLeadId]);
  
  const formatJoNumber = useCallback((joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
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

  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || null;
  }, []);

  const toggleCustomerDetails = useCallback((leadId: string) => {
    setOpenCustomerDetails(openCustomerDetails === leadId ? null : leadId);
  }, [openCustomerDetails]);
  
  const processedLeads = useMemo(() => {
    if (!leads) return [];
  
    const customerOrderStats: { [key: string]: { orders: Lead[], totalCustomerQuantity: number } } = {};
  
    // First, group orders and calculate total quantities for each customer
    leads.forEach(lead => {
      const name = lead.customerName.toLowerCase();
      if (!customerOrderStats[name]) {
        customerOrderStats[name] = { orders: [], totalCustomerQuantity: 0 };
      }
      customerOrderStats[name].orders.push(lead);
      const orderQuantity = lead.orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
      customerOrderStats[name].totalCustomerQuantity += orderQuantity;
    });
  
    const enrichedLeads: EnrichedLead[] = [];
  
    // Now, create the enriched lead objects with order numbers
    Object.values(customerOrderStats).forEach(({ orders, totalCustomerQuantity }) => {
      orders.sort((a, b) => new Date(a.submissionDateTime).getTime() - new Date(b.submissionDateTime).getTime());
      orders.forEach((lead, index) => {
        enrichedLeads.push({
          ...lead,
          orderNumber: index + 1,
          totalCustomerQuantity: totalCustomerQuantity,
        });
      });
    });
  
    return enrichedLeads;
  }, [leads]);

  const filteredLeads = React.useMemo(() => {
    if (!processedLeads) return [];
    
    const leadsWithJo = processedLeads.filter(lead => 
        lead.joNumber && 
        !lead.isDigitizingArchived &&
        !lead.isPreparedForProduction &&
        lead.orderType !== 'Stock (Jacket Only)'
    );

    const filtered = leadsWithJo.filter(lead => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ?
        (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
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

  }, [processedLeads, searchTerm, joNumberSearch, priorityFilter, overdueFilter, formatJoNumber, calculateDigitizingDeadline]);

  const fileChecklistItems: FileUploadChecklistItem[] = useMemo(() => {
    if (!reviewConfirmLead) return [];
    const layout = reviewConfirmLead.layouts?.[0];
    if (!layout) return [];

    const finalProgramFiles = [
      ...(layout.finalLogoEmb || []).map((file, i) => ({ label: `Logo ${i + 1} (EMB)`, uploaded: !!file, fileInfo: '.emb', timestamp: layout.finalLogoEmbUploadTimes?.[i] })),
      ...(layout.finalBackDesignEmb || []).map((file, i) => ({ label: `Back Design ${i + 1} (EMB)`, uploaded: !!file, fileInfo: '.emb', timestamp: layout.finalBackDesignEmbUploadTimes?.[i] })),
      ...(layout.finalLogoDst || []).map((file, i) => ({ label: `Logo ${i + 1} (DST)`, uploaded: !!file, fileInfo: '.dst', timestamp: layout.finalLogoDstUploadTimes?.[i] })),
      ...(layout.finalBackDesignDst || []).map((file, i) => ({ label: `Back Design ${i + 1} (DST)`, uploaded: !!file, fileInfo: '.dst', timestamp: layout.finalBackDesignDstUploadTimes?.[i] })),
      ...(layout.finalNamesDst || []).map((file, i) => ({ label: `Name ${i + 1} (DST)`, uploaded: !!file, fileInfo: '.dst', timestamp: layout.finalNamesDstUploadTimes?.[i] })),
      ...(layout.sequenceLogo || []).map((file, i) => ({ label: `Sequence Logo ${i + 1}`, uploaded: !!file, fileInfo: 'Image', timestamp: Array.isArray(layout.sequenceLogoUploadTimes) ? layout.sequenceLogoUploadTimes[i] : null })),
      ...(layout.sequenceBackDesign || []).map((file, i) => ({ label: `Sequence Back Design ${i+1}`, uploaded: !!file, fileInfo: 'Image', timestamp: Array.isArray(layout.sequenceBackDesignUploadTimes) ? layout.sequenceBackDesignUploadTimes[i] : null })),
    ];
    
    return finalProgramFiles.filter(item => item.uploaded);
  }, [reviewConfirmLead]);

  const renderUploadDialogContent = useCallback(() => {
    if (uploadField === 'isUnderProgramming' || uploadField === 'isLogoTesting') {
      const title = uploadField === 'isUnderProgramming' ? 'Upload Program Files' : 'Upload Actual Tested Image';
      return (
        <>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <Label>Logo Left</Label>
              <div tabIndex={0} className="relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-48 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onPaste={(e) => handleImagePaste(e, setLogoLeftImage)} onDoubleClick={() => logoLeftImageUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                {logoLeftImage ? (<> <Image src={logoLeftImage} alt="Logo Left" layout="fill" objectFit="contain" className="rounded-md" /> {logoLeftImage && <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => handleRemoveImage(e, setLogoLeftImage)}> <Trash2 className="h-4 w-4" /> </Button>} </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>Double-click to upload or paste image</p> </div>)}
                <input type="file" accept="image/*,.dst,.emb" ref={logoLeftImageUploadRef} onChange={(e) => handleFileUpload(e, setLogoLeftImage)} className="hidden" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo Right</Label>
              <div tabIndex={0} className="relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-48 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onPaste={(e) => handleImagePaste(e, setLogoRightImage)} onDoubleClick={() => logoRightImageUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                {logoRightImage ? (<> <Image src={logoRightImage} alt="Logo Right" layout="fill" objectFit="contain" className="rounded-md" /> {logoRightImage && <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => handleRemoveImage(e, setLogoRightImage)}> <Trash2 className="h-4 w-4" /> </Button>} </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>Double-click to upload or paste image</p> </div>)}
                <input type="file" accept="image/*,.dst,.emb" ref={logoRightImageUploadRef} onChange={(e) => handleFileUpload(e, setLogoRightImage)} className="hidden" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Back Logo</Label>
              <div tabIndex={0} className="relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-48 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onPaste={(e) => handleImagePaste(e, setBackLogoImage)} onDoubleClick={() => backLogoImageUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                {backLogoImage ? (<> <Image src={backLogoImage} alt="Back Logo" layout="fill" objectFit="contain" className="rounded-md" /> {backLogoImage && <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => handleRemoveImage(e, setBackLogoImage)}> <Trash2 className="h-4 w-4" /> </Button>} </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>Double-click to upload or paste image</p> </div>)}
                <input type="file" accept="image/*,.dst,.emb" ref={backLogoImageUploadRef} onChange={(e) => handleFileUpload(e, setBackLogoImage)} className="hidden" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Back Design</Label>
              <div tabIndex={0} className="relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-48 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onPaste={(e) => handleImagePaste(e, setBackDesignImage)} onDoubleClick={() => backDesignImageUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                {backDesignImage ? (<> <Image src={backDesignImage} alt="Back Design" layout="fill" objectFit="contain" className="rounded-md" /> {backDesignImage && <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => handleRemoveImage(e, setBackDesignImage)}> <Trash2 className="h-4 w-4" /> </Button>} </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>Double-click to upload or paste image</p> </div>)}
                <input type="file" accept="image/*,.dst,.emb" ref={backDesignImageUploadRef} onChange={(e) => handleFileUpload(e, setBackDesignImage)} className="hidden" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={handleUploadDialogSave} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-white" disabled={!logoLeftImage && !logoRightImage && !backLogoImage && !backDesignImage}>Save and Continue</Button>
          </DialogFooter>
        </>
      );
    }
    if (uploadField === 'isFinalProgram') {
      const isButtonDisabled = isNamesOnly
        ? !finalNamesDst.some(f => f)
        : !(
          (finalLogoEmb.some(f => f) || finalBackDesignEmb.some(f => f)) &&
          (finalLogoDst.some(f => f) || finalBackDesignDst.some(f => f)) &&
          (sequenceLogo.some(f => f) || sequenceBackDesign.some(f => f)) &&
          (finalProgrammedLogo.some(f => f) || finalProgrammedBackDesign.some(f => f))
        );

      return (
         <>
          <DialogHeader>
            <DialogTitle>Upload Final Program Files</DialogTitle>
          </DialogHeader>
           <ScrollArea className="max-h-[70vh] pr-6">
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-x-8">
                  <div className="space-y-2">
                      <Label>Logo (EMB)</Label>
                      {finalLogoEmb.map((file, index) => (
                          <div key={index} className="flex items-center gap-2">
                              <div tabIndex={0} className="relative group flex-1 border-2 border-dashed border-gray-400 rounded-lg p-2 text-center h-16 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onDoubleClick={() => finalLogoEmbUploadRefs.current[index]?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                                  {file ? (<p className="text-xs truncate px-2">{file.name}</p>) : (<div className="text-gray-500 flex flex-col items-center justify-center gap-1"><Upload className="h-4 w-4" /><p className="text-xs">Upload .emb</p></div>)}
                                  <input type="file" accept=".emb" ref={el => {if(el) finalLogoEmbUploadRefs.current[index] = el}} onChange={(e) => handleMultipleFileUpload(e, finalLogoEmb, setFinalLogoEmb, index)} className="hidden" />
                              </div>
                               {(file || index > 0) && (<Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => removeFile(finalLogoEmb, setFinalLogoEmb, index, finalLogoEmbUploadRefs)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>)}
                          </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => addFile(finalLogoEmb, setFinalLogoEmb)} className="h-7">
                          <PlusCircle className="mr-2 h-4 w-4" /> Add
                      </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Back Design (EMB)</Label>
                    {finalBackDesignEmb.map((file, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div tabIndex={0} className="relative group flex-1 border-2 border-dashed border-gray-400 rounded-lg p-2 text-center h-16 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onDoubleClick={() => finalBackDesignEmbUploadRefs.current[index]?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                                {file ? (<p className="text-xs truncate px-2">{file.name}</p>) : (<div className="text-gray-500 flex flex-col items-center justify-center gap-1"><Upload className="h-4 w-4" /><p className="text-xs">Upload .emb</p></div>)}
                                <input type="file" accept=".emb" ref={el => {if(el) finalBackDesignEmbUploadRefs.current[index] = el}} onChange={(e) => handleMultipleFileUpload(e, finalBackDesignEmb, setFinalBackDesignEmb, index)} className="hidden" />
                            </div>
                              {(file || index > 0) && (<Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => removeFile(finalBackDesignEmb, setFinalBackDesignEmb, index, finalBackDesignEmbUploadRefs)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>)}
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => addFile(finalBackDesignEmb, setFinalBackDesignEmb)} className="h-7">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add
                        </Button>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label>Logo (DST)</Label>
                      {finalLogoDst.map((file, index) => (
                         <div key={index} className="flex items-center gap-2">
                              <div tabIndex={0} className="relative group flex-1 border-2 border-dashed border-gray-400 rounded-lg p-2 text-center h-16 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onDoubleClick={() => finalLogoDstUploadRefs.current[index]?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                                  {file ? (<p className="text-xs truncate px-2">{file.name}</p>) : (<div className="text-gray-500 flex flex-col items-center justify-center gap-1"> <Upload className="h-4 w-4" /> <p className="text-xs">Upload .dst</p> </div>)}
                                  <input type="file" accept=".dst" ref={el => {if(el) finalLogoDstUploadRefs.current[index] = el}} onChange={(e) => handleMultipleFileUpload(e, finalLogoDst, setFinalLogoDst, index)} className="hidden" />
                              </div>
                              {(file || index > 0) && (<Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => removeFile(finalLogoDst, setFinalLogoDst, index, finalLogoDstUploadRefs)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>)}
                          </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => addFile(finalLogoDst, setFinalLogoDst)} className="h-7 mt-2">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add
                      </Button>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label>Back Design (DST)</Label>
                       {finalBackDesignDst.map((file, index) => (
                         <div key={index} className="flex items-center gap-2">
                              <div tabIndex={0} className="relative group flex-1 border-2 border-dashed border-gray-400 rounded-lg p-2 text-center h-16 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onDoubleClick={() => finalBackDesignDstUploadRefs.current[index]?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                                  {file ? (<p className="text-xs truncate px-2">{file.name}</p>) : (<div className="text-gray-500 flex flex-col items-center justify-center gap-1"> <Upload className="h-4 w-4" /> <p className="text-xs">Upload .dst</p> </div>)}
                                  <input type="file" accept=".dst" ref={el => {if(el) finalBackDesignDstUploadRefs.current[index] = el}} onChange={(e) => handleMultipleFileUpload(e, finalBackDesignDst, setFinalBackDesignDst, index)} className="hidden" />
                              </div>
                             {(file || index > 0) && (<Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => removeFile(finalBackDesignDst, setFinalBackDesignDst, index, finalBackDesignDstUploadRefs)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>)}
                          </div>
                      ))}
                       <Button variant="outline" size="sm" onClick={() => addFile(finalBackDesignDst, setFinalBackDesignDst)} className="h-7 mt-2">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add
                      </Button>
                  </div>
                </div>
                <div className="space-y-2">
                    <div className='flex items-center gap-4'>
                        <Label>Names (DST)</Label>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="names-only" checked={isNamesOnly} onCheckedChange={(checked) => setIsNamesOnly(!!checked)} />
                            <Label htmlFor="names-only" className="text-xs font-normal">Does the customer wanted names only (No Logo or Back Design) ?</Label>
                        </div>
                    </div>
                    <ScrollArea className="h-48 w-full rounded-md border p-4">
                      <div className="grid grid-cols-2 gap-4">
                        {finalNamesDst.map((file, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div tabIndex={0} className="relative group flex-1 border-2 border-dashed border-gray-400 rounded-lg p-1 text-center h-12 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onDoubleClick={() => finalNamesDstUploadRefs.current[index]?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                              {file ? (<p className="text-xs truncate px-2">{file.name}</p>) : (<div className="text-gray-500 flex flex-col items-center justify-center gap-1"> <Upload className="h-4 w-4" /> <p className="text-xs">Upload .dst</p> </div>)}
                              <input type="file" accept=".dst" ref={el => {if(el) finalNamesDstUploadRefs.current[index] = el}} onChange={(e) => handleMultipleFileUpload(e, finalNamesDst, setFinalNamesDst, index)} className="hidden" />
                            </div>
                            <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => removeFile(finalNamesDst, setFinalNamesDst, index, finalNamesDstUploadRefs)}> <Trash2 className="h-4 w-4" /> </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <Button variant="outline" size="sm" onClick={() => addFile(finalNamesDst, setFinalNamesDst)} className="mt-2">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add DST files for names
                    </Button>
                </div>
                 <Separator />

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-2">
                        <Label>Sequence for Logo</Label>
                        <Button variant="outline" size="sm" onClick={() => addFile(sequenceLogo, setSequenceLogo)} className="h-7" disabled={sequenceLogo.length >= 3}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {sequenceLogo.map((file, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div tabIndex={0} className="relative group flex-1 border-2 border-dashed border-gray-400 rounded-lg p-2 text-center h-32 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onPaste={(e) => handleImagePaste(e, (idx, val) => { const newFiles = [...sequenceLogo]; newFiles[idx] = val; setSequenceLogo(newFiles); }, index)} onDoubleClick={() => sequenceLogoUploadRefs.current[index]?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                                  {file ? (<> <Image src={file.url} alt={`Sequence Logo ${index + 1}`} layout="fill" objectFit="contain" className="rounded-md" /> {(<Button variant="destructive" size="icon" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-6 w-6" onClick={(e) => { e.stopPropagation(); removeFile(sequenceLogo, setSequenceLogo, index, sequenceLogoUploadRefs); }}> <Trash2 className="h-3 w-3" /> </Button>)} </>) : (<div className="text-gray-500 flex flex-col items-center justify-center gap-1"><Upload className="h-4 w-4" /><p className="text-xs">Upload/Paste file</p></div>)}
                                  <input type="file" ref={el => {if(el) sequenceLogoUploadRefs.current[index] = el}} onChange={(e) => handleMultipleFileUpload(e, sequenceLogo, setSequenceLogo, index)} className="hidden" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center mb-2">
                            <Label>Sequence for Back Design</Label>
                             <Button variant="outline" size="sm" onClick={() => addFile(sequenceBackDesign, setSequenceBackDesign)} className="h-7" disabled={sequenceBackDesign.length >= 3}>
                              <PlusCircle className="mr-2 h-4 w-4" /> Add
                            </Button>
                        </div>
                         <div className="space-y-2">
                            {sequenceBackDesign.map((file, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div tabIndex={0} className="relative group flex-1 border-2 border-dashed border-gray-400 rounded-lg p-2 text-center h-32 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onPaste={(e) => handleImagePaste(e, (idx, val) => { const newFiles = [...sequenceBackDesign]; newFiles[idx] = val; setSequenceBackDesign(newFiles); }, index)} onDoubleClick={() => sequenceBackDesignUploadRefs.current[index]?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                                    {file ? (<> <Image src={file.url} alt={`Sequence Back Design ${index + 1}`} layout="fill" objectFit="contain" className="rounded-md" /> {(<Button variant="destructive" size="icon" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-6 w-6" onClick={(e) => { e.stopPropagation(); removeFile(sequenceBackDesign, setSequenceBackDesign, index, sequenceBackDesignUploadRefs); }}> <Trash2 className="h-3 w-3" /> </Button>)} </>) : (<div className="text-gray-500 flex flex-col items-center justify-center gap-1"><Upload className="h-4 w-4" /><p className="text-xs">Upload/Paste file</p></div>)}
                                    <input type="file" ref={el => {if(el) sequenceBackDesignUploadRefs.current[index] = el}} onChange={(e) => handleMultipleFileUpload(e, sequenceBackDesign, setSequenceBackDesign, index)} className="hidden" />
                                </div>
                            </div>
                            ))}
                        </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-2">
                        <Label>Final Programmed Logo</Label>
                        <Button variant="outline" size="sm" onClick={() => addFile(finalProgrammedLogo, setFinalProgrammedLogo)} className="h-7" disabled={finalProgrammedLogo.length >= 3}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {finalProgrammedLogo.map((file, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div tabIndex={0} className="relative group flex-1 border-2 border-dashed border-gray-400 rounded-lg p-2 text-center h-32 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onPaste={(e) => handleImagePaste(e, (idx, val) => { const newFiles = [...finalProgrammedLogo]; newFiles[idx] = val; setFinalProgrammedLogo(newFiles); }, index)} onDoubleClick={() => finalProgrammedLogoUploadRefs.current[index]?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                                  {file ? (<> <Image src={file.url} alt={`Final Programmed Logo ${index + 1}`} layout="fill" objectFit="contain" className="rounded-md" /> {(<Button variant="destructive" size="icon" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-6 w-6" onClick={(e) => { e.stopPropagation(); removeFile(finalProgrammedLogo, setFinalProgrammedLogo, index, finalProgrammedLogoUploadRefs); }}> <Trash2 className="h-3 w-3" /> </Button>)} </>) : (<div className="text-gray-500 flex flex-col items-center justify-center gap-1"><Upload className="h-4 w-4" /><p className="text-xs">Upload/Paste file</p></div>)}
                                  <input type="file" ref={el => {if(el) finalProgrammedLogoUploadRefs.current[index] = el}} onChange={(e) => handleMultipleFileUpload(e, finalProgrammedLogo, setFinalProgrammedLogo, index)} className="hidden" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center mb-2">
                            <Label>Final Programmed Back Design</Label>
                             <Button variant="outline" size="sm" onClick={() => addFile(finalProgrammedBackDesign, setFinalProgrammedBackDesign)} className="h-7" disabled={finalProgrammedBackDesign.length >= 3}>
                              <PlusCircle className="mr-2 h-4 w-4" /> Add
                            </Button>
                        </div>
                         <div className="space-y-2">
                            {finalProgrammedBackDesign.map((file, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div tabIndex={0} className="relative group flex-1 border-2 border-dashed border-gray-400 rounded-lg p-2 text-center h-32 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onPaste={(e) => handleImagePaste(e, (idx, val) => { const newFiles = [...finalProgrammedBackDesign]; newFiles[idx] = val; setFinalProgrammedBackDesign(newFiles); }, index)} onDoubleClick={() => finalProgrammedBackDesignUploadRefs.current[index]?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                                    {file ? (<> <Image src={file.url} alt={`Final Programmed Back Design ${index + 1}`} layout="fill" objectFit="contain" className="rounded-md" /> {(<Button variant="destructive" size="icon" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-6 w-6" onClick={(e) => { e.stopPropagation(); removeFile(finalProgrammedBackDesign, setFinalProgrammedBackDesign, index, finalProgrammedBackDesignUploadRefs); }}> <Trash2 className="h-3 w-3" /> </Button>)} </>) : (<div className="text-gray-500 flex flex-col items-center justify-center gap-1"><Upload className="h-4 w-4" /><p className="text-xs">Upload/Paste file</p></div>)}
                                    <input type="file" ref={el => {if(el) finalProgrammedBackDesignUploadRefs.current[index] = el}} onChange={(e) => handleMultipleFileUpload(e, finalProgrammedBackDesign, setFinalProgrammedBackDesign, index)} className="hidden" />
                                </div>
                            </div>
                            ))}
                        </div>
                    </div>
                  </div>
                </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4">
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={handleUploadDialogSave} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-white" disabled={isButtonDisabled}>Save and Continue</Button>
          </DialogFooter>
        </>
      );
    }
    return null;
  }, [uploadField, handleImagePaste, handleFileUpload, handleRemoveImage, handleMultipleFileUpload, addFile, removeFile, handleUploadDialogSave, logoLeftImage, logoRightImage, backLogoImage, backDesignImage, finalLogoEmb, finalBackDesignEmb, finalLogoDst, finalBackDesignDst, finalNamesDst, sequenceLogo, sequenceBackDesign, finalProgrammedLogo, finalProgrammedBackDesign, isNamesOnly]);

  const ImagePreview = ({ src, alt, className }: { src: string; alt: string; className?:string;}) => (
    <div className={cn("relative cursor-pointer", className)} onClick={() => setImageInView(src)}>
      <Image src={src} alt={alt} layout="fill" objectFit="contain" className="rounded-md border" />
    </div>
  );

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

       <Dialog open={isUploadDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
            setLogoLeftImage('');
            setLogoRightImage('');
            setBackLogoImage('');
            setBackDesignImage('');
            setFinalLogoEmb([null]);
            setFinalBackDesignEmb([null]);
            setFinalLogoDst([null]);
            setFinalBackDesignDst([]);
            setFinalNamesDst([]);
            setSequenceLogo([null]);
            setSequenceBackDesign([]);
            setFinalProgrammedLogo([null]);
            setFinalProgrammedBackDesign([]);
            setIsNamesOnly(false);
            if (uploadLeadId && uploadField && isUploadDialogOpen) { // Check isUploadDialogOpen to prevent race condition
              const lead = leads?.find(l => l.id === uploadLeadId);
              if (lead) {
                const currentStatus = lead[uploadField];
                if (currentStatus) {
                  updateStatus(uploadLeadId, uploadField, false, false);
                }
              }
            }
        }
        setIsUploadDialogOpen(isOpen);
       }}>
        <DialogContent className="sm:max-w-4xl">
          {renderUploadDialogContent()}
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
                <span className="sr-only">Close image view</span>
            </Button>
          </div>
        </div>
      )}

      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-black">Programming Queue</CardTitle>
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
           <div className="border rounded-md h-full">
            <Table>
                <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                <TableRow>
                    <TableHead className="text-white font-bold align-middle text-center">Customer</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">SCES</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">Priority</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center whitespace-nowrap">J.O. No.</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">Overdue Status</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[100px]"><span className="block w-[80px] break-words">Received Printed J.O.?</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[100px]"><span className="block w-[80px] break-words">Initial Program</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[100px]"><span className="block w-[80px] break-words">Initial Approval</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[100px]"><span className="block w-[80px] break-words">Tested</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[100px]"><span className="block w-[80px] break-words">Under Revision</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[100px]"><span className="block w-[80px] break-words">Final Approval</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[100px]"><span className="block w-[80px] break-words">Final Program</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">Details</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center">Review</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredLeads.map((lead) => {
                  const deadlineInfo = calculateDigitizingDeadline(lead);
                  const firstLayout = lead.layouts?.[0];
                  const hasInitialImages = firstLayout?.logoLeftImage || firstLayout?.logoRightImage || firstLayout?.backLogoImage || firstLayout?.backDesignImage;
                  const hasTestImages = firstLayout?.testLogoLeftImage || firstLayout?.testLogoRightImage || firstLayout?.testBackLogoImage || firstLayout?.testBackDesignImage;
                  const hasFinalFiles = firstLayout?.finalLogoEmb?.some(f => f) || firstLayout?.finalBackDesignEmb?.some(f => f) || firstLayout?.finalLogoDst?.some(f => f) || firstLayout?.finalBackDesignDst?.some(f => f) || firstLayout?.finalNamesDst?.some(f => f) || firstLayout?.sequenceLogo?.some(f => f) || firstLayout?.sequenceBackDesign?.some(f => f);
                  const hasLayoutImages = lead.layouts?.some(l => l.layoutImage);
                  const isRepeat = lead.orderNumber > 1;
                  const specialOrderTypes = ["MTO", "Stock Design", "Stock (Jacket Only)"];
                  return (
                  <React.Fragment key={lead.id}>
                    <TableRow>
                      <TableCell className="font-medium text-xs align-middle py-3 text-black text-center">
                         <div className="flex items-center justify-center">
                            <Button variant="ghost" size="sm" onClick={() => toggleCustomerDetails(lead.id)} className="h-5 px-1 mr-1">
                                {openCustomerDetails === lead.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            <div className='flex flex-col items-center'>
                                <span className="font-medium">{lead.customerName}</span>
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
                                {openCustomerDetails === lead.id && (
                                    <div className="mt-1 space-y-0.5 text-gray-500 text-[11px] font-normal">
                                    {lead.companyName && lead.companyName !== '-' && <div>{lead.companyName}</div>}
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
                          <div className="flex flex-col items-center justify-start h-full gap-1">
                            <Checkbox
                              checked={lead.isJoHardcopyReceived || false}
                              onCheckedChange={(checked) => handleJoReceivedChange(lead.id, !!checked)}
                              disabled={!lead.isJoPrinted}
                            />
                            {lead.joHardcopyReceivedTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.joHardcopyReceivedTimestamp).dateTimeShort}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle p-2">
                          <div className="flex flex-col items-center justify-start h-full gap-1">
                            <Checkbox
                              checked={lead.isUnderProgramming || false}
                              onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isUnderProgramming', !!checked)}
                              disabled={!lead.isJoHardcopyReceived}
                            />
                            {lead.underProgrammingTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.underProgrammingTimestamp).dateTimeShort}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle p-2">
                           <div className="flex flex-col items-center justify-start h-full gap-1">
                            <Checkbox
                              checked={lead.isInitialApproval || false}
                              onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isInitialApproval', !!checked)}
                              disabled={!lead.isUnderProgramming}
                            />
                            {lead.initialApprovalTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.initialApprovalTimestamp).dateTimeShort}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle p-2">
                          <div className="flex flex-col items-center justify-start h-full gap-1">
                            <Checkbox
                              checked={lead.isLogoTesting || false}
                              onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isLogoTesting', !!checked)}
                              disabled={!lead.isInitialApproval}
                            />
                            {lead.logoTestingTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.logoTestingTimestamp).dateTimeShort}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle p-2">
                          <div className="flex flex-col items-center justify-start h-full gap-1">
                            <Checkbox
                              checked={lead.isRevision || false}
                              onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isRevision', !!checked)}
                              disabled={!lead.isLogoTesting || lead.isFinalApproval}
                            />
                            {lead.revisionTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.revisionTimestamp).dateTimeShort}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle p-2">
                           <div className="flex flex-col items-center justify-start h-full gap-1">
                            <Checkbox
                              checked={lead.isFinalApproval || false}
                              onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isFinalApproval', !!checked)}
                              disabled={!lead.isLogoTesting}
                            />
                            {lead.finalApprovalTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.finalApprovalTimestamp).dateTimeShort}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle p-2">
                           <div className="flex flex-col items-center justify-start h-full gap-1">
                            <Checkbox
                              checked={lead.isFinalProgram || false}
                              onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isFinalProgram', !!checked)}
                              disabled={!lead.isFinalApproval}
                            />
                            {lead.finalProgramTimestamp && <div className="text-[10px] text-gray-500">{formatDateTime(lead.finalProgramTimestamp).dateTimeShort}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
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
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                          {lead.isDigitizingArchived ? (
                            <div className="text-xs text-gray-500">
                                <p>Archived</p>
                                {lead.digitizingArchivedTimestamp && <p>{formatDateTime(lead.digitizingArchivedTimestamp).dateTimeShort}</p>}
                            </div>
                          ) : (
                            <Button
                                size="sm"
                                className={cn(
                                    'h-7 px-3 text-white font-bold',
                                    lead.isFinalProgram ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400'
                                )}
                                disabled={!lead.isFinalProgram}
                                onClick={() => setReviewConfirmLead(lead)}
                            >
                                Done
                            </Button>
                          )}
                        </TableCell>
                    </TableRow>
                    {openLeadId === lead.id && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={14} className="p-4 border-t-2 border-gray-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {hasInitialImages && (
                                    <Card className="bg-white">
                                        <CardHeader><CardTitle className="text-base">Initial Program Images</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-auto-fit-100 gap-4 text-xs">
                                            {lead.layouts?.[0]?.logoLeftImage && (
                                              <div> 
                                                <p className="font-semibold text-gray-500 mb-2">Logo Left</p> 
                                                <ImagePreview src={lead.layouts[0].logoLeftImage} alt="Initial Program Logo Left" className="w-24 h-24"/>
                                                {lead.layouts[0].logoLeftImageUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].logoLeftImageUploadTime).dateTime}</p>}
                                              </div>
                                            )}
                                            {lead.layouts?.[0]?.logoRightImage && (
                                              <div>
                                                <p className="font-semibold text-gray-500 mb-2">Logo Right</p>
                                                <ImagePreview src={lead.layouts[0].logoRightImage} alt="Initial Program Logo Right" className="w-24 h-24"/>
                                                {lead.layouts[0].logoRightImageUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].logoRightImageUploadTime).dateTime}</p>}
                                              </div>
                                            )}
                                            {lead.layouts?.[0]?.backLogoImage && (
                                              <div>
                                                <p className="font-semibold text-gray-500 mb-2">Back Logo</p>
                                                <ImagePreview src={lead.layouts[0].backLogoImage} alt="Initial Program Back Logo" className="w-24 h-24"/>
                                                {lead.layouts[0].backLogoImageUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].backLogoImageUploadTime).dateTime}</p>}
                                              </div>
                                            )}
                                            {lead.layouts?.[0]?.backDesignImage && (
                                              <div>
                                                <p className="font-semibold text-gray-500 mb-2">Back Design</p>
                                                <ImagePreview src={lead.layouts[0].backDesignImage} alt="Initial Program Back Design" className="w-32 h-24"/>
                                                {lead.layouts[0].backDesignImageUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].backDesignImageUploadTime).dateTime}</p>}
                                              </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                                 {hasTestImages && (
                                    <Card className="bg-white">
                                        <CardHeader><CardTitle className="text-base">Tested Images</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-auto-fit-100 gap-4 text-xs">
                                          {lead.layouts?.[0]?.testLogoLeftImage && (
                                            <div>
                                              <p className="font-semibold text-gray-500 mb-2">Logo Left</p>
                                              <ImagePreview src={lead.layouts[0].testLogoLeftImage} alt="Test Logo Left" className="w-24 h-24"/>
                                              {lead.layouts[0].testLogoLeftImageUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].testLogoLeftImageUploadTime).dateTime}</p>}
                                            </div>
                                          )}
                                          {lead.layouts?.[0]?.testLogoRightImage && (
                                            <div>
                                              <p className="font-semibold text-gray-500 mb-2">Logo Right</p>
                                              <ImagePreview src={lead.layouts[0].testLogoRightImage} alt="Test Logo Right" className="w-24 h-24"/>
                                              {lead.layouts[0].testLogoRightImageUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].testLogoRightImageUploadTime).dateTime}</p>}
                                            </div>
                                          )}
                                           {lead.layouts?.[0]?.testBackLogoImage && (
                                            <div>
                                              <p className="font-semibold text-gray-500 mb-2">Back Logo</p>
                                              <ImagePreview src={lead.layouts[0].testBackLogoImage} alt="Test Back Logo" className="w-24 h-24"/>
                                              {lead.layouts[0].testBackLogoImageUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].testBackLogoImageUploadTime).dateTime}</p>}
                                            </div>
                                          )}
                                          {lead.layouts?.[0]?.testBackDesignImage && (
                                            <div>
                                              <p className="font-semibold text-gray-500 mb-2">Back Design</p>
                                              <ImagePreview src={lead.layouts[0].testBackDesignImage} alt="Test Back Design" className="w-32 h-24"/>
                                              {lead.layouts[0].testBackDesignImageUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].testBackDesignImageUploadTime).dateTime}</p>}
                                            </div>
                                          )}
                                        </CardContent>
                                    </Card>
                                 )}
                                 {hasFinalFiles && (
                                    <Card className="bg-white">
                                        <CardHeader><CardTitle className="text-base">Final Program Files</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-auto-fit-100 gap-4 text-xs">
                                          {lead.layouts?.[0]?.finalLogoEmb?.map((file, index) => file && (<div key={index}><p className="font-semibold text-gray-500 mb-2">Logo {index + 1} (EMB)</p><p className='text-black text-sm p-2 border rounded-md bg-gray-100'>{file.name}</p>{lead.layouts?.[0]?.finalLogoEmbUploadTimes?.[index] && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].finalLogoEmbUploadTimes![index]!).dateTime}</p>}</div>))}
                                          {lead.layouts?.[0]?.finalBackDesignEmb?.map((file, index) => file && <div key={index}><p className="font-semibold text-gray-500 mb-2">Back Design {index + 1} (EMB)</p><p className='text-black text-sm p-2 border rounded-md bg-gray-100'>{file.name}</p>{lead.layouts[0].finalBackDesignEmbUploadTimes?.[index] && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].finalBackDesignEmbUploadTimes![index]!).dateTime}</p>}</div>)}
                                          {lead.layouts?.[0]?.finalLogoDst?.map((file, index) => file && (<div key={index}><p className="font-semibold text-gray-500 mb-2">Logo {index + 1} (DST)</p><p className='text-black text-sm p-2 border rounded-md bg-gray-100'>{file.name}</p>{lead.layouts?.[0]?.finalLogoDstUploadTimes?.[index] && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].finalLogoDstUploadTimes![index]!).dateTime}</p>}</div>))}
                                          {lead.layouts?.[0]?.finalBackDesignDst?.map((file, index) => file && <div key={index}><p className="font-semibold text-gray-500 mb-2">Back Design {index + 1} (DST)</p><p className='text-black text-sm p-2 border rounded-md bg-gray-100'>{file.name}</p>{lead.layouts[0].finalBackDesignDstUploadTimes?.[index] && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].finalBackDesignDstUploadTimes![index]!).dateTime}</p>}</div>)}
                                          {lead.layouts?.[0]?.finalNamesDst?.map((file, index) => file && (
                                            <div key={index}>
                                                <p className="font-semibold text-gray-500 mb-2">Name {index + 1} (DST)</p>
                                                <p className='text-black text-sm p-2 border rounded-md bg-gray-100'>{file.name}</p>
                                                {lead.layouts?.[0]?.finalNamesDstUploadTimes?.[index] && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].finalNamesDstUploadTimes![index]!).dateTime}</p>}
                                            </div>
                                          ))}
                                          {lead.layouts?.[0]?.sequenceLogo?.map((file, index) => file && (
                                              <div key={index}>
                                                  <p className="font-semibold text-gray-500 mb-2">Sequence Logo {index + 1}</p>
                                                  <ImagePreview src={file.url} alt={`Sequence Logo ${index + 1}`} className="w-24 h-24"/>
                                                  {Array.isArray(lead.layouts?.[0]?.sequenceLogoUploadTimes) && lead.layouts?.[0]?.sequenceLogoUploadTimes?.[index] && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].sequenceLogoUploadTimes![index]!).dateTime}</p>}
                                              </div>
                                          ))}
                                          {lead.layouts?.[0]?.sequenceBackDesign?.map((file, index) => file && (
                                              <div key={index}>
                                                  <p className="font-semibold text-gray-500 mb-2">Sequence Back Design {index + 1}</p>
                                                  <ImagePreview src={file.url} alt="Sequence Back Design" className="w-32 h-24"/>
                                                  {Array.isArray(lead.layouts?.[0]?.sequenceBackDesignUploadTimes) && lead.layouts?.[0]?.sequenceBackDesignUploadTimes?.[index] && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].sequenceBackDesignUploadTimes![index]!).dateTime}</p>}
                                              </div>
                                          ))}
                                        </CardContent>
                                    </Card>
                                  )}
                                {hasLayoutImages && (
                                    <Card className="bg-white">
                                        <CardHeader><CardTitle className="text-base">Layout Designs</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-auto-fit-100 gap-4 text-xs">
                                            {lead.layouts?.map((layout, index) => (
                                                layout.layoutImage && (
                                                    <div key={index}>
                                                        {lead.layouts.length > 1 && <p className="font-semibold text-gray-500 mb-2">Layout {index + 1}</p>}
                                                        <ImagePreview src={layout.layoutImage} alt={`Layout ${index + 1}`} className="w-32 h-24"/>
                                                    </div>
                                                )
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}
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
