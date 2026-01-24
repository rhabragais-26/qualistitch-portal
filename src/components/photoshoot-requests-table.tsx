'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, doc, updateDoc, setDoc } from 'firebase/firestore';
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
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { formatJoNumber } from '@/lib/utils';
import { Badge } from './ui/badge';
import { X } from 'lucide-react';

type FileObject = {
  name: string;
  url: string;
};

type Layout = {
  layoutImage?: string | null;
  testLogoLeftImage?: string | null;
  testLogoRightImage?: string | null;
  testBackLogoImage?: string | null;
  testBackDesignImage?: string | null;
  finalProgrammedLogo?: (FileObject | null)[];
  finalProgrammedBackDesign?: (FileObject | null)[];
};

type Lead = {
  id: string;
  joNumber?: number;
  deliveryDate?: string;
  submissionDateTime: string;
  priorityType: 'Rush' | 'Regular';
  isSentToProduction?: boolean;
  isCutting?: boolean;
  isEmbroideryDone?: boolean;
  isSewing?: boolean;
  isDone?: boolean;
  isEndorsedToLogistics?: boolean;
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  shippedTimestamp?: string;
  layouts?: Layout[];
  photoshootDate?: string;
};

const PhotoshootRequestsTable = () => {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

  const [photoshootDates, setPhotoshootDates] = useState<Record<string, string>>({});
  const [imageInView, setImageInView] = useState<string | null>(null);

  useEffect(() => {
    if (leads) {
        const initialDates = leads.reduce((acc, lead) => {
            if (lead.photoshootDate) {
                acc[lead.id] = format(new Date(lead.photoshootDate), 'yyyy-MM-dd');
            }
            return acc;
        }, {} as Record<string, string>);
        setPhotoshootDates(initialDates);
    }
  }, [leads]);


  const getProductionStatus = useCallback((lead: Lead): { text: string; variant: "success" | "warning" | "secondary" | "default" | "destructive" } => {
    if (lead.shipmentStatus === 'Delivered') return { text: "Delivered", variant: "success" };
    if (lead.shipmentStatus === 'Shipped') return { text: "Shipped", variant: "success" };
    if (lead.isEndorsedToLogistics) return { text: "With Logistics", variant: "default" };
    if (lead.isDone) return { text: "Done Production", variant: "success" };
    if (lead.isSewing) return { text: "Sewing", variant: "warning" };
    if (lead.isEmbroideryDone) return { text: "Embroidery Done", variant: "warning" };
    if(lead.isCutting) return { text: "Cutting", variant: "warning" };
    if (lead.isSentToProduction) return { text: "In Production", variant: "warning" };
    return { text: "Pending Production", variant: "secondary" };
  }, []);
  
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(lead => 
      lead.joNumber &&
      lead.layouts &&
      lead.layouts.some(layout => 
        (layout.testLogoLeftImage || layout.testLogoRightImage || layout.testBackLogoImage || layout.testBackDesignImage) &&
        (layout.finalProgrammedLogo?.some(f => f?.url) || layout.finalProgrammedBackDesign?.some(f => f?.url))
      )
    ).sort((a, b) => new Date(b.submissionDateTime).getTime() - new Date(a.submissionDateTime).getTime());
  }, [leads]);
  
  const handleDateChange = (leadId: string, date: string) => {
    setPhotoshootDates(prev => ({ ...prev, [leadId]: date }));
  };

  const handleSendRequest = async (leadId: string) => {
    const photoshootDate = photoshootDates[leadId];
    if (!photoshootDate || !firestore || !userProfile) return;

    const lead = leads?.find(l => l.id === leadId);
    if (!lead) return;

    // Firestore write for the lead document
    const leadDocRef = doc(firestore, 'leads', leadId);
    const leadUpdatePromise = updateDoc(leadDocRef, {
        photoshootDate: new Date(photoshootDate).toISOString(),
    });

    // Firestore write for the marketing calendar
    const eventId = `photoshoot-${lead.id}`;
    const calendarDocRef = doc(firestore, 'marketingCalendar', eventId);
    const calendarEventData = {
        id: eventId,
        date: new Date(photoshootDate).toISOString(),
        content: `Photoshoot for ${formatJoNumber(lead.joNumber)}`,
        imageUrl: lead.layouts?.[0]?.layoutImage || null,
        uploadedBy: userProfile.nickname,
    };
    const calendarUpdatePromise = setDoc(calendarDocRef, calendarEventData, { merge: true });

    try {
        await Promise.all([leadUpdatePromise, calendarUpdatePromise]);
        toast({
            title: 'Photoshoot Requested',
            description: `A photoshoot has been scheduled for ${format(new Date(photoshootDate), 'MMMM dd, yyyy')}.`,
        });
    } catch (e: any) {
        toast({
            variant: 'destructive',
            title: 'Request Failed',
            description: e.message || 'Could not schedule the photoshoot.',
        });
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading data: {error.message}</div>;
  }

  return (
    <>
      <Card className="w-full shadow-xl">
        <CardHeader>
          <CardTitle>Photoshoot Requests</CardTitle>
          <CardDescription>Schedule photoshoots for orders with final program designs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-neutral-800">
                <TableRow>
                  <TableHead className="text-white">J.O. Number</TableHead>
                  <TableHead className="text-white">Production Status</TableHead>
                  <TableHead className="text-white">Expected Delivery</TableHead>
                  <TableHead className="text-white text-center">Layout</TableHead>
                  <TableHead className="text-white text-center">Test Designs</TableHead>
                  <TableHead className="text-white text-center">Final Program Designs</TableHead>
                  <TableHead className="text-white text-center">Set Photoshoot Date</TableHead>
                  <TableHead className="text-white text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map(lead => {
                  const status = getProductionStatus(lead);
                  const deliveryDate = lead.deliveryDate ? new Date(lead.deliveryDate) : new Date(lead.submissionDateTime);
                  const layout = lead.layouts?.[0];
                  
                  const isSent = !!lead.photoshootDate;
                  const currentDate = photoshootDates[lead.id] || '';
                  const savedDate = lead.photoshootDate ? format(new Date(lead.photoshootDate), 'yyyy-MM-dd') : '';
                  const hasDateChanged = isSent && currentDate !== savedDate && currentDate !== '';

                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{formatJoNumber(lead.joNumber)}</TableCell>
                      <TableCell><Badge variant={status.variant}>{status.text}</Badge></TableCell>
                      <TableCell>{format(deliveryDate, 'MMM dd, yyyy')}</TableCell>
                       <TableCell className="text-center">
                        {layout?.layoutImage ? (
                          <div className="relative w-16 h-16 mx-auto border rounded-md cursor-pointer" onClick={() => setImageInView(layout.layoutImage!)}>
                            <Image src={layout.layoutImage} alt="Layout" layout="fill" objectFit="contain" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          {layout?.testLogoLeftImage && <Image src={layout.testLogoLeftImage} alt="Test Logo" width={40} height={40} className="rounded-md cursor-pointer" onClick={() => setImageInView(layout.testLogoLeftImage!)} />}
                          {layout?.testBackDesignImage && <Image src={layout.testBackDesignImage} alt="Test Back Design" width={40} height={40} className="rounded-md cursor-pointer" onClick={() => setImageInView(layout.testBackDesignImage!)} />}
                        </div>
                      </TableCell>
                       <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          {layout?.finalProgrammedLogo?.map((f, i) => f?.url && <Image key={i} src={f.url} alt="Final Logo" width={40} height={40} className="rounded-md cursor-pointer" onClick={() => setImageInView(f.url)} />)}
                          {layout?.finalProgrammedBackDesign?.map((f, i) => f?.url && <Image key={i} src={f.url} alt="Final Back Design" width={40} height={40} className="rounded-md cursor-pointer" onClick={() => setImageInView(f.url)} />)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="date"
                          className="w-[150px] mx-auto"
                          value={photoshootDates[lead.id] || ''}
                          onChange={(e) => handleDateChange(lead.id, e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                         {isSent && !hasDateChanged ? (
                            <div className="flex flex-col items-center gap-1">
                                <Button size="sm" disabled className="bg-green-600 text-white">Sent</Button>
                                <span className="text-xs text-muted-foreground">{format(new Date(savedDate), 'MMM dd, yyyy')}</span>
                            </div>
                        ) : (
                            <Button
                                size="sm"
                                onClick={() => handleSendRequest(lead.id)}
                                disabled={!currentDate}
                                className="group"
                            >
                                {isSent && hasDateChanged ? (
                                    <>
                                        <span className="group-hover:hidden">Sent</span>
                                        <span className="hidden group-hover:inline">Resend</span>
                                    </>
                                ) : (
                                    'Send Request'
                                )}
                            </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
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
    </>
  );
};

export { PhotoshootRequestsTable };