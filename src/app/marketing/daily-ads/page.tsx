'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, collection, query, orderBy, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Trash2, Upload, PlusCircle, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';
import { Label } from '@/components/ui/label';

type AdImage = {
  name: string;
  url: string;
};

type DailyAd = {
    id: string;
    date: string;
    adAccount: string;
    images: AdImage[];
    submittedBy: string;
    timestamp: string;
};

const formSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  adAccount: z.string().min(1, 'AD Account is required.'),
});

type FormValues = z.infer<typeof formSchema>;

const adAccountOptions = ["Personal Account", "AD Account 101", "AD Account 102"];

type ImageState = {
  id: string;
  name: string;
  file: File | null;
  previewUrl?: string;
  existingUrl?: string;
};


function DailyAdsPage() {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [editingAd, setEditingAd] = useState<DailyAd | null>(null);
  const [deletingAd, setDeletingAd] = useState<DailyAd | null>(null);
  
  const dailyAdsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'dailyAds'), orderBy('timestamp', 'desc')) : null, [firestore]);
  const { data: dailyAds, isLoading, error, refetch } = useCollection<DailyAd>(dailyAdsQuery, undefined, { listen: false });

  const [images, setImages] = useState<ImageState[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      adAccount: '',
    },
  });
  
  const handleFormReset = useCallback(() => {
    form.reset({ date: new Date(), adAccount: '' });
    setImages([]);
    setEditingAd(null);
  }, [form]);

  useEffect(() => {
    if (editingAd) {
      form.reset({
        date: new Date(editingAd.date),
        adAccount: editingAd.adAccount,
      });
      setImages(editingAd.images.map(img => ({ id: uuidv4(), name: img.name, file: null, existingUrl: img.url, previewUrl: img.url })));
    } else {
      handleFormReset();
    }
  }, [editingAd, form, handleFormReset]);

  const addImageInput = () => {
    setImages(prev => [...prev, { id: uuidv4(), name: '', file: null }]);
  };

  const removeImageInput = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };
  
  const handleImageFileChange = (id: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        setImages(prev => prev.map(img => img.id === id ? { ...img, file, previewUrl: e.target?.result as string } : img));
    };
    reader.readAsDataURL(file);
  };
  
  const handleImageNameChange = (id: string, name: string) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, name } : img));
  };


  async function onSubmit(values: FormValues) {
    if (!firestore || !userProfile) return;
    if (images.length === 0 || images.every(img => !img.file && !img.existingUrl)) {
        toast({ variant: 'destructive', title: 'No Images', description: 'Please upload at least one image.' });
        return;
    }

    const storage = getStorage();
    const adId = editingAd?.id || uuidv4();

    try {
        const uploadedImages = await Promise.all(images.map(async (image) => {
            if (image.file) { // New or replaced image
                const storageRef = ref(storage, `dailyAds/${adId}/${uuidv4()}-${image.file.name}`);
                const snapshot = await uploadString(storageRef, image.previewUrl!, 'data_url');
                const url = await getDownloadURL(snapshot.ref);
                return { name: image.name, url };
            } else if (image.existingUrl) { // Unchanged existing image
                return { name: image.name, url: image.existingUrl };
            }
            return null;
        }));

        const finalImages = uploadedImages.filter((img): img is AdImage => img !== null);
        
        const dataToSave = {
            date: values.date.toISOString(),
            adAccount: values.adAccount,
            images: finalImages,
            submittedBy: userProfile.nickname,
            timestamp: new Date().toISOString(),
        };

        const adDocRef = doc(firestore, 'dailyAds', adId);
        
        if (editingAd) {
            await updateDoc(adDocRef, dataToSave);
            toast({ title: 'Success!', description: 'Daily ad has been updated.' });
        } else {
            await setDoc(adDocRef, { ...dataToSave, id: adId });
            toast({ title: 'Success!', description: 'Daily ad has been recorded.' });
        }
        
        handleFormReset();
        refetch();

    } catch (e: any) {
        toast({ variant: "destructive", title: "Save Failed", description: e.message });
    }
  }

  const confirmDelete = async () => {
    if (!deletingAd || !firestore) return;
    try {
        await deleteDoc(doc(firestore, 'dailyAds', deletingAd.id));
        toast({ title: 'Success!', description: 'Entry has been deleted.' });
        setDeletingAd(null);
        refetch();
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  return (
    <Header>
      <main className="flex-1 w-full py-4 sm:py-6 lg:py-8 px-8 sm:px-12 lg:px-16">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
          <div className="xl:col-span-2">
            <Card className="max-w-xl mx-auto">
              <CardHeader>
                <CardTitle>{editingAd ? 'Edit' : 'Record'} Daily Ads</CardTitle>
                <CardDescription>{editingAd ? 'Update the details below.' : 'Log your daily ad creatives here.'}</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="date" render={({ field }) => (
                          <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" value={format(field.value, 'yyyy-MM-dd')} onChange={(e) => field.onChange(new Date(`${e.target.value}T00:00:00`))} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="adAccount" render={({ field }) => (
                          <FormItem>
                            <FormLabel>AD Account</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger></FormControl>
                                <SelectContent>{adAccountOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                    </div>
                    
                    <div className="space-y-4">
                        <Label>Ad Creatives</Label>
                        <ScrollArea className="h-64 border rounded-md p-4">
                            <div className="space-y-4">
                                {images.map((image, index) => (
                                    <div key={image.id} className="flex items-start gap-2 p-2">
                                        {image.previewUrl ? (
                                            <div className="relative w-20 h-20 flex-shrink-0">
                                                <Image src={image.previewUrl} alt={`preview ${index}`} layout="fill" objectFit="cover" className="rounded-md" />
                                            </div>
                                        ) : <div className="w-20 h-20 bg-muted rounded-md flex-shrink-0" />}
                                        <div className="flex-grow space-y-1">
                                            <Input placeholder="Image Name / Title" value={image.name} onChange={e => handleImageNameChange(image.id, e.target.value)} />
                                            <Input type="file" accept="image/*" onChange={e => handleImageFileChange(image.id, e.target.files ? e.target.files[0] : null)} className="text-xs"/>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8 mt-1" onClick={() => removeImageInput(image.id)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" className="w-full" onClick={addImageInput}>
                                    <PlusCircle className="mr-2 h-4 w-4"/> Add Image
                                </Button>
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="flex justify-end gap-2">
                      {editingAd && <Button type="button" variant="outline" onClick={handleFormReset}>Cancel</Button>}
                      <Button type="submit">{editingAd ? 'Save Changes' : 'Record Ad'}</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          <div className="xl:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Recent Ads</CardTitle>
                <CardDescription>A log of all recorded daily ads.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md h-[75vh] overflow-y-auto modern-scrollbar">
                  <Table>
                    <TableHeader className="sticky top-0 bg-neutral-800 z-10">
                      <TableRow>
                        <TableHead className="text-center text-white font-bold">Date</TableHead>
                        <TableHead className="text-white font-bold">Ad Account</TableHead>
                        <TableHead className="text-white font-bold">Creatives</TableHead>
                        <TableHead className="text-center text-white font-bold">Submitted By</TableHead>
                        <TableHead className="text-center text-white font-bold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? [...Array(3)].map((_, i) => (<TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-24 w-full" /></TableCell></TableRow>))
                        : error ? <TableRow><TableCell colSpan={5} className="text-center text-destructive">Error: {error.message}</TableCell></TableRow>
                        : dailyAds && dailyAds.length > 0 ? dailyAds.map(ad => (
                          <TableRow key={ad.id}>
                            <TableCell className="text-center text-xs">{format(new Date(ad.date), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="text-xs">{ad.adAccount}</TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-2">
                                    {ad.images.map((img, idx) => (
                                        <div key={idx} className="flex flex-col items-center gap-1">
                                            <div className="relative w-16 h-16 border rounded-md">
                                                <Image src={img.url} alt={img.name} layout="fill" objectFit="contain" />
                                            </div>
                                            <p className="text-[10px] w-16 truncate text-center">{img.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </TableCell>
                            <TableCell className="text-center text-xs">{ad.submittedBy}</TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="icon" onClick={() => setEditingAd(ad)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingAd(ad)}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))
                        : <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No ads recorded yet.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <AlertDialog open={!!deletingAd} onOpenChange={() => setDeletingAd(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the ad record for this day.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Header>
  );
}

export default DailyAdsPage;
