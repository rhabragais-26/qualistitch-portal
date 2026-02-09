
'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { Download, X } from 'lucide-react';

import { useCollection, useFirestore, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

import { getStorage, ref, getBlob } from 'firebase/storage';
import { collection, query } from 'firebase/firestore';

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
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

import { toTitleCase } from '@/lib/utils';

type FileObject = {
  name: string;
  url: string;
};

type Layout = {
  finalLogoEmb?: (FileObject | null)[];
  finalBackDesignEmb?: (FileObject | null)[];
  finalLogoDst?: (FileObject | null)[];
  finalBackDesignDst?: (FileObject | null)[];
  finalNamesDst?: (FileObject | null)[];
  sequenceLogo?: (FileObject | null)[];
  sequenceBackDesign?: (FileObject | null)[];
  finalProgrammedLogo?: (FileObject | null)[];
  finalProgrammedBackDesign?: (FileObject | null)[];
};

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber?: string;
  landlineNumber?: string;
  joNumber?: number;
  layouts?: Layout[];
  isFinalProgram?: boolean;
};

const ProgramFilesDatabaseTableMemo = React.memo(function ProgramFilesDatabaseTable() {
  const firestore = useFirestore();
  const app = useFirebaseApp();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [joNumberSearch, setJoNumberSearch] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [imageInView, setImageInView] = useState<string | null>(null);

  const leadsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'leads')) : null),
    [firestore]
  );

  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery, undefined, { listen: false });

  const getContactDisplay = useCallback((lead: Lead) => {
    const mobile =
      lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline =
      lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) return `${mobile} / ${landline}`;
    return mobile || landline || null;
  }, []);

  const formatJoNumber = useCallback((joNumber: number | undefined) => {
    if (!joNumber) return '';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
  }, []);

  const handleDownload = useCallback(
    async (url: string, name: string) => {
      if (!app) {
        toast({
          variant: "destructive",
          title: "Download Failed",
          description: "Firebase app is not available.",
        });
        return;
      }
      const storage = getStorage(app);
      try {
        const fileRef = ref(storage, url);
        const blob = await getBlob(fileRef);

        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
      } catch (error: any) {
        console.error('File download failed:', error);
        toast({
          variant: 'destructive',
          title: 'Download Failed',
          description:
            error.code === 'storage/object-not-found'
              ? 'File not found. It may have been moved or deleted.'
              : error.message || 'Could not download the file. Please check permissions and network.',
        });
      }
    },
    [app, toast]
  );

  const filteredLeads = useMemo(() => {
    if (!leads) return [];

    const leadsWithFiles = leads.filter((lead) => lead.isFinalProgram);

    return leadsWithFiles.filter((lead) => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();

      const matchesSearch = searchTerm
        ? lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
          (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)) ||
          (lead.contactNumber && lead.contactNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''))) ||
          (lead.landlineNumber && lead.landlineNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, '')))
        : true;

      const joString = formatJoNumber(lead.joNumber);
      const matchesJo = joNumberSearch ? joString.toLowerCase().includes(joNumberSearch.toLowerCase()) : true;

      const lowercasedFileSearch = fileSearch.toLowerCase();
      const matchesFile = fileSearch
        ? lead.layouts?.[0]?.finalLogoDst?.some((f) => f?.name && f.name.toLowerCase().includes(lowercasedFileSearch)) ||
          lead.layouts?.[0]?.finalBackDesignDst?.some(
            (f) => f?.name && f.name.toLowerCase().includes(lowercasedFileSearch)
          ) ||
          lead.layouts?.[0]?.finalNamesDst?.some((f) => f?.name && f.name.toLowerCase().includes(lowercasedFileSearch)) ||
          lead.layouts?.[0]?.finalLogoEmb?.some((f) => f?.name && f.name.toLowerCase().includes(lowercasedFileSearch)) ||
          lead.layouts?.[0]?.finalBackDesignEmb?.some(
            (f) => f?.name && f.name.toLowerCase().includes(lowercasedFileSearch)
          )
        : true;

      return matchesSearch && matchesJo && matchesFile;
    });
  }, [leads, searchTerm, joNumberSearch, fileSearch, formatJoNumber]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading data: {error.message}</div>;
  }

  return (
    <>
      <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-black">Program Files Database</CardTitle>
              <CardDescription className="text-gray-600">
                A repository of all final program files for job orders.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-full max-w-sm">
                <Input
                  placeholder="Search customer, company or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-100 text-black placeholder:text-gray-500"
                />
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
                  placeholder="Search by DST/EMB Filename..."
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
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
                  <TableHead className="text-white font-bold align-middle text-center">Customer Details</TableHead>
                  <TableHead className="text-white font-bold align-middle text-center text-xs">J.O. No.</TableHead>
                  <TableHead className="text-white font-bold align-middle text-center">Final Logo/Back Design</TableHead>
                  <TableHead className="text-white font-bold align-middle text-center">Sequence</TableHead>
                  <TableHead className="text-white font-bold align-middle text-center">EMB Files</TableHead>
                  <TableHead className="text-white font-bold align-middle text-center">DST Files</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="align-middle py-3 text-center">
                        <div className="font-bold">{toTitleCase(lead.customerName)}</div>
                        <div className="text-xs text-gray-500">
                          {lead.companyName && lead.companyName !== '-' ? toTitleCase(lead.companyName) : ''}
                        </div>
                        <div className="text-xs text-gray-500">{getContactDisplay(lead)}</div>
                      </TableCell>

                      <TableCell className="align-middle py-3 text-center text-xs">{formatJoNumber(lead.joNumber)}</TableCell>

                      <TableCell className="align-middle py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          {lead.layouts?.[0]?.finalProgrammedLogo?.map(
                            (file, i) =>
                              file?.url && (
                                <TooltipProvider key={`fp-logo-${i}`}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className="relative w-16 h-16 border rounded-md cursor-pointer"
                                        onClick={() => setImageInView(file.url)}
                                      >
                                        <Image src={file.url} alt={`Final Program Logo ${i + 1}`} layout="fill" objectFit="contain" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Final Program Logo {i + 1}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )
                          )}

                          {lead.layouts?.[0]?.finalProgrammedBackDesign?.map(
                            (file, i) =>
                              file?.url && (
                                <TooltipProvider key={`fp-back-${i}`}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className="relative w-16 h-16 border rounded-md cursor-pointer"
                                        onClick={() => setImageInView(file.url)}
                                      >
                                        <Image
                                          src={file.url}
                                          alt={`Final Program Back Design ${i + 1}`}
                                          layout="fill"
                                          objectFit="contain"
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Final Program Back Design {i + 1}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="align-middle py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          {lead.layouts?.[0]?.sequenceLogo?.map((file: any, i) => {
                            if (!file) return null;
                            const url = typeof file === 'string' ? file : file.url;
                            if (!url) return null;

                            return (
                              <TooltipProvider key={`seq-logo-${i}`}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="relative w-16 h-16 border rounded-md cursor-pointer"
                                      onClick={() => setImageInView(url)}
                                    >
                                      <Image src={url} alt={`Sequence Logo ${i + 1}`} layout="fill" objectFit="contain" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Sequence Logo {i + 1}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}

                          {lead.layouts?.[0]?.sequenceBackDesign?.map((file: any, i) => {
                            if (!file) return null;
                            const url = typeof file === 'string' ? file : file.url;
                            if (!url) return null;

                            return (
                              <TooltipProvider key={`seq-back-${i}`}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="relative w-16 h-16 border rounded-md cursor-pointer"
                                      onClick={() => setImageInView(url)}
                                    >
                                      <Image src={url} alt={`Sequence Back Design ${i + 1}`} layout="fill" objectFit="contain" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Sequence Back Design {i + 1}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                        </div>
                      </TableCell>

                      <TableCell className="align-middle py-3 text-center">
                        <div className="flex flex-col gap-1 items-start mx-auto w-fit">
                          {lead.layouts?.[0]?.finalLogoEmb?.map(
                            (file, i) =>
                              file?.url &&
                              file?.name && (
                                <Button
                                  key={`emb-logo-${i}`}
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs"
                                  onClick={() => handleDownload(file.url, file.name)}
                                >
                                  <Download className="mr-1 h-3 w-3" /> {file.name}
                                </Button>
                              )
                          )}

                          {lead.layouts?.[0]?.finalBackDesignEmb?.map(
                            (file, i) =>
                              file?.url &&
                              file?.name && (
                                <Button
                                  key={`emb-back-${i}`}
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs"
                                  onClick={() => handleDownload(file.url, file.name)}
                                >
                                  <Download className="mr-1 h-3 w-3" /> {file.name}
                                </Button>
                              )
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="align-middle py-3 text-center">
                        <div className="flex flex-col gap-1 items-start mx-auto w-fit">
                          {lead.layouts?.[0]?.finalLogoDst?.map(
                            (file, i) =>
                              file?.url &&
                              file?.name && (
                                <Button
                                  key={`dst-logo-${i}`}
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs"
                                  onClick={() => handleDownload(file.url, file.name)}
                                >
                                  <Download className="mr-1 h-3 w-3" /> {file.name}
                                </Button>
                              )
                          )}

                          {lead.layouts?.[0]?.finalBackDesignDst?.map(
                            (file, i) =>
                              file?.url &&
                              file?.name && (
                                <Button
                                  key={`dst-back-${i}`}
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs"
                                  onClick={() => handleDownload(file.url, file.name)}
                                >
                                  <Download className="mr-1 h-3 w-3" /> {file.name}
                                </Button>
                              )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No program files found.
                    </TableCell>
                  </TableRow>
                )}
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
});

ProgramFilesDatabaseTableMemo.displayName = 'ProgramFilesDatabaseTable';

export { ProgramFilesDatabaseTableMemo as ProgramFilesDatabaseTable };

    