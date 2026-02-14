
'use client';

    import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
    import { collection, doc, query, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
    import { useParams, useRouter, usePathname } from 'next/navigation';
    import { Button } from '@/components/ui/button';
    import { Printer, Save, X, ArrowLeft, ArrowRight, Plus, Trash2, Upload } from 'lucide-react';
    import { format, addDays } from 'date-fns';
    import { Skeleton } from '@/components/ui/skeleton';
    import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Checkbox } from '@/components/ui/checkbox';
    import { Textarea } from '@/components/ui/textarea';
    import { useToast } from '@/hooks/use-toast';
    import { Input } from '@/components/ui/input';
    import { cn, formatDateTime, toTitleCase } from '@/lib/utils';
    import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
    import Image from 'next/image';
    import { v4 as uuidv4 } from 'uuid';
    import { hasEditPermission } from '@/lib/permissions';
    import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

    type DesignDetails = {
      left?: boolean;
      right?: boolean;
      backLogo?: boolean;
      backText?: boolean;
    };

    type Order = {
      productType: string;
      color: string;
      size: string;
      quantity: number;
      remarks?: string;
      design?: DesignDetails;
    };

    type NamedOrder = {
      id: string;
      name: string;
      color: string;
      size: string;
      quantity: number;
      backText: string;
    }

    type FileObject = {
      name: string;
      url: string;
    };
    
    type Layout = {
      id: string;
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
      sequenceBackDesignUploadedBy?: string | null;
      finalProgrammedLogo?: (FileObject | null)[];
      finalProgrammedLogoUploadTimes?: (string | null)[];
      finalProgrammedLogoUploadedBy?: (string | null)[];
      finalProgrammedBackDesign?: (FileObject | null)[];
      finalProgrammedBackDesignUploadTimes?: (string | null)[];
      finalProgrammedBackDesignUploadedBy?: (string | null)[];
    }
    

    type Lead = {
      id: string;
      customerName: string;
      recipientName?: string;
      companyName?: string;
      contactNumber: string;
      contactNumber2?: string;
      landlineNumber?: string;
      location: string;
      salesRepresentative: string;
      scesFullName?: string;
      priorityType: 'Rush' | 'Regular';
      paymentType: string;
      orderType: string;
      orders: Order[];
      submissionDateTime: string;
      deliveryDate?: string;
      courier: string;
      joNumber?: number;
      layouts?: Layout[];
      publiclyPrintable?: boolean;
      lastModifiedBy?: string;
      importantNotes?: string;
    };

    const courierOptions = ['Lalamove', 'J&T', 'LBC', 'In-house', 'Pick-up', 'DHL', 'FedEx'];

    type UserProfileInfo = {
      uid: string;
      firstName: string;
      lastName: string;
      nickname: string;
    };

    const ImageDisplayCard = ({ title, images, onImageClick }: { title: string; images: { src: string; label: string; timestamp?: string | null; uploadedBy?: string | null }[], onImageClick: (src: string) => void }) => {
      if (images.length === 0) return null;
  
      return (
          <Card className="bg-white">
              <CardHeader className="p-2"><CardTitle className="text-sm text-center">{title}</CardTitle></CardHeader>
              <CardContent className="flex gap-4 text-xs p-2 flex-wrap">
                  {images.map((img, index) => (
                      <div key={index} className="flex flex-col items-center text-center w-28">
                          <p className="font-semibold text-gray-500 mb-1 text-xs truncate w-full" title={img.label}>{img.label}</p>
                          <div className="relative w-24 h-24 border rounded-md cursor-pointer" onClick={() => onImageClick(img.src)}>
                              <Image src={img.src} alt={img.label} layout="fill" objectFit="contain" />
                          </div>
                          {img.timestamp && <p className='text-gray-500 text-[10px] mt-1'>{formatDateTime(img.timestamp).dateTimeShort}</p>}
                          {img.uploadedBy && <p className='text-gray-500 text-[10px] font-bold'>by {img.uploadedBy}</p>}
                      </div>
                  ))}
              </CardContent>
          </Card>
      );
    };


    export default function JobOrderPage() {
      const params = useParams();
      const id = useMemo(() => (params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : ''), [params]);
      const firestore = useFirestore();
      const { toast } = useToast();
      const router = useRouter();
      const { userProfile } = useUser();
      const pathname = usePathname();
      const canEdit = hasEditPermission(userProfile?.position as any, `/job-order`);
      const storage = getStorage();
      
      const [currentPage, setCurrentPage] = useState(0);
      const [imageInView, setImageInView] = useState<string | null>(null);

      const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
      const { data: allLeads, isLoading: areAllLeadsLoading } = useCollection<Lead>(leadsQuery, undefined, { listen: false });
      
      const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
      const { data: users, isLoading: areUsersLoading } = useCollection<UserProfileInfo>(usersQuery, undefined, { listen: false });

      const leadRef = useMemoFirebase(
        () => (firestore && id ? doc(firestore, 'leads', id as string) : null),
        [firestore, id]
      );

      const { data: fetchedLead, isLoading: isLeadLoading, error, refetch: refetchLead } = useDoc<Lead>(leadRef);
      const [lead, setLead] = useState<Lead | null>(null);
      const [deliveryDate, setDeliveryDate] = useState<string>('');
      const [showConfirmDialog, setShowConfirmDialog] = useState(false);
      const textareaRef = useRef<HTMLTextAreaElement>(null);
      const layoutImageUploadRef = useRef<HTMLInputElement>(null);
      
      const totalPages = 1 + (lead?.layouts?.length || 0);

      const handleLayoutChange = useCallback((layoutIndex: number, field: keyof Layout, value: any) => {
        if (lead && lead.layouts) {
          const newLayouts = [...lead.layouts];
          const updatedLayout = { ...newLayouts[layoutIndex] };
          (updatedLayout as any)[field] = value;
          
          if (field === 'layoutImage') {
            updatedLayout.layoutImageUploadTime = value ? new Date().toISOString() : null;
            updatedLayout.layoutImageUploadedBy = value ? userProfile?.nickname || null : null;
          }

          newLayouts[layoutIndex] = updatedLayout;

          setLead(currentLead => currentLead ? ({ ...currentLead, layouts: newLayouts }) : null);
        }
      }, [lead, userProfile?.nickname]);

      const uploadLayoutImage = useCallback(async (file: File, layoutIndex: number) => {
          if (!lead || !userProfile) return;
          const layout = lead.layouts?.[layoutIndex];
          if (!layout) return;
  
          const storageRef = ref(storage, `leads-images/${lead.id}/${layout.id}/layoutImage.png`);
  
          try {
              toast({ title: "Uploading image..." });
              const snapshot = await uploadBytes(storageRef, file);
              const downloadURL = await getDownloadURL(snapshot.ref);
              handleLayoutChange(layoutIndex, 'layoutImage', downloadURL);
              toast({ title: "Image uploaded successfully!" });
          } catch (error) {
              console.error("Error uploading image:", error);
              toast({ variant: 'destructive', title: "Upload failed" });
          }
      }, [lead, userProfile, storage, toast, handleLayoutChange]);

      const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, layoutIndex: number) => {
          const file = event.target.files?.[0];
          if (file) {
              uploadLayoutImage(file, layoutIndex);
          }
      };
  
      const handleImagePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>, layoutIndex: number) => {
          if (!canEdit) return;
          const items = event.clipboardData.items;
          for (let i = 0; i < items.length; i++) {
              if (items[i].type.indexOf('image') !== -1) {
                  const blob = items[i].getAsFile();
                  if (blob) {
                      uploadLayoutImage(blob as File, layoutIndex);
                  }
              }
          }
      }, [canEdit, uploadLayoutImage]);

      const isDirty = useMemo(() => {
        if (!fetchedLead || !lead) return false;

        const normalize = (l: Lead) => {
          return {
            ...l,
            recipientName: l.recipientName || '',
            importantNotes: l.importantNotes || '',
            orders: (l.orders || []).map(o => ({
              productType: o.productType,
              color: o.color,
              size: o.size,
              quantity: o.quantity,
              remarks: o.remarks || '',
              design: {
                left: o.design?.left || false,
                right: o.design?.right || false,
                backLogo: o.design?.backLogo || false,
                backText: o.design?.backText || false,
              }
            })).sort((a, b) => a.productType.localeCompare(b.productType) || a.color.localeCompare(b.color) || a.size.localeCompare(b.size)),
            layouts: (l.layouts || []).map(layout => ({
                id: layout.id,
                layoutImage: layout.layoutImage || '',
                layoutImageUploadTime: layout.layoutImageUploadTime || null,
                layoutImageUploadedBy: layout.layoutImageUploadedBy || null,
                dstLogoLeft: layout.dstLogoLeft || '',
                dstLogoRight: layout.dstLogoRight || '',
                dstBackLogo: layout.dstBackLogo || '',
                dstBackText: layout.dstBackText || '',
                namedOrders: (layout.namedOrders || []).map(no => ({
                    id: no.id,
                    name: no.name || '',
                    color: no.color || '',
                    size: no.size || '',
                    quantity: no.quantity || 0,
                    backText: no.backText || ''
                })).sort((a,b) => a.id.localeCompare(b.id)),
            })).sort((a,b) => a.id.localeCompare(b.id)),
          };
        };

        const originalState = JSON.stringify({
            ...normalize(fetchedLead),
            deliveryDate: fetchedLead.deliveryDate ? format(new Date(fetchedLead.deliveryDate), 'MMM dd, yyyy') : undefined
        });

        const currentState = JSON.stringify({
            ...normalize(lead),
            deliveryDate: deliveryDate
        });

        return originalState !== currentState;
      }, [fetchedLead, lead, deliveryDate]);

      useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      }, [lead?.location]);

      useEffect(() => {
        if (fetchedLead) {
          const initializedOrders = fetchedLead.orders.map(order => ({
            ...order,
            remarks: order.remarks || '',
            design: order.design || { left: false, right: false, backLogo: false, backText: false }
          }));
          
          const initializedLayouts = fetchedLead.layouts && fetchedLead.layouts.length > 0 
            ? fetchedLead.layouts.map(l => ({ ...l, namedOrders: l.namedOrders || [], id: l.id || uuidv4(), layoutImageUploadTime: l.layoutImageUploadTime || null, layoutImageUploadedBy: l.layoutImageUploadedBy || null }))
            : [{ id: uuidv4(), layoutImage: '', layoutImageUploadTime: null, layoutImageUploadedBy: null, dstLogoLeft: '', dstLogoRight: '', dstBackLogo: '', dstBackText: '', namedOrders: [] }];

          setLead({ ...fetchedLead, orders: initializedOrders, courier: fetchedLead.courier || 'Pick-up', layouts: initializedLayouts, importantNotes: fetchedLead.importantNotes || '' });

          let initialDate;
          if (fetchedLead.deliveryDate) {
            initialDate = format(new Date(fetchedLead.deliveryDate), 'MMM dd, yyyy');
          } else {
            initialDate = format(addDays(new Date(fetchedLead.submissionDateTime), fetchedLead.priorityType === 'Rush' ? 7 : 22), 'MMM dd, yyyy');
          }
          setDeliveryDate(initialDate);
        }
      }, [fetchedLead]);

      const handlePrint = async () => {
        if (!leadRef || !id || !lead) {
            console.error("Lead reference, ID, or data is missing for printing.");
            toast({
                variant: "destructive",
                title: "Printing Error",
                description: "Cannot prepare lead for printing. Please try again.",
            });
            return;
        }

        let printWindow: Window | null = null;
        
        try {
          // Pass necessary data to the print page via localStorage
          const dataForPrint = {
            ...lead,
            deliveryDate: deliveryDate,
            scesFullName: scesFullName,
          };
          localStorage.setItem(`job-order-${id}`, JSON.stringify(dataForPrint));

          const jobOrderUrl = `/job-order/${id}/print`;
          printWindow = window.open(jobOrderUrl, '_blank', 'noopener,noreferrer,height=800,width=1200,scrollbars=yes');

        } catch (error: any) {
          console.error("Error preparing lead for print preview:", error);
          toast({
            variant: "destructive",
            title: "Printing Error",
            description: error.message || "Failed to prepare lead for printing. Please try again.",
          });
        }
      };
      
      const handleClose = () => {
        if (isDirty) {
          setShowConfirmDialog(true);
        } else {
          router.push('/job-order');
        }
      };
      
      const handleConfirmSave = async () => {
        await handleSaveChanges(true);
      };
      
      const handleConfirmDiscard = () => {
        setShowConfirmDialog(false);
        router.push('/job-order');
      };

      const handleCourierChange = (value: string) => {
        if (lead) {
          setLead({ ...lead, courier: value });
        }
      };
      
      const handleRecipientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (lead) {
          setLead({ ...lead, recipientName: e.target.value });
        }
      };

      const handleLocationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (lead) {
          setLead({ ...lead, location: e.target.value });
        }
      };

      const handleOrderChange = (index: number, field: keyof Order, value: any) => {
        if (lead) {
          const newOrders = [...lead.orders];
          (newOrders[index] as any)[field] = value;
          setLead({ ...lead, orders: newOrders });
        }
      };

      const handleDesignChange = (index: number, field: keyof DesignDetails, value: boolean) => {
         if (lead) {
          const newOrders = [...lead.orders];
          const currentOrder = newOrders[index];
          const newDesign = { ...(currentOrder.design || {}), [field]: value };
          (newOrders[index] as any).design = newDesign;
          setLead({ ...lead, orders: newOrders });
        }
      };

      const hasLayoutContent = (layout: Layout) => {
        return layout.layoutImage || 
               layout.dstLogoLeft || 
               layout.dstLogoRight || 
               layout.dstBackLogo || 
               layout.dstBackText || 
               (layout.namedOrders && layout.namedOrders.length > 0 && layout.namedOrders.some(o => o.name || o.backText));
      };
      
      const handleSaveChanges = async (navigateOnSuccess = false) => {
        if (!lead || !leadRef || !firestore || !userProfile) return;

        let newJoNumber: number | undefined = lead.joNumber;
        
        if (!newJoNumber) {
            const counterRef = doc(firestore, 'counters', 'jo_counter');
            try {
                newJoNumber = await runTransaction(firestore, async (transaction) => {
                    const counterDoc = await transaction.get(counterRef);
                    if (!counterDoc.exists()) {
                        // Initialize if it doesn't exist
                        transaction.set(counterRef, { currentNumber: 10000 });
                        return 10000;
                    }
                    const newNumber = counterDoc.data().currentNumber + 1;
                    transaction.update(counterRef, { currentNumber: newNumber });
                    return newNumber;
                });
            } catch (e) {
                console.error("JO Number transaction failed: ", e);
                toast({
                    variant: "destructive",
                    title: "Could not generate J.O. Number",
                    description: "There was an error generating a unique Job Order number. Please try saving again.",
                });
                return; // Stop the save process
            }
        }

        const layoutsToSave = (lead.layouts || []).filter(hasLayoutContent);
        
        const dataToUpdate = {
            ...lead,
            joNumber: newJoNumber,
            deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile.nickname,
            layouts: layoutsToSave,
            publiclyPrintable: true,
            importantNotes: lead.importantNotes || '',
        };

        try {
          await updateDoc(leadRef, dataToUpdate);
          toast({
            title: 'Job Order Saved!',
            description: 'Your changes have been saved successfully.',
          });
          await refetchLead(); 
           if (navigateOnSuccess) {
              router.push('/job-order');
          }
          
        } catch (e: any) {
          console.error('Error saving job order:', e);
          toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: e.message || 'Could not save the job order.',
          });
        }
      };

      const handleLayoutImageDelete = async (layoutIndex: number) => {
        if (!lead || !lead.layouts || !leadRef) return;
    
        const originalLayouts = lead.layouts;
        const layoutToDelete = originalLayouts[layoutIndex];
        if (!layoutToDelete?.layoutImage) return;

        const imageUrl = layoutToDelete.layoutImage;
    
        const newLayouts = [...originalLayouts];
        newLayouts[layoutIndex] = {
            ...newLayouts[layoutIndex],
            layoutImage: '',
            layoutImageUploadTime: null,
            layoutImageUploadedBy: null
        };
    
        setLead({ ...lead, layouts: newLayouts });
    
        try {
            if (imageUrl.includes('firebasestorage.googleapis.com')) {
              const imageRef = ref(storage, imageUrl);
              await deleteObject(imageRef);
            }
    
            await updateDoc(leadRef, {
                layouts: newLayouts
            });
            toast({
                title: "Image Removed",
                description: "The layout image has been removed.",
            });
            refetchLead();
        } catch (e: any) {
            console.error("Error deleting image:", e);
            setLead({ ...lead, layouts: originalLayouts });
            toast({
                variant: "destructive",
                title: "Delete Failed",
                description: e.message || "Could not remove the image.",
            });
        }
      };
      
      const handleNamedOrderChange = (layoutIndex: number, orderIndex: number, field: keyof NamedOrder, value: any) => {
        if (lead && lead.layouts) {
            const newLayouts = [...lead.layouts];
            if (newLayouts[layoutIndex] && newLayouts[layoutIndex].namedOrders) {
                const newNamedOrders = [...newLayouts[layoutIndex].namedOrders];
                if (newNamedOrders[orderIndex]) {
                    (newNamedOrders[orderIndex] as any)[field] = value;
                    newLayouts[layoutIndex] = { ...newLayouts[layoutIndex], namedOrders: newNamedOrders };
                    setLead({ ...lead, layouts: newLayouts });
                }
            }
        }
      };

      const addNamedOrder = (layoutIndex: number) => {
        if (lead && lead.layouts) {
            const newLayouts = [...lead.layouts];
            if (newLayouts[layoutIndex]) {
                const newNamedOrders = [...(newLayouts[layoutIndex].namedOrders || []), { id: uuidv4(), name: '', color: '', size: '', quantity: 1, backText: '' }];
                newLayouts[layoutIndex] = { ...newLayouts[layoutIndex], namedOrders: newNamedOrders };
                setLead({ ...lead, layouts: newLayouts });
            }
        }
      };

      const removeNamedOrder = (layoutIndex: number, orderIndex: number) => {
         if (lead && lead.layouts) {
            const newLayouts = [...lead.layouts];
            if (newLayouts[layoutIndex] && newLayouts[layoutIndex].namedOrders) {
                const newNamedOrders = newLayouts[layoutIndex].namedOrders.filter((_, i) => i !== orderIndex);
                newLayouts[layoutIndex] = { ...newLayouts[layoutIndex], namedOrders: newNamedOrders };
                setLead({ ...lead, layouts: newLayouts });
            }
        }
      };

      const addLayout = () => {
        if (lead) {
          const newLayouts = [...(lead.layouts || []), { id: uuidv4(), layoutImage: '', layoutImageUploadTime: null, dstLogoLeft: '', dstLogoRight: '', dstBackLogo: '', dstBackText: '', namedOrders: [] }];
          setLead({ ...lead, layouts: newLayouts });
          setCurrentPage(newLayouts.length);
        }
      };

      const deleteLayout = (layoutIndex: number) => {
        if (lead && lead.layouts && lead.layouts.length > 1) {
          const newLayouts = lead.layouts.filter((_, i) => i !== layoutIndex);
          setLead({ ...lead, layouts: newLayouts });
          setCurrentPage(Math.max(0, currentPage - 1));
        }
      };

      if (isLeadLoading || areAllLeadsLoading || !lead || areUsersLoading) {
        return (
          <div className="p-10 bg-white">
            <Skeleton className="h-10 w-1/4 mb-4" />
            <Skeleton className="h-6 w-1/2 mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        );
      }

      if (error) {
        return <div className="text-red-500 p-10">Error loading lead: {error.message}</div>;
      }
      
      const scesProfile = users?.find(u => u.nickname === lead.salesRepresentative);
      const scesFullName = scesProfile ? toTitleCase(`${scesProfile.firstName} ${scesProfile.lastName}`) : toTitleCase(lead.salesRepresentative);

      const totalQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
      
      const getContactDisplay = () => {
        const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
        const mobile2 = lead.contactNumber2 && lead.contactNumber2 !== '-' ? lead.contactNumber2.replace(/-/g, '') : null;
        const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

        return [mobile, mobile2, landline].filter(Boolean).join(' / ') || 'N/A';
      };
      
      const currentLayoutIndex = currentPage - 1;
      const currentLayout = lead.layouts?.[currentLayoutIndex];

      return (
        <div className="bg-white text-black min-h-screen">
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
          <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
                <AlertDialogDescription>
                  Do you want to save your changes before closing?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button variant="outline" onClick={handleConfirmDiscard}>Discard</Button>
                <AlertDialogAction onClick={handleConfirmSave}>Save &amp; Close</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <header className="fixed top-0 left-0 right-0 bg-white p-4 no-print shadow-md z-50">
            <div className="flex justify-between items-center container mx-auto max-w-4xl">
                <div className="flex items-center gap-2">
                    <Button onClick={() => setCurrentPage(p => Math.max(0, p-1))} disabled={currentPage === 0} size="sm"><ArrowLeft className="mr-2 h-4 w-4"/>Previous</Button>
                    <span className="font-semibold text-sm">Page {currentPage + 1} of {totalPages}</span>
                    <Button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p+1))} disabled={currentPage >= totalPages - 1} size="sm">Next <ArrowRight className="ml-2 h-4 w-4"/></Button>
                </div>
                {canEdit ? (
                  <div className="flex items-center gap-2">
                      <Button onClick={handleClose} variant="outline" className="shadow-md">
                          <X className="mr-2 h-4 w-4" />
                          Close
                      </Button>
                      <Button onClick={() => handleSaveChanges(false)} className="text-white font-bold shadow-md" disabled={!isDirty}>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                      </Button>
                      <Button onClick={handlePrint} className="text-white font-bold shadow-md" disabled={!lead.joNumber}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print J.O.
                      </Button>
                  </div>
                ): (
                  <div className="flex items-center gap-2">
                      <Button onClick={handleClose} variant="outline" className="shadow-md">
                          <X className="mr-2 h-4 w-4" />
                          Close
                      </Button>
                      <Button onClick={handlePrint} className="text-white font-bold shadow-md" disabled={!lead.joNumber}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print J.O.
                      </Button>
                  </div>
                )}
            </div>
          </header>
          
          {/* Page 1: Job Order Form */}
          <div className={cn("p-10 mx-auto max-w-4xl printable-area mt-16 print-page", currentPage !== 0 && "hidden")}>
            <div className="text-left mb-4">
                <p className="font-bold"><span className="text-primary">J.O. No:</span> <span className="inline-block border-b border-black">{lead.joNumber ? `QSBP-${new Date().getFullYear().toString().slice(-2)}-${lead.joNumber.toString().padStart(5, '0')}` : 'Will be generated on save'}</span></p>
            </div>
            <h1 className="text-2xl font-bold text-center mb-6 border-b-4 border-black pb-2">JOB ORDER FORM</h1>

            <div className="grid grid-cols-3 gap-x-8 text-sm mb-6 border-b border-black pb-4">
                <div className="space-y-1">
                    <p><strong>Client Name:</strong> {lead.customerName}</p>
                    <p><strong>Contact No:</strong> {getContactDisplay()}</p>
                    <div className="flex flex-col gap-1">
                        <strong>Delivery Address:</strong>
                        <Textarea
                            ref={textareaRef}
                            value={lead.location}
                            onChange={handleLocationChange}
                            className="text-xs no-print p-1 min-h-[40px] flex-1 overflow-hidden resize-none"
                            readOnly={!canEdit}
                        />
                        <p className="print-only whitespace-pre-wrap">{lead.location}</p>
                    </div>
                </div>
                <div className="space-y-1">
                    <p><strong>Date of Transaction:</strong> {format(new Date(lead.submissionDateTime), 'MMM dd, yyyy')}</p>
                    <p><strong>Type of Order:</strong> {lead.orderType}</p>
                    <p><strong>Terms of Payment:</strong> {lead.paymentType}</p>
                    <p><strong>SCES Name:</strong> {scesFullName}</p>
                </div>
                <div className="space-y-1">
                     <div className="flex items-center gap-2">
                        <strong className='flex-shrink-0'>Recipient's Name:</strong>
                        <Input
                            value={lead.recipientName || ''}
                            onChange={handleRecipientNameChange}
                            className="h-8 text-xs no-print placeholder:text-foreground"
                            readOnly={!canEdit}
                            placeholder={lead.customerName}
                        />
                        <span className="print-only">{lead.recipientName || lead.customerName}</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <strong className='flex-shrink-0'>Courier:</strong>
                        <div className='w-full no-print'>
                          <Select value={lead.courier || 'Pick-up'} onValueChange={handleCourierChange} disabled={!canEdit}>
                              <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  {courierOptions.map(opt => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                        </div>
                        <span className="print-only">{lead.courier}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <strong className='flex-shrink-0'>Delivery Date:</strong>
                        <Input
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            placeholder="MMM dd, yyyy"
                            className="h-8 text-xs"
                            readOnly={!canEdit}
                        />
                        <span className="print-only">{deliveryDate || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <h2 className="text-xl font-bold text-center mb-4">ORDER DETAILS</h2>
            <table className="w-full border-collapse border border-black text-xs mb-2">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-0.5" colSpan={3}>Item Description</th>
                  <th className="border border-black p-0.5" rowSpan={2}>Qty</th>
                  <th className="border border-black p-0.5" colSpan={2}>Front Design</th>
                  <th className="border border-black p-0.5" colSpan={2}>Back Design</th>
                  <th className="border border-black p-0.5" rowSpan={2}>Remarks</th>
                </tr>
                <tr className="bg-gray-200">
                  <th className="border border-black p-0.5 font-medium">Type of Product</th>
                  <th className="border border-black p-0.5 font-medium">Color</th>
                  <th className="border border-black p-0.5 font-medium">Size</th>
                  <th className="border border-black p-0.5 font-medium w-12">Left</th>
                  <th className="border border-black p-0.5 font-medium w-12">Right</th>
                  <th className="border border-black p-0.5 font-medium w-12">Logo</th>
                  <th className="border border-black p-0.5 font-medium w-12">Text</th>
                </tr>
              </thead>
              <tbody>
                {lead.orders.map((order, index) => (
                  <tr key={index}>
                    <td className="border border-black p-0.5 text-center align-middle">{order.productType}</td>
                    <td className="border border-black p-0.5 text-center align-middle">{order.color}</td>
                    <td className="border border-black p-0.5 text-center">{order.size}</td>
                    <td className="border border-black p-0.5 text-center">{order.quantity}</td>
                    <td className="border border-black p-0.5 text-center">
                        <Checkbox className="mx-auto" checked={order.design?.left || false} onCheckedChange={(checked) => handleDesignChange(index, 'left', !!checked)} disabled={!canEdit} />
                    </td>
                    <td className="border border-black p-0.5 text-center">
                       <Checkbox className="mx-auto" checked={order.design?.right || false} onCheckedChange={(checked) => handleDesignChange(index, 'right', !!checked)} disabled={!canEdit} />
                    </td>
                    <td className="border border-black p-0.5 text-center">
                      <Checkbox className="mx-auto" checked={order.design?.backLogo || false} onCheckedChange={(checked) => handleDesignChange(index, 'backLogo', !!checked)} disabled={!canEdit} />
                    </td>
                    <td className="border border-black p-0.5 text-center">
                      <Checkbox className="mx-auto" checked={order.design?.backText || false} onCheckedChange={(checked) => handleDesignChange(index, 'backText', !!checked)} disabled={!canEdit} />
                    </td>
                    <td className="border border-black p-0.5">
                      <Textarea value={order.remarks} onChange={(e) => handleOrderChange(index, 'remarks', e.target.value)} className="text-xs no-print p-1 h-[30px]" placeholder="Add remarks..." readOnly={!canEdit} />
                      <p className="print-only text-xs">{order.remarks}</p>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} className="text-right font-bold p-0.5">TOTAL</td>
                  <td className="text-center font-bold p-0.5">{totalQuantity} PCS</td>
                  <td colSpan={5}></td>
                </tr>
              </tbody>
            </table>
        <div className="text-xs mb-2 pt-2">
            <p className="text-xs mb-2 italic"><strong>Note:</strong> Specific details for logo and back text on the next page</p>
        </div>
        
        <div className="grid grid-cols-2 gap-x-16 gap-y-4 text-xs mt-2">
            <div className="space-y-1">
                <p className="font-bold italic">Prepared by:</p>
                <p className="pt-8 border-b border-black text-center font-semibold">{scesFullName}</p>
                <p className="text-center font-bold">Sales &amp; Customer Engagement Specialist</p>
                <p className="text-center">(Name &amp; Signature, Date)</p>
            </div>
             <div className="space-y-1">
                <p className="font-bold italic">Noted by:</p>
                <p className="pt-8 border-b border-black text-center font-semibold">Myreza Banawon</p>
                <p className="text-center font-bold">Sales Head</p>
                <p className="text-center">(Name &amp; Signature, Date)</p>
            </div>

            <div className="col-span-2 mt-0">
                <p className="font-bold italic">Approved by:</p>
            </div>


            <div className="space-y-1">
                <p className="pt-8 border-b border-black"></p>
                <p className="text-center font-semibold">Programming</p>
                <p className="text-center">(Name &amp; Signature, Date)</p>
            </div>
            <div className="space-y-1">
                <p className="pt-8 border-b border-black"></p>
                <p className="text-center font-semibold">Inventory</p>
                <p className="text-center">(Name &amp; Signature, Date)</p>
            </div>
            <div className="space-y-1">
                <p className="pt-8 border-b border-black"></p>
                <p className="text-center font-semibold">Production Line Leader</p>
                <p className="text-center">(Name &amp; Signature, Date)</p>
            </div>
            <div className="space-y-1">
                <p className="pt-8 border-b border-black"></p>
                <p className="text-center font-semibold">Production Supervisor</p>
                <p className="text-center">(Name &amp; Signature, Date)</p>
            </div>
             <div className="space-y-1">
                <p className="pt-8 border-b border-black"></p>
                <p className="text-center font-semibold">Quality Control</p>
                <p className="text-center">(Name &amp; Signature, Date)</p>
            </div>
            <div className="space-y-1">
                <p className="pt-8 border-b border-black"></p>
                <p className="text-center font-semibold">Logistics</p>
                <p className="text-center">(Name &amp; Signature, Date)</p>
            </div>
             <div className="col-span-2 mx-auto w-1/2 space-y-1 pt-4">
                <p className="pt-8 border-b border-black"></p>
                <p className="text-center font-semibold">Operations Supervisor</p>
                <p className="text-center">(Name &amp; Signature, Date)</p>
            </div>
        </div>
      </div>
      
      {/* Layout Pages */}
      <div className={cn("p-10 mx-auto max-w-4xl printable-area print-page mt-16", currentPage === 0 && "hidden")}>
         {canEdit && (
            <div className="flex justify-between items-center mb-4 no-print">
              <div className="flex gap-2">
                  <Button onClick={addLayout} size="sm"><Plus className="mr-2 h-4 w-4"/>Add Layout</Button>
                  <Button onClick={() => deleteLayout(currentLayoutIndex)} size="sm" variant="destructive" disabled={(lead.layouts?.length ?? 0) <= 1}><Trash2 className="mr-2 h-4 w-4" />Delete Layout</Button>
              </div>
            </div>
         )}

        {currentLayout && (
          <div key={currentLayout.id}>
             <div
              tabIndex={0}
              onPaste={(e) => canEdit && handleImagePaste(e, currentLayoutIndex)}
              onClick={() => currentLayout.layoutImage && setImageInView(currentLayout.layoutImage)}
              onDoubleClick={() => canEdit && !currentLayout.layoutImage && layoutImageUploadRef.current?.click()}
              onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}
              className={cn("relative group w-full h-[500px] border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center mb-4 no-print focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none", canEdit && "cursor-pointer")}
            >
              {currentLayout.layoutImage ? (
                <>
                  <Image src={currentLayout.layoutImage} alt={`Layout ${currentLayoutIndex + 1}`} layout="fill" objectFit="contain" />
                  {canEdit && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLayoutImageDelete(currentLayoutIndex);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-gray-500 flex flex-col items-center gap-2">
                  <Upload className="h-12 w-12" />
                  <span>{canEdit ? "Double-click to upload or paste image" : "No layout image"}</span>
                </div>
              )}
              <input type="file" ref={layoutImageUploadRef} onChange={(e) => handleFileUpload(e, currentLayoutIndex)} className="hidden" accept="image/*" disabled={!canEdit}/>
            </div>
            
            <div className="flex flex-wrap gap-4 p-4 items-start no-print">
               {(() => {
                   if (!currentLayout) return null;

                    const imageGroups = [
                        {
                            title: 'Initial Program Images',
                            images: [
                                ...((currentLayout as any).logoLeftImages || []).map((img: any, i: number) => ({ src: img.url, label: `Logo Left ${i + 1}`, timestamp: img.uploadTime, uploadedBy: img.uploadedBy })),
                                ...((currentLayout as any).logoRightImages || []).map((img: any, i: number) => ({ src: img.url, label: `Logo Right ${i + 1}`, timestamp: img.uploadTime, uploadedBy: img.uploadedBy })),
                                ...((currentLayout as any).backLogoImages || []).map((img: any, i: number) => ({ src: img.url, label: `Back Logo ${i + 1}`, timestamp: img.uploadTime, uploadedBy: img.uploadedBy })),
                                ...((currentLayout as any).backDesignImages || []).map((img: any, i: number) => ({ src: img.url, label: `Back Design ${i + 1}`, timestamp: img.uploadTime, uploadedBy: img.uploadedBy })),
                            ].filter(Boolean) as { src: string; label: string; timestamp?: string | null; uploadedBy?: string | null }[]
                        },
                        {
                            title: 'Tested Images',
                            images: [
                                ...((currentLayout as any).testLogoLeftImages || []).map((img: any, i: number) => ({ src: img.url, label: `Logo Left ${i + 1}`, timestamp: img.uploadTime, uploadedBy: img.uploadedBy })),
                                ...((currentLayout as any).testLogoRightImages || []).map((img: any, i: number) => ({ src: img.url, label: `Logo Right ${i + 1}`, timestamp: img.uploadTime, uploadedBy: img.uploadedBy })),
                                ...((currentLayout as any).testBackLogoImages || []).map((img: any, i: number) => ({ src: img.url, label: `Back Logo ${i + 1}`, timestamp: img.uploadTime, uploadedBy: img.uploadedBy })),
                                ...((currentLayout as any).testBackDesignImages || []).map((img: any, i: number) => ({ src: img.url, label: `Back Design ${i + 1}`, timestamp: img.uploadTime, uploadedBy: img.uploadedBy })),
                            ].filter(Boolean) as { src: string; label: string; timestamp?: string | null; uploadedBy?: string | null }[]
                        },
                        {
                            title: 'Final Program Files',
                            images: [
                                ...(currentLayout.finalProgrammedLogo || []).map((file, i) => file && { src: file.url, label: `Final Logo ${i + 1}`, timestamp: currentLayout.finalProgrammedLogoUploadTimes?.[i], uploadedBy: currentLayout.finalProgrammedLogoUploadedBy?.[i] }),
                                ...(currentLayout.finalProgrammedBackDesign || []).map((file, i) => file && { src: file.url, label: `Final Back Design ${i + 1}`, timestamp: currentLayout.finalProgrammedBackDesignUploadTimes?.[i], uploadedBy: currentLayout.finalProgrammedBackDesignUploadedBy?.[i] }),
                                ...(currentLayout.sequenceLogo || []).map((file, i) => file && { src: file.url, label: `Sequence Logo ${i + 1}`, timestamp: currentLayout.sequenceLogoUploadTimes?.[i], uploadedBy: currentLayout.sequenceLogoUploadedBy?.[i] }),
                                ...(currentLayout.sequenceBackDesign || []).map((file, i) => file && { src: file.url, label: `Sequence Back Design ${i + 1}`, timestamp: currentLayout.sequenceBackDesignUploadTimes?.[i], uploadedBy: currentLayout.sequenceBackDesignUploadedBy?.[i] }),
                            ].filter(Boolean) as { src: string; label: string; timestamp?: string | null; uploadedBy?: string | null }[]
                        }
                    ];

                   return imageGroups.map(group => <ImageDisplayCard key={group.title} title={group.title} images={group.images} onImageClick={setImageInView} />);
               })()}
            </div>


            <h2 className="2xl font-bold text-center mb-4">
              {lead.layouts && lead.layouts.length > 1
                ? `LAYOUT #${currentLayoutIndex + 1}`
                : "LAYOUT"}
            </h2>
            <table className="w-full border-collapse border border-black mb-6">
                <tbody>
                    <tr>
                        <td className="border border-black p-2 w-1/2"><strong>DST LOGO LEFT:</strong><Textarea value={currentLayout.dstLogoLeft} onChange={(e) => handleLayoutChange(currentLayoutIndex, 'dstLogoLeft', e.target.value)} className="mt-1 no-print" readOnly={!canEdit} /><p className="print-only whitespace-pre-wrap">{currentLayout.dstLogoLeft}</p></td>
                        <td className="border border-black p-2 w-1/2"><strong>DST BACK LOGO:</strong><Textarea value={currentLayout.dstBackLogo} onChange={(e) => handleLayoutChange(currentLayoutIndex, 'dstBackLogo', e.target.value)} className="mt-1 no-print" readOnly={!canEdit} /><p className="print-only whitespace-pre-wrap">{currentLayout.dstBackLogo}</p></td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 w-1/2"><strong>DST LOGO RIGHT:</strong><Textarea value={currentLayout.dstLogoRight} onChange={(e) => handleLayoutChange(currentLayoutIndex, 'dstLogoRight', e.target.value)} className="mt-1 no-print" readOnly={!canEdit} /><p className="print-only whitespace-pre-wrap">{currentLayout.dstLogoRight}</p></td>
                        <td className="border border-black p-2 w-1/2"><strong>DST BACK TEXT:</strong><Textarea value={currentLayout.dstBackText} onChange={(e) => handleLayoutChange(currentLayoutIndex, 'dstBackText', e.target.value)} className="mt-1 no-print" readOnly={!canEdit} /><p className="print-only whitespace-pre-wrap">{currentLayout.dstBackText}</p></td>
                    </tr>
                </tbody>
            </table>
            
            <div className="mt-6 mb-4">
                <label htmlFor="important-notes" className="text-red-500 font-bold no-print">Important Notes:</label>
                <div className="print-only">
                    <p className="text-red-500 font-bold">Important Notes:</p>
                    <p className="font-bold whitespace-pre-wrap">{lead.importantNotes}</p>
                </div>
                <Textarea
                    id="important-notes"
                    value={lead.importantNotes || ''}
                    onChange={(e) => setLead(currentLead => currentLead ? ({ ...currentLead, importantNotes: e.target.value }) : null)}
                    className="mt-1 no-print"
                    readOnly={!canEdit}
                />
            </div>

            <h2 className="text-2xl font-bold text-center mb-4">NAMES</h2>
            <table className="w-full border-collapse border border-black text-xs">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-1 text-center align-middle">No.</th>
                  <th className="border border-black p-1 text-center align-middle">Names</th>
                  <th className="border border-black p-1 text-center align-middle">Color</th>
                  <th className="border border-black p-1 text-center align-middle">Sizes</th>
                  <th className="border border-black p-1 text-center align-middle">Qty</th>
                  <th className="border border-black p-1 text-center align-middle">BACK TEXT</th>
                  {canEdit && <th className="border border-black p-1 no-print text-center align-middle">Action</th>}
                </tr>
              </thead>
              <tbody>
                {(currentLayout.namedOrders || []).map((order, orderIndex) => (
                  <tr key={order.id}>
                    <td className="border border-black p-1 text-center align-middle">{orderIndex + 1}</td>
                    <td className="border border-black p-1 text-center align-middle"><Input value={order.name} onChange={(e) => handleNamedOrderChange(currentLayoutIndex, orderIndex, 'name', e.target.value)} className="h-7 text-xs no-print text-center" readOnly={!canEdit} /><span className="print-only">{order.name}</span></td>
                    <td className="border border-black p-1 text-center align-middle"><Input value={order.color} onChange={(e) => handleNamedOrderChange(currentLayoutIndex, orderIndex, 'color', e.target.value)} className="h-7 text-xs no-print text-center" readOnly={!canEdit} /><span className="print-only">{order.color}</span></td>
                    <td className="border border-black p-1 text-center align-middle"><Input value={order.size} onChange={(e) => handleNamedOrderChange(currentLayoutIndex, orderIndex, 'size', e.target.value)} className="h-7 text-xs no-print text-center" readOnly={!canEdit} /><span className="print-only">{order.size}</span></td>
                    <td className="border border-black p-1 text-center align-middle"><Input type="number" value={order.quantity} onChange={(e) => handleNamedOrderChange(currentLayoutIndex, orderIndex, 'quantity', parseInt(e.target.value) || 0)} className="h-7 text-xs no-print text-center" readOnly={!canEdit} /><span className="print-only">{order.quantity}</span></td>
                    <td className="border border-black p-1 text-center align-middle"><Input value={order.backText} onChange={(e) => handleNamedOrderChange(currentLayoutIndex, orderIndex, 'backText', e.target.value)} className="h-7 text-xs no-print text-center" readOnly={!canEdit} /><span className="print-only">{order.backText}</span></td>
                    {canEdit && (
                        <td className="border border-black p-1 text-center align-middle no-print">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeNamedOrder(currentLayoutIndex, orderIndex)}><Trash2 className="h-4 w-4"/></Button>
                        </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {canEdit && <Button onClick={() => addNamedOrder(currentLayoutIndex)} className="mt-2 no-print" size="sm"><Plus className="mr-2 h-4 w-4"/>Add Name</Button>}
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background-color: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print, header, .no-print * {
            display: none !important;
          }
          .printable-area {
            display: block !important;
            margin-top: 0 !important;
            padding: 1rem !important;
            max-width: 100% !important;
            color: black !important;
          }
          .printable-area * {
            color: black !important;
          }
          .print-only {
            display: inline-block !important;
          }
          .bg-gray-200 {
            background-color: #e5e7eb !important;
          }
          .print-page {
            page-break-after: always;
          }
           .print-page:last-of-type {
            page-break-after: auto;
          }
          @page {
            size: legal;
            margin: 0.5in;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>
    </div>
  );
}
