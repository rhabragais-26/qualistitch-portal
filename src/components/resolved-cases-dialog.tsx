'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent } from './ui/card';
import { formatDateTime } from '@/lib/utils';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

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
  isArchived?: boolean;
};

type ResolvedCasesDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  archivedCases: OperationalCase[];
  onReopenCase: (caseId: string) => void;
};

export function ResolvedCasesDialog({ isOpen, onClose, archivedCases, onReopenCase }: ResolvedCasesDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [caseToReopen, setCaseToReopen] = useState<OperationalCase | null>(null);

  const filteredCases = archivedCases.filter(c =>
    c.joNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleReopenConfirm = () => {
    if (caseToReopen) {
      onReopenCase(caseToReopen.id);
      setCaseToReopen(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Resolved Cases</DialogTitle>
          </DialogHeader>
          <div className="flex-shrink-0 py-4">
            <Input
              placeholder="Search by J.O. number or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-full pr-6">
              <div className="space-y-4">
                {filteredCases.length > 0 ? (
                  filteredCases.map((caseItem) => (
                    <Card key={caseItem.id} className="bg-gray-50">
                      <CardContent className="p-4 grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-3">
                          <p className="text-xs text-gray-500">Date Resolved</p>
                          <p className="text-sm font-medium">{formatDateTime(caseItem.submissionDateTime).dateTime}</p>
                          <p className="text-sm font-semibold mt-2">{caseItem.joNumber}</p>
                          <p className="text-xs text-gray-600">{caseItem.customerName}</p>
                        </div>
                        <div className="col-span-5 self-start pt-2">
                           <p className="text-xs text-gray-500">Case & Remarks</p>
                           <p className="text-sm font-semibold text-destructive">{caseItem.caseType}</p>
                           <p className="text-sm mt-1 whitespace-pre-wrap">{caseItem.remarks}</p>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          {caseItem.image && (
                            <div className="relative h-24 w-24 rounded-md border overflow-hidden">
                              <Image src={caseItem.image} alt="Case Image" layout="fill" objectFit="cover" />
                            </div>
                          )}
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <Button variant="outline" onClick={() => setCaseToReopen(caseItem)}>Reopen Case</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-48">
                    <p className="text-muted-foreground">No resolved cases found.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {caseToReopen && (
        <AlertDialog open={!!caseToReopen} onOpenChange={(isOpen) => !isOpen && setCaseToReopen(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to reopen this case?</AlertDialogTitle>
              <AlertDialogDescription>
                This will move the case for J.O. {caseToReopen.joNumber} back to the active cases list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCaseToReopen(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReopenConfirm}>Reopen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
