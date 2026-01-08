
'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { formatDateTime } from '@/lib/utils';
import Image from 'next/image';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Trash2, ArchiveRestore, Edit, Check, X } from 'lucide-react';
import { ResolvedCasesDialog } from './resolved-cases-dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type CaseItem = {
    productType: string;
    color: string;
    size: string;
    quantity: number;
}

type OperationalCase = {
  id: string;
  joNumber: string;
  caseType: string;
  remarks: string;
  image?: string;
  submissionDateTime: string;
  customerName: string;
  contactNumber?: string;
  landlineNumber?: string;
  caseItems: CaseItem[];
  quantity?: number;
  isArchived?: boolean;
  isDeleted?: boolean;
};

type RecordedCasesListProps = {
  onEdit: (caseItem: OperationalCase) => void;
};

export function RecordedCasesList({ onEdit }: RecordedCasesListProps) {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [caseToResolve, setCaseToResolve] = useState<OperationalCase | null>(null);
  const [caseToDelete, setCaseToDelete] = useState<OperationalCase | null>(null);
  const [imageInView, setImageInView] = useState<string | null>(null);
  const [isResolvedCasesOpen, setIsResolvedCasesOpen] = useState(false);
  const [popoverStates, setPopoverStates] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();

  const casesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'operationalCases'), orderBy('submissionDateTime', 'desc'));
  }, [firestore, user]);

  const { data: cases, isLoading: areCasesLoading, error } = useCollection<OperationalCase>(casesQuery);
  const isLoading = isAuthLoading || areCasesLoading;

  const getContactDisplay = (caseItem: OperationalCase) => {
    const mobile = caseItem.contactNumber && caseItem.contactNumber !== '-' ? caseItem.contactNumber.replace(/-/g, '') : null;
    const landline = caseItem.landlineNumber && caseItem.landlineNumber !== '-' ? caseItem.landlineNumber.replace(/-/g, '') : null;
    if (mobile && landline) return `${mobile} / ${landline}`;
    return mobile || landline || '';
  };

  const handleResolveCase = async () => {
    if (!caseToResolve || !firestore) return;
    try {
      const caseDocRef = doc(firestore, 'operationalCases', caseToResolve.id);
      await updateDoc(caseDocRef, { isArchived: true });
      toast({
        title: "Case Resolved",
        description: `Case for J.O. ${caseToResolve.joNumber} has been archived.`,
      });
      setCaseToResolve(null);
    } catch (e: any) {
      console.error("Error resolving case: ", e);
      toast({
        variant: "destructive",
        title: "Resolution Failed",
        description: e.message || "Could not resolve the case.",
      });
    }
  };

  const handleDeleteCase = async () => {
    if (!caseToDelete || !firestore) return;
    try {
      const caseDocRef = doc(firestore, 'operationalCases', caseToDelete.id);
      await updateDoc(caseDocRef, { isDeleted: true });
      toast({
        title: "Case Deleted",
        description: `Case for J.O. ${caseToDelete.joNumber} has been moved to the deleted list.`,
      });
      setCaseToDelete(null);
    } catch (e: any) {
      console.error("Error deleting case: ", e);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: e.message || "Could not delete the case.",
      });
    }
  };
  
  const handleReopenCase = async (caseItem: OperationalCase, reopeningRemarks: string) => {
    if (!firestore) return;
    try {
      const caseDocRef = doc(firestore, 'operationalCases', caseItem.id);
      
      let newRemarks = caseItem.remarks;
      if (reopeningRemarks.trim()) {
        newRemarks = `${caseItem.remarks}\n\nReopening Remarks:\n(${reopeningRemarks})`;
      }
      
      await updateDoc(caseDocRef, { 
        isArchived: false,
        isDeleted: false,
        remarks: newRemarks,
      });

      toast({
        title: "Case Reopened",
        description: "The case has been moved back to the active list.",
      });
    } catch (e: any) {
      console.error("Error reopening case: ", e);
      toast({
        variant: "destructive",
        title: "Reopen Failed",
        description: e.message || "Could not reopen the case.",
      });
    }
  };


  const activeCases = cases?.filter(c => !c.isArchived && !c.isDeleted);
  const archivedCases = cases?.filter(c => c.isArchived && !c.isDeleted);
  const deletedCases = cases?.filter(c => c.isDeleted);


  return (
    <>
      <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Recorded Cases</CardTitle>
            <CardDescription>A log of all submitted operational cases.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => setIsResolvedCasesOpen(true)}>
             <ArchiveRestore className="mr-2 h-4 w-4" />
             View Previous Cases
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-17rem)] pr-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : error ? (
              <p className="text-destructive">Error loading cases: {error.message}</p>
            ) : activeCases && activeCases.length > 0 ? (
              <div className="space-y-4">
                {activeCases.map((caseItem) => {
                  const totalQuantity = caseItem.caseItems?.reduce((sum, item) => sum + item.quantity, 0) || caseItem.quantity || 0;
                  return (
                    <Card key={caseItem.id} className="bg-gray-50">
                      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-3">
                          <p className="text-xs text-gray-500">Date Recorded</p>
                          <p className="text-sm font-medium">{formatDateTime(caseItem.submissionDateTime).dateTime}</p>
                          <p className="text-sm font-semibold mt-2">{caseItem.joNumber}</p>
                          <p className="text-xs text-gray-600">{caseItem.customerName}</p>
                          <p className="text-xs text-gray-500">{getContactDisplay(caseItem)}</p>
                        </div>
                        <div className="md:col-span-5 self-start pt-2">
                          <p className="text-xs text-gray-500">Case & Remarks/Reason</p>
                          <p className="text-sm font-semibold text-destructive">{caseItem.caseType}</p>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                  <p className="text-sm font-semibold cursor-pointer">Total Quantity: {totalQuantity}</p>
                              </TooltipTrigger>
                              <TooltipContent>
                                  <div className="p-2 text-xs">
                                      <h4 className="font-bold mb-2">Item Breakdown</h4>
                                      <ul className="list-disc pl-4 space-y-1">
                                          {caseItem.caseItems?.map(item => (
                                              <li key={item.id}>{item.quantity}x {item.productType} ({item.color}, {item.size})</li>
                                          ))}
                                      </ul>
                                  </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <p className="text-sm mt-1 whitespace-pre-wrap">
                            {caseItem.remarks && caseItem.remarks.split('\n').map((line, index) => {
                                  if (line.startsWith('(') && line.endsWith(')')) {
                                      return <i key={index} className="block">{line}</i>;
                                  }
                                  return <span key={index} className="block">{line.charAt(0).toUpperCase() + line.slice(1)}</span>;
                             })}
                          </p>
                        </div>
                        <div className="md:col-span-2 flex justify-center items-center">
                          {caseItem.image && (
                             <Popover open={popoverStates[caseItem.id] || false} onOpenChange={(isOpen) => setPopoverStates(prev => ({ ...prev, [caseItem.id]: isOpen }))}>
                              <PopoverTrigger
                                asChild
                                onMouseEnter={() => setPopoverStates(prev => ({ ...prev, [caseItem.id]: true }))}
                                onMouseLeave={() => setPopoverStates(prev => ({ ...prev, [caseItem.id]: false }))}
                              >
                                <div
                                  className="relative h-24 w-24 rounded-md overflow-hidden border cursor-pointer"
                                  onClick={() => setImageInView(caseItem.image!)}
                                >
                                  <Image src={caseItem.image} alt="Case Image" layout="fill" objectFit="cover" />
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                 <div className="relative h-64 w-full rounded-md overflow-hidden">
                                  <Image src={caseItem.image} alt="Case Image Preview" layout="fill" objectFit="contain" />
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <div className="md:col-span-2 flex flex-col items-center justify-center gap-2">
                           <Button
                            size="sm"
                            onClick={() => setCaseToResolve(caseItem)}
                            className="shadow-md transition-transform active:scale-95 text-white font-bold w-full"
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Resolved
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(caseItem)}
                            className="shadow-md transition-transform active:scale-95 font-bold w-full"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCaseToDelete(caseItem)}
                            className="shadow-md transition-transform active:scale-95 font-bold w-full text-red-500 border-red-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48">
                  <p className="text-muted-foreground">No operational cases have been recorded yet.</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
      {caseToResolve && (
          <AlertDialog open={!!caseToResolve} onOpenChange={(isOpen) => !isOpen && setCaseToResolve(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This will mark the case for J.O. {caseToResolve.joNumber} as resolved and remove it from this list. This action cannot be undone.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResolveCase}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      )}
      {caseToDelete && (
          <AlertDialog open={!!caseToDelete} onOpenChange={(isOpen) => !isOpen && setCaseToDelete(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Delete this case?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This action cannot be undone. This will move the case for J.O. {caseToDelete.joNumber} to the deleted list.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteCase}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      )}
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
       {cases && (
        <ResolvedCasesDialog
          isOpen={isResolvedCasesOpen}
          onClose={() => setIsResolvedCasesOpen(false)}
          archivedCases={archivedCases || []}
          deletedCases={deletedCases || []}
          onReopenCase={handleReopenCase}
        />
      )}
    </>
  );
}

    