'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { formatDateTime } from '@/lib/utils';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type OperationalCase = {
  id: string;
  joNumber: string;
  caseType: string;
  remarks: string;
  image?: string;
  submissionDateTime: string;
  customerName: string;
};

export function RecordedCasesList() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();

  const casesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'operationalCases'), orderBy('submissionDateTime', 'desc'));
  }, [firestore, user]);

  const { data: cases, isLoading: areCasesLoading, error } = useCollection<OperationalCase>(casesQuery);
  const isLoading = isAuthLoading || areCasesLoading;

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full">
      <CardHeader>
        <CardTitle>Recorded Cases</CardTitle>
        <CardDescription>A log of all submitted operational cases.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-20rem)]">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="text-destructive">Error loading cases: {error.message}</p>
          ) : cases && cases.length > 0 ? (
            <div className="space-y-4">
              {cases.map((caseItem) => (
                <Card key={caseItem.id} className="bg-gray-50">
                  <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <div className="md:col-span-1">
                      <p className="text-xs text-gray-500">Date Recorded</p>
                      <p className="text-sm font-medium">{formatDateTime(caseItem.submissionDateTime).dateTime}</p>
                      <p className="text-sm font-semibold mt-2">{caseItem.joNumber}</p>
                      <p className="text-xs text-gray-600">{caseItem.customerName}</p>
                    </div>
                    <div className="md:col-span-2">
                       <p className="text-xs text-gray-500">Case & Reason</p>
                       <p className="text-sm font-semibold text-destructive">{caseItem.caseType}</p>
                       <p className="text-sm mt-1 whitespace-pre-wrap">{caseItem.remarks}</p>
                    </div>
                    <div className="md:col-span-1 flex justify-center items-center">
                      {caseItem.image && (
                        <TooltipProvider>
                           <Tooltip>
                            <TooltipTrigger>
                               <div className="relative h-24 w-24 rounded-md overflow-hidden border">
                                <Image src={caseItem.image} alt="Case Image" layout="fill" objectFit="cover" />
                               </div>
                            </TooltipTrigger>
                            <TooltipContent className="p-0 border-0">
                               <div className="relative h-64 w-64">
                                <Image src={caseItem.image} alt="Case Image" layout="fill" objectFit="contain" />
                               </div>
                            </TooltipContent>
                           </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
                <p className="text-muted-foreground">No operational cases have been recorded yet.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
