
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
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  quantity?: number;
  isArchived?: boolean;
  isDeleted?: boolean;
};

type ResolvedCasesDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  archivedCases: OperationalCase[];
  deletedCases: OperationalCase[];
  onReopenCase: (caseItem: OperationalCase, reopeningRemarks: string) => void;
};

export function ResolvedCasesDialog({ isOpen, onClose, archivedCases, deletedCases, onReopenCase }: ResolvedCasesDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [caseToReopen, setCaseToReopen] = useState<OperationalCase | null>(null);
  const [reopeningRemarks, setReopeningRemarks] = useState('');

  const filterCases = (cases: OperationalCase[]) => {
    return cases.filter(c =>
      c.joNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  const handleReopenConfirm = () => {
    if (caseToReopen) {
      onReopenCase(caseToReopen, reopeningRemarks);
      setCaseToReopen(null);
      setReopeningRemarks('');
      onClose(); // Close the main dialog after confirmation
    }
  };

  const renderCaseList = (cases: OperationalCase[], listType: 'resolved' | 'deleted') => (
     <ScrollArea className="h-full pr-6">
      <div className="space-y-4">
        {cases.length > 0 ? (
          cases.map((caseItem) => (
            <Card key={caseItem.id} className="bg-gray-50">
              <CardContent className="p-4 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-3">
                  <p className="text-xs text-gray-500">{listType === 'resolved' ? 'Date Resolved' : 'Date Deleted'}</p>
                  <p className="text-sm font-medium">{formatDateTime(caseItem.submissionDateTime).dateTime}</p>
                  <p className="text-sm font-semibold mt-2">{caseItem.joNumber}</p>
                  <p className="text-xs text-gray-600">{caseItem.customerName}</p>
                </div>
                <div className="col-span-5 self-start pt-2">
                    <p className="text-xs text-gray-500">Case & Remarks</p>
                    <p className="text-sm font-semibold text-destructive">{caseItem.caseType}</p>
                    {caseItem.quantity && <p className="text-sm font-semibold">Quantity: {caseItem.quantity}</p>}
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
            <p className="text-muted-foreground">No {listType} cases found.</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Previous Cases</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="resolved" className="flex flex-col flex-grow mt-4">
            <div className="flex-shrink-0 flex justify-between items-center pb-4">
                <TabsList>
                    <TabsTrigger value="resolved">Resolved</TabsTrigger>
                    <TabsTrigger value="deleted">Deleted</TabsTrigger>
                </TabsList>
                <div className="w-1/2">
                    <Input
                        placeholder="Search by J.O. number or customer name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex-grow overflow-hidden">
                <TabsContent value="resolved" className="h-full mt-0">
                    {renderCaseList(filterCases(archivedCases), 'resolved')}
                </TabsContent>
                <TabsContent value="deleted" className="h-full mt-0">
                    {renderCaseList(filterCases(deletedCases), 'deleted')}
                </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="flex-shrink-0 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {caseToReopen && (
        <AlertDialog open={!!caseToReopen} onOpenChange={(isOpen) => {
          if (!isOpen) {
            setCaseToReopen(null);
            setReopeningRemarks('');
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reopen Case for J.O. {caseToReopen.joNumber}?</AlertDialogTitle>
              <AlertDialogDescription>
                You can add optional remarks for reopening this case.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="reopening-remarks">Reopening Remarks (Optional)</Label>
              <Textarea
                id="reopening-remarks"
                value={reopeningRemarks}
                onChange={(e) => setReopeningRemarks(e.target.value)}
                placeholder="Enter remarks here..."
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setCaseToReopen(null);
                setReopeningRemarks('');
              }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReopenConfirm}>Reopen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
