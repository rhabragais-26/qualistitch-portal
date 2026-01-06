

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
import React, { ChangeEvent } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, Trash2, Upload, PlusCircle } from 'lucide-react';
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
  logoLeftImage?: string | null;
  logoLeftImageUploadTime?: string | null;
  logoRightImage?: string | null;
  logoRightImageUploadTime?: string | null;
  backDesignImage?: string | null;
  backDesignImageUploadTime?: string | null;
  testLogoLeftImage?: string | null;
  testLogoLeftImageUploadTime?: string | null;
  testLogoRightImage?: string | null;
  testLogoRightImageUploadTime?: string | null;
  testBackDesignImage?: string | null;
  testBackDesignImageUploadTime?: string | null;
  finalLogoEmb?: (string | null)[];
  finalLogoEmbUploadTimes?: (string | null)[];
  finalBackDesignEmb?: string | null;
  finalBackDesignEmbUploadTime?: string | null;
  finalLogoDst?: (string | null)[];
  finalLogoDstUploadTimes?: (string | null)[];
  finalBackDesignDst?: string | null;
  finalBackDesignDstUploadTime?: string | null;
  finalNamesDst?: (string | null)[];
  finalNamesDstUploadTimes?: (string | null)[];
  sequenceLogo?: (string | null)[];
  sequenceLogoUploadTimes?: (string | null)[];
  sequenceBackDesign?: string | null;
  sequenceBackDesignUploadTime?: string | null;
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

type CheckboxField = keyof Pick<Lead, 'isUnderProgramming' | 'isInitialApproval' | 'isLogoTesting' | 'isRevision' | 'isFinalApproval' | 'isFinalProgram'>;

export function DigitizingTable() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [joNumberSearch, setJoNumberSearch] = React.useState('');
  const [openLeadId, setOpenLeadId] = React.useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = React.useState('All');
  const [overdueFilter, setOverdueFilter] = React.useState('All');
  const [uncheckConfirmation, setUncheckConfirmation] = React.useState<{ leadId: string; field: CheckboxField; } | null>(null);

  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [uploadLeadId, setUploadLeadId] = React.useState<string | null>(null);
  const [uploadField, setUploadField] = React.useState<CheckboxField | null>(null);
  
  const [logoLeftImage, setLogoLeftImage] = React.useState<string>('');
  const [logoRightImage, setLogoRightImage] = React.useState<string>('');
  const [backDesignImage, setBackDesignImage] = React.useState<string>('');
  const logoLeftImageUploadRef = React.useRef<HTMLInputElement>(null);
  const logoRightImageUploadRef = React.useRef<HTMLInputElement>(null);
  const backDesignImageUploadRef = React.useRef<HTMLInputElement>(null);

  const [finalLogoEmb, setFinalLogoEmb] = React.useState<(string | null)[]>([null]);
  const [finalBackDesignEmb, setFinalBackDesignEmb] = React.useState<string>('');
  const [finalLogoDst, setFinalLogoDst] = React.useState<(string | null)[]>([null]);
  const [finalBackDesignDst, setFinalBackDesignDst] = React.useState<string>('');
  const [finalNamesDst, setFinalNamesDst] = React.useState<(string | null)[]>([]);
  const [sequenceLogo, setSequenceLogo] = React.useState<(string | null)[]>([null]);
  const [sequenceBackDesign, setSequenceBackDesign] = React.useState<string>('');

  const finalLogoEmbUploadRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const finalBackDesignEmbUploadRef = React.useRef<HTMLInputElement>(null);
  const finalLogoDstUploadRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const finalBackDesignDstUploadRef = React.useRef<HTMLInputElement>(null);
  const finalNamesDstUploadRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const sequenceLogoUploadRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const sequenceBackDesignUploadRef = React.useRef<HTMLInputElement>(null);
  
  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'), orderBy('submissionDateTime', 'desc'));
  }, [firestore, user]);

  const { data: leads, isLoading: isLeadsLoading, error } = useCollection<Lead>(leadsQuery);

  const handleCheckboxChange = (leadId: string, field: CheckboxField, checked: boolean) => {
    if (!checked) {
      setUncheckConfirmation({ leadId, field });
    } else {
      const lead = leads?.find((l) => l.id === leadId);
      setUploadLeadId(leadId);
      setUploadField(field);

      if (field === 'isUnderProgramming') {
        setLogoLeftImage(lead?.layouts?.[0]?.logoLeftImage || '');
        setLogoRightImage(lead?.layouts?.[0]?.logoRightImage || '');
        setBackDesignImage(lead?.layouts?.[0]?.backDesignImage || '');
        setIsUploadDialogOpen(true);
      } else if (field === 'isLogoTesting') {
        setLogoLeftImage(lead?.layouts?.[0]?.testLogoLeftImage || '');
        setLogoRightImage(lead?.layouts?.[0]?.testLogoRightImage || '');
        setBackDesignImage(lead?.layouts?.[0]?.testBackDesignImage || '');
        setIsUploadDialogOpen(true);
      } else if (field === 'isFinalProgram') {
        setFinalLogoEmb(lead?.layouts?.[0]?.finalLogoEmb?.length ? lead?.layouts?.[0]?.finalLogoEmb : [null]);
        setFinalBackDesignEmb(lead?.layouts?.[0]?.finalBackDesignEmb || '');
        setFinalLogoDst(lead?.layouts?.[0]?.finalLogoDst?.length ? lead?.layouts?.[0]?.finalLogoDst : [null]);
        setFinalBackDesignDst(lead?.layouts?.[0]?.finalBackDesignDst || '');
        setFinalNamesDst(lead?.layouts?.[0]?.finalNamesDst || []);
        setSequenceLogo(lead?.layouts?.[0]?.sequenceLogo?.length ? lead.layouts[0].sequenceLogo : [null]);
        setSequenceBackDesign(lead?.layouts?.[0]?.sequenceBackDesign || '');
        setIsUploadDialogOpen(true);
      }
      else {
        updateStatus(leadId, field, true);
      }
    }
  };

  const handleUploadDialogSave = async () => {
    if (!uploadLeadId || !uploadField || !firestore) return;

    const lead = leads?.find(l => l.id === uploadLeadId);
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
            testBackDesignImage: backDesignImage || null,
            testBackDesignImageUploadTime: backDesignImage ? (existingLayout.testBackDesignImage === backDesignImage ? existingLayout.testBackDesignImageUploadTime : now) : null,
        };
    } else if (uploadField === 'isFinalProgram') {
      const existingLayout = currentLayouts[0] || {};

      const newLogoEmbUploadTimes = finalLogoEmb.map((file, index) => {
        const existingFile = existingLayout.finalLogoEmb?.[index];
        const existingTime = existingLayout.finalLogoEmbUploadTimes?.[index];
        return file && file === existingFile ? existingTime : (file ? now : null);
      });

      const newLogoDstUploadTimes = finalLogoDst.map((file, index) => {
        const existingFile = existingLayout.finalLogoDst?.[index];
        const existingTime = existingLayout.finalLogoDstUploadTimes?.[index];
        return file && file === existingFile ? existingTime : (file ? now : null);
      });

      const newNamesDstUploadTimes = finalNamesDst.map((file, index) => {
        const existingFile = existingLayout.finalNamesDst?.[index];
        const existingTime = existingLayout.finalNamesDstUploadTimes?.[index];
        if (file && file === existingFile) return existingTime;
        if (file && file !== existingFile) return now;
        return null;
      });
      
       const newSequenceLogoUploadTimes = sequenceLogo.map((file, index) => {
        const existingFile = existingLayout.sequenceLogo?.[index];
        const existingTime = existingLayout.sequenceLogoUploadTimes?.[index];
        return file && file === existingFile ? existingTime : (file ? now : null);
      });

      updatedFirstLayout = {
          ...existingLayout,
          finalLogoEmb: finalLogoEmb,
          finalLogoEmbUploadTimes: newLogoEmbUploadTimes,
          finalBackDesignEmb: finalBackDesignEmb || null,
          finalBackDesignEmbUploadTime: finalBackDesignEmb ? (existingLayout.finalBackDesignEmb === finalBackDesignEmb ? existingLayout.finalBackDesignEmbUploadTime : now) : null,
          finalLogoDst: finalLogoDst,
          finalLogoDstUploadTimes: newLogoDstUploadTimes,
          finalBackDesignDst: finalBackDesignDst || null,
          finalBackDesignDstUploadTime: finalBackDesignDst ? (existingLayout.finalBackDesignDst === finalBackDesignDst ? existingLayout.finalBackDesignDstUploadTime : now) : null,
          finalNamesDst: finalNamesDst,
          finalNamesDstUploadTimes: newNamesDstUploadTimes,
          sequenceLogo: sequenceLogo,
          sequenceLogoUploadTimes: newSequenceLogoUploadTimes,
          sequenceBackDesign: sequenceBackDesign || null,
          sequenceBackDesignUploadTime: sequenceBackDesign ? (existingLayout.sequenceBackDesign === sequenceBackDesign ? existingLayout.sequenceBackDesignUploadTime : now) : null,
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
      setBackDesignImage('');
      setFinalLogoEmb([]);
      setFinalBackDesignEmb('');
      setFinalLogoDst([]);
      setFinalBackDesignDst('');
      setFinalNamesDst([]);
      setSequenceLogo([]);
      setSequenceBackDesign('');
      setIsUploadDialogOpen(false);
      setUploadLeadId(null);
      setUploadField(null);
    } catch (e: any) {
      console.error('Error saving images or status:', e);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: e.message || 'Could not save the images and update status.',
      });
    }
  };

  const confirmUncheck = () => {
    if (uncheckConfirmation) {
      updateStatus(uncheckConfirmation.leadId, uncheckConfirmation.field, false);
      setUncheckConfirmation(null);
    }
  };

  const updateStatus = async (leadId: string, field: CheckboxField, value: boolean, showToast: boolean = true) => {
    if (!firestore) return;
    const leadDocRef = doc(firestore, 'leads', leadId);
    
    const updateData: { [key: string]: any } = { 
        [field]: value,
        lastModified: new Date().toISOString(),
    };

    if (!value) {
        const sequence: CheckboxField[] = ['isUnderProgramming', 'isInitialApproval', 'isLogoTesting', 'isRevision', 'isFinalApproval', 'isFinalProgram'];
        const currentIndex = sequence.indexOf(field);
        if (currentIndex > -1) {
            for (let i = currentIndex + 1; i < sequence.length; i++) {
                const nextField = sequence[i];
                if (nextField) {
                  updateData[nextField] = false;
                }
            }
        }
    }
    
    if (field === 'isFinalApproval' && value) {
        updateData['isRevision'] = false;
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
  };

  const handleImagePaste = (event: React.ClipboardEvent<HTMLDivElement>, imageSetter: React.Dispatch<React.SetStateAction<string>> | ((index: number, value: string) => void), index?: number) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              if (typeof index === 'number' && typeof imageSetter === 'function') {
                (imageSetter as (index: number, value: string) => void)(index, e.target.result as string);
              } else {
                (imageSetter as React.Dispatch<React.SetStateAction<string>>)(e.target.result as string);
              }
            }
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>, fileSetter: React.Dispatch<React.SetStateAction<string>> | ((index: number, value: string) => void), index?: number) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
           if (typeof index === 'number' && typeof fileSetter === 'function') {
             (fileSetter as (index: number, value: string) => void)(index, e.target.result as string);
           } else {
             (fileSetter as React.Dispatch<React.SetStateAction<string>>)(e.target.result as string);
           }
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleMultipleFileUpload = (event: ChangeEvent<HTMLInputElement>, filesState: (string|null)[], setFilesState: React.Dispatch<React.SetStateAction<(string|null)[]>>, index: number) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              if (e.target?.result) {
                  const newFiles = [...filesState];
                  newFiles[index] = e.target.result as string;
                  setFilesState(newFiles);
              }
          };
          reader.readAsDataURL(file);
      }
  };


  const addFile = (filesState: (string|null)[], setFilesState: React.Dispatch<React.SetStateAction<(string|null)[]>>) => {
    setFilesState([...filesState, null]);
  };

  const removeFile = (filesState: (string|null)[], setFilesState: React.Dispatch<React.SetStateAction<(string|null)[]>>, index: number) => {
      const newFiles = [...filesState];
      newFiles.splice(index, 1);
      setFilesState(newFiles);
  };


  const handleRemoveImage = (e: React.MouseEvent, imageSetter: React.Dispatch<React.SetStateAction<string>>) => {
    e.stopPropagation();
    imageSetter('');
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
      return { text: `${Math.abs(remainingDays)} day(s) overdue`, isOverdue: true, isUrgent: false, remainingDays };
    } else if (remainingDays <= 2) {
      return { text: `${remainingDays} day(s) remaining`, isOverdue: false, isUrgent: true, remainingDays };
    } else {
      return { text: `${remainingDays} day(s) remaining`, isOverdue: false, isUrgent: false, remainingDays };
    }
  };

  const filteredLeads = React.useMemo(() => {
    if (!leads) return [];
    
    const leadsWithJo = leads.filter(lead => lead.joNumber);

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

  }, [leads, searchTerm, joNumberSearch, priorityFilter, overdueFilter]);

  const isLoading = isAuthLoading || isLeadsLoading;

  const renderUploadDialogContent = () => {
    if (uploadField === 'isUnderProgramming' || uploadField === 'isLogoTesting') {
      return (
        <>
          <DialogHeader>
            <DialogTitle>{uploadField === 'isLogoTesting' ? 'Upload Actual Tested Image' : 'Upload Program Files'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
            <div className="space-y-2">
              <Label>Logo Left</Label>
              <div tabIndex={0} className="relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-64 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onPaste={(e) => handleImagePaste(e, setLogoLeftImage)} onDoubleClick={() => logoLeftImageUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                {logoLeftImage ? (<> <Image src={logoLeftImage} alt="Logo Left" layout="fill" objectFit="contain" className="rounded-md" /> <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => handleRemoveImage(e, setLogoLeftImage)}> <Trash2 className="h-4 w-4" /> </Button> </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>Double-click to upload or paste image</p> </div>)}
                <input type="file" accept="image/*,.dst,.emb" ref={logoLeftImageUploadRef} onChange={(e) => handleFileUpload(e, setLogoLeftImage)} className="hidden" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo Right</Label>
              <div tabIndex={0} className="relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-64 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onPaste={(e) => handleImagePaste(e, setLogoRightImage)} onDoubleClick={() => logoRightImageUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                {logoRightImage ? (<> <Image src={logoRightImage} alt="Logo Right" layout="fill" objectFit="contain" className="rounded-md" /> <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => handleRemoveImage(e, setLogoRightImage)}> <Trash2 className="h-4 w-4" /> </Button> </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>Double-click to upload or paste image</p> </div>)}
                <input type="file" accept="image/*,.dst,.emb" ref={logoRightImageUploadRef} onChange={(e) => handleFileUpload(e, setLogoRightImage)} className="hidden" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Back Design</Label>
              <div tabIndex={0} className="relative group border-2 border-dashed border-gray-400 rounded-lg p-4 text-center h-64 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onPaste={(e) => handleImagePaste(e, setBackDesignImage)} onDoubleClick={() => backDesignImageUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                {backDesignImage ? (<> <Image src={backDesignImage} alt="Back Design" layout="fill" objectFit="contain" className="rounded-md" /> <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => handleRemoveImage(e, setBackDesignImage)}> <Trash2 className="h-4 w-4" /> </Button> </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-12 w-12" /> <p>Double-click to upload or paste image</p> </div>)}
                <input type="file" accept="image/*,.dst,.emb" ref={backDesignImageUploadRef} onChange={(e) => handleFileUpload(e, setBackDesignImage)} className="hidden" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={handleUploadDialogSave} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-white" disabled={!logoLeftImage && !logoRightImage && !backDesignImage}>Save and Continue</Button>
          </DialogFooter>
        </>
      );
    }
    if (uploadField === 'isFinalProgram') {
      return (
         <>
          <DialogHeader>
            <DialogTitle>Upload Final Program Files</DialogTitle>
          </DialogHeader>
           <ScrollArea className="max-h-[70vh] pr-6">
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                      <div className="flex justify-between items-center mb-2">
                          <Label>Logo (EMB)</Label>
                           <Button variant="outline" size="sm" onClick={() => addFile(finalLogoEmb, setFinalLogoEmb)} className="h-7" disabled={finalLogoEmb.length >= 3}>
                              <PlusCircle className="mr-2 h-4 w-4" /> Add
                          </Button>
                      </div>
                      <div className="space-y-2">
                      {finalLogoEmb.map((file, index) => (
                          <div key={index} className="flex items-center gap-2">
                              <div tabIndex={0} className="relative group flex-1 border-2 border-dashed border-gray-400 rounded-lg p-2 text-center h-16 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onDoubleClick={() => finalLogoEmbUploadRefs.current[index]?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                                  {file ? (<p className="text-xs truncate px-2">{file.split(',')[0].slice(5, 30)}...</p>) : (<div className="text-gray-500 flex flex-col items-center justify-center gap-1"><Upload className="h-4 w-4" /><p className="text-xs">Upload .emb</p></div>)}
                                  <input type="file" accept=".emb" ref={el => finalLogoEmbUploadRefs.current[index] = el} onChange={(e) => handleMultipleFileUpload(e, finalLogoEmb, setFinalLogoEmb, index)} className="hidden" />
                              </div>
                              {index > 0 && <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => removeFile(finalLogoEmb, setFinalLogoEmb, index)}> <Trash2 className="h-4 w-4" /> </Button>}
                          </div>
                      ))}
                      </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Back Design (EMB)</Label>
                    <div tabIndex={0} className="relative group border-2 border-dashed border-gray-400 rounded-lg p-2 text-center h-16 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onDoubleClick={() => finalBackDesignEmbUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                      {finalBackDesignEmb ? (<> <p className="text-xs truncate px-4">{finalBackDesignEmb.split(',')[0].slice(5, 35)}...</p> <Button variant="destructive" size="icon" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-6 w-6" onClick={(e) => handleRemoveImage(e, setFinalBackDesignEmb)}> <Trash2 className="h-3 w-3" /> </Button> </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-6 w-6" /> <p className="text-xs mt-1">Upload .emb file</p> </div>)}
                      <input type="file" accept=".emb" ref={finalBackDesignEmbUploadRef} onChange={(e) => handleFileUpload(e, setFinalBackDesignEmb)} className="hidden" />
                    </div>
                  </div>
                  <div className="space-y-2">
                      <div className="flex justify-between items-center mb-2">
                          <Label>Logo (DST)</Label>
                          <Button variant="outline" size="sm" onClick={() => addFile(finalLogoDst, setFinalLogoDst)} className="h-7" disabled={finalLogoDst.length >= 3}>
                              <PlusCircle className="mr-2 h-4 w-4" /> Add
                          </Button>
                      </div>
                      <div className="space-y-2">
                      {finalLogoDst.map((file, index) => (
                         <div key={index} className="flex items-center gap-2">
                              <div tabIndex={0} className="relative group flex-1 border-2 border-dashed border-gray-400 rounded-lg p-2 text-center h-16 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onDoubleClick={() => finalLogoDstUploadRefs.current[index]?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                                  {file ? (<p className="text-xs truncate px-2">{file.split(',')[0].slice(5, 30)}...</p>) : (<div className="text-gray-500 flex flex-col items-center justify-center gap-1"> <Upload className="h-4 w-4" /> <p className="text-xs">Upload .dst</p> </div>)}
                                  <input type="file" accept=".dst" ref={el => finalLogoDstUploadRefs.current[index] = el} onChange={(e) => handleMultipleFileUpload(e, finalLogoDst, setFinalLogoDst, index)} className="hidden" />
                              </div>
                             {index > 0 && <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => removeFile(finalLogoDst, setFinalLogoDst, index)}> <Trash2 className="h-4 w-4" /> </Button>}
                          </div>
                      ))}
                      </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Back Design (DST)</Label>
                    <div tabIndex={0} className="relative group border-2 border-dashed border-gray-400 rounded-lg p-2 text-center h-16 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onDoubleClick={() => finalBackDesignDstUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                      {finalBackDesignDst ? (<> <p className="text-xs truncate px-4">{finalBackDesignDst.split(',')[0].slice(5, 35)}...</p> <Button variant="destructive" size="icon" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-6 w-6" onClick={(e) => handleRemoveImage(e, setFinalBackDesignDst)}> <Trash2 className="h-3 w-3" /> </Button> </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-6 w-6" /> <p className="text-xs mt-1">Upload .dst file</p> </div>)}
                      <input type="file" accept=".dst" ref={finalBackDesignDstUploadRef} onChange={(e) => handleFileUpload(e, setFinalBackDesignDst)} className="hidden" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                    <Label>Names (DST)</Label>
                    <ScrollArea className="h-48 w-full rounded-md border p-4">
                      <div className="grid grid-cols-2 gap-4">
                        {finalNamesDst.map((file, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div tabIndex={0} className="relative group flex-1 border-2 border-dashed border-gray-400 rounded-lg p-1 text-center h-12 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onDoubleClick={() => finalNamesDstUploadRefs.current[index]?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                              {file ? (<p className="text-xs truncate px-2">{file.split(',')[0].slice(5, 30)}...</p>) : (<div className="text-gray-500 flex flex-col items-center justify-center gap-1"> <Upload className="h-4 w-4" /> <p className="text-xs">Upload .dst</p> </div>)}
                              <input type="file" accept=".dst" ref={el => finalNamesDstUploadRefs.current[index] = el} onChange={(e) => handleMultipleFileUpload(e, finalNamesDst, setFinalNamesDst, index)} className="hidden" />
                            </div>
                            <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => removeFile(finalNamesDst, setFinalNamesDst, index)}> <Trash2 className="h-4 w-4" /> </Button>
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
                                  {file ? (<> <Image src={file} alt={`Sequence Logo ${index + 1}`} layout="fill" objectFit="contain" className="rounded-md" /> <Button variant="destructive" size="icon" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-6 w-6" onClick={(e) => { e.stopPropagation(); const newFiles = [...sequenceLogo]; newFiles[index] = null; setSequenceLogo(newFiles); }}> <Trash2 className="h-3 w-3" /> </Button> </>) : (<div className="text-gray-500 flex flex-col items-center justify-center gap-1"><Upload className="h-4 w-4" /><p className="text-xs">Upload/Paste file</p></div>)}
                                  <input type="file" ref={el => sequenceLogoUploadRefs.current[index] = el} onChange={(e) => handleMultipleFileUpload(e, sequenceLogo, setSequenceLogo, index)} className="hidden" />
                            </div>
                            {index > 0 && <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => removeFile(sequenceLogo, setSequenceLogo, index)}> <Trash2 className="h-4 w-4" /> </Button>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Sequence for Back Design</Label>
                      <div tabIndex={0} className="relative group border-2 border-dashed border-gray-400 rounded-lg p-2 text-center h-32 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none" onPaste={(e) => handleImagePaste(e, setSequenceBackDesign)} onDoubleClick={() => sequenceBackDesignUploadRef.current?.click()} onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}>
                        {sequenceBackDesign ? (<> <Image src={sequenceBackDesign} alt="Sequence Back Design" layout="fill" objectFit="contain" className="rounded-md" /> <Button variant="destructive" size="icon" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-6 w-6" onClick={(e) => handleRemoveImage(e, setSequenceBackDesign)}> <Trash2 className="h-3 w-3" /> </Button> </>) : (<div className="text-gray-500"> <Upload className="mx-auto h-6 w-6" /> <p className="text-xs mt-1">Upload/Paste file</p> </div>)}
                        <input type="file" ref={sequenceBackDesignUploadRef} onChange={(e) => handleFileUpload(e, setSequenceBackDesign)} className="hidden" />
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4">
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={handleUploadDialogSave} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-white" disabled={finalLogoEmb.every(f => !f) && !finalBackDesignEmb && finalLogoDst.every(f => !f) && !finalBackDesignDst && finalNamesDst.every(f => !f) && sequenceLogo.every(f => !f) && !sequenceBackDesign}>Save and Continue</Button>
          </DialogFooter>
        </>
      );
    }
    return null;
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

       <Dialog open={isUploadDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
            setLogoLeftImage('');
            setLogoRightImage('');
            setBackDesignImage('');
            setFinalLogoEmb([]);
            setFinalBackDesignEmb('');
            setFinalLogoDst([]);
            setFinalBackDesignDst('');
            setFinalNamesDst([]);
            setSequenceLogo([]);
            setSequenceBackDesign('');
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
                    <TableHead className="text-white font-bold align-middle whitespace-nowrap">J.O. No.</TableHead>
                    <TableHead className="text-white font-bold align-middle">Overdue Status</TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[120px]"><span className="block w-[100px] break-words">Initial Program</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[120px]"><span className="block w-[100px] break-words">Initial Approval</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[120px]"><span className="block w-[100px] break-words">Test</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[120px]"><span className="block w-[100px] break-words">Revision</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[120px]"><span className="block w-[100px] break-words">Final Approval</span></TableHead>
                    <TableHead className="text-white font-bold align-middle text-center w-[120px]"><span className="block w-[100px] break-words">Final Program</span></TableHead>
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
                      <TableCell className="font-medium text-xs align-middle py-2 text-black whitespace-nowrap">{formatJoNumber(lead.joNumber)}</TableCell>
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
                            onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isUnderProgramming', !!checked)}
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                          <Checkbox
                            checked={lead.isInitialApproval || false}
                            onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isInitialApproval', !!checked)}
                            disabled={!lead.isUnderProgramming}
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                          <Checkbox
                            checked={lead.isLogoTesting || false}
                            onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isLogoTesting', !!checked)}
                             disabled={!lead.isInitialApproval}
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                          <Checkbox
                            checked={lead.isRevision || false}
                            onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isRevision', !!checked)}
                            disabled={!lead.isLogoTesting || lead.isFinalApproval}
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                          <Checkbox
                            checked={lead.isFinalApproval || false}
                            onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isFinalApproval', !!checked)}
                            disabled={!lead.isLogoTesting}
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle py-2">
                          <Checkbox
                            checked={lead.isFinalProgram || false}
                            onCheckedChange={(checked) => handleCheckboxChange(lead.id, 'isFinalProgram', !!checked)}
                            disabled={!lead.isFinalApproval}
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
                                {(lead.layouts?.[0]?.logoLeftImage || lead.layouts?.[0]?.logoRightImage || lead.layouts?.[0]?.backDesignImage) && (
                                    <Card className="bg-white">
                                        <CardHeader><CardTitle className="text-base">Initial Program Images</CardTitle></CardHeader>
                                        <CardContent className="flex flex-wrap gap-4 text-xs">
                                            {lead.layouts?.[0]?.logoLeftImage && (<div className="w-fit"> <p className="font-semibold text-gray-500 mb-2">Logo Left</p> <div className="relative w-[200px] h-[150px]"><Image src={lead.layouts[0].logoLeftImage} alt="Initial Program Logo Left" layout="fill" objectFit="contain" className="rounded-md border" /></div> {lead.layouts[0].logoLeftImageUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].logoLeftImageUploadTime).dateTime}</p>}</div>)}
                                            {lead.layouts?.[0]?.logoRightImage && (<div className="w-fit"> <p className="font-semibold text-gray-500 mb-2">Logo Right</p> <div className="relative w-[200px] h-[150px]"><Image src={lead.layouts[0].logoRightImage} alt="Initial Program Logo Right" layout="fill" objectFit="contain" className="rounded-md border" /></div> {lead.layouts[0].logoRightImageUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].logoRightImageUploadTime).dateTime}</p>}</div>)}
                                            {lead.layouts?.[0]?.backDesignImage && (<div className="w-fit"> <p className="font-semibold text-gray-500 mb-2">Back Design</p> <div className="relative w-[200px] h-[150px]"><Image src={lead.layouts[0].backDesignImage} alt="Initial Program Back Design" layout="fill" objectFit="contain" className="rounded-md border" /></div> {lead.layouts[0].backDesignImageUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].backDesignImageUploadTime).dateTime}</p>}</div>)}
                                        </CardContent>
                                    </Card>
                                )}
                                 {(lead.layouts?.[0]?.testLogoLeftImage || lead.layouts?.[0]?.testLogoRightImage || lead.layouts?.[0]?.testBackDesignImage) && (
                                    <Card className="bg-white">
                                        <CardHeader><CardTitle className="text-base">Test Images</CardTitle></CardHeader>
                                        <CardContent className="flex flex-wrap gap-4 text-xs">
                                            {lead.layouts?.[0]?.testLogoLeftImage && (<div className="w-fit"> <p className="font-semibold text-gray-500 mb-2">Logo Left</p> <div className="relative w-[200px] h-[150px]"><Image src={lead.layouts[0].testLogoLeftImage} alt="Test Logo Left" layout="fill" objectFit="contain" className="rounded-md border" /></div> {lead.layouts[0].testLogoLeftImageUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].testLogoLeftImageUploadTime).dateTime}</p>}</div>)}
                                            {lead.layouts?.[0]?.testLogoRightImage && (<div className="w-fit"> <p className="font-semibold text-gray-500 mb-2">Logo Right</p> <div className="relative w-[200px] h-[150px]"><Image src={lead.layouts[0].testLogoRightImage} alt="Test Logo Right" layout="fill" objectFit="contain" className="rounded-md border" /></div> {lead.layouts[0].testLogoRightImageUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].testLogoRightImageUploadTime).dateTime}</p>}</div>)}
                                            {lead.layouts?.[0]?.testBackDesignImage && (<div className="w-fit"> <p className="font-semibold text-gray-500 mb-2">Back Design</p> <div className="relative w-[200px] h-[150px]"><Image src={lead.layouts[0].testBackDesignImage} alt="Test Back Design" layout="fill" objectFit="contain" className="rounded-md border" /></div> {lead.layouts[0].testBackDesignImageUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].testBackDesignImageUploadTime).dateTime}</p>}</div>)}
                                        </CardContent>
                                    </Card>
                                 )}
                                 {(lead.layouts?.[0]?.finalLogoEmb?.length || lead.layouts?.[0]?.finalBackDesignEmb || lead.layouts?.[0]?.finalLogoDst?.length || lead.layouts?.[0]?.finalBackDesignDst || lead.layouts?.[0]?.finalNamesDst?.length) && (
                                    <Card className="bg-white">
                                        <CardHeader><CardTitle className="text-base">Final Program Files</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-2 gap-4 text-xs">
                                          {lead.layouts?.[0]?.finalLogoEmb?.map((file, index) => file && (<div key={index} className="relative w-fit"><p className="font-semibold text-gray-500 mb-2">Logo {index + 1} (EMB)</p><p className='text-black text-sm p-2 border rounded-md bg-gray-100'>EMB File</p>{lead.layouts?.[0]?.finalLogoEmbUploadTimes?.[index] && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].finalLogoEmbUploadTimes![index]!).dateTime}</p>}</div>))}
                                          {lead.layouts?.[0]?.finalBackDesignEmb && <div className="relative w-fit"><p className="font-semibold text-gray-500 mb-2">Back (EMB)</p><p className='text-black text-sm p-2 border rounded-md bg-gray-100'>EMB File</p>{lead.layouts[0].finalBackDesignEmbUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].finalBackDesignEmbUploadTime).dateTime}</p>}</div>}
                                          {lead.layouts?.[0]?.finalLogoDst?.map((file, index) => file && (<div key={index} className="relative w-fit"><p className="font-semibold text-gray-500 mb-2">Logo {index + 1} (DST)</p><p className='text-black text-sm p-2 border rounded-md bg-gray-100'>DST File</p>{lead.layouts?.[0]?.finalLogoDstUploadTimes?.[index] && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].finalLogoDstUploadTimes![index]!).dateTime}</p>}</div>))}
                                          {lead.layouts?.[0]?.finalBackDesignDst && <div className="relative w-fit"><p className="font-semibold text-gray-500 mb-2">Back (DST)</p><p className='text-black text-sm p-2 border rounded-md bg-gray-100'>DST File</p>{lead.layouts[0].finalBackDesignDstUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].finalBackDesignDstUploadTime).dateTime}</p>}</div>}
                                          {lead.layouts?.[0]?.finalNamesDst?.map((file, index) => file && (
                                            <div key={index} className="relative w-fit">
                                                <p className="font-semibold text-gray-500 mb-2">Name {index + 1} (DST)</p>
                                                <p className='text-black text-sm p-2 border rounded-md bg-gray-100'>DST File</p>
                                                {lead.layouts?.[0]?.finalNamesDstUploadTimes?.[index] && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].finalNamesDstUploadTimes![index]!).dateTime}</p>}
                                            </div>
                                          ))}
                                          {lead.layouts?.[0]?.sequenceLogo?.map((file, index) => file && (<div key={index} className="relative w-fit"><p className="font-semibold text-gray-500 mb-2">Sequence Logo {index + 1}</p><p className='text-black text-sm p-2 border rounded-md bg-gray-100'>Sequence File</p>{lead.layouts?.[0]?.sequenceLogoUploadTimes?.[index] && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].sequenceLogoUploadTimes![index]!).dateTime}</p>}</div>))}
                                          {lead.layouts?.[0]?.sequenceBackDesign && <div className="relative w-fit"><p className="font-semibold text-gray-500 mb-2">Sequence Back</p><p className='text-black text-sm p-2 border rounded-md bg-gray-100'>Sequence File</p>{lead.layouts[0].sequenceBackDesignUploadTime && <p className='text-gray-500 text-xs mt-1'>{formatDateTime(lead.layouts[0].sequenceBackDesignUploadTime).dateTime}</p>}</div>}
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
        )}
      </CardContent>
    </Card>
  );
}


