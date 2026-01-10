
'use client';

import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, updateDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Save, X, Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useMemo, useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Image from 'next/image';

type NamedOrder = {
  id: string;
  name: string;
  color: string;
  size: string;
  quantity: number;
  backText: string;
}

type Layout = {
  id: string;
  layoutImage?: string;
  dstLogoLeft?: string;
  dstLogoRight?: string;
  dstBackLogo?: string;
  dstBackText?: string;
  namedOrders: NamedOrder[];
}

type Lead = {
  id: string;
  joNumber?: number;
  layouts?: Layout[];
};

export default function JobOrderLayoutPage() {
  const { id } = useParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const leadRef = useMemoFirebase(
    () => (firestore && id ? doc(firestore, 'leads', id as string) : null),
    [firestore, id]
  );

  const { data: fetchedLead, isLoading: isLeadLoading, error } = useDoc<Lead>(leadRef);
  const [lead, setLead] = useState<Lead | null>(null);
  const [joNumber, setJoNumber] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const [currentLayoutIndex, setCurrentLayoutIndex] = useState(0);
  const layoutImageUploadRef = useRef<HTMLInputElement>(null);

  // Helper to compare lead states to check for unsaved changes
  const isDirty = useMemo(() => {
    if (!fetchedLead || !lead) return false;
    // Simple JSON stringify comparison. For more complex objects, a deep-equal library would be better.
    return JSON.stringify(fetchedLead.layouts) !== JSON.stringify(lead.layouts);
  }, [fetchedLead, lead]);

  useEffect(() => {
    if (fetchedLead) {
      const initializedLayouts = fetchedLead.layouts && fetchedLead.layouts.length > 0 
        ? fetchedLead.layouts 
        : [{ id: 'layout-1', layoutImage: '', dstLogoLeft: '', dstLogoRight: '', dstBackLogo: '', dstBackText: '', namedOrders: [] }];

      setLead({ ...fetchedLead, layouts: initializedLayouts });
      
      if (fetchedLead.joNumber) {
        const currentYear = new Date().getFullYear().toString().slice(-2);
        setJoNumber(`QSBP-${currentYear}-${fetchedLead.joNumber.toString().padStart(5, '0')}`);
      }
    }
  }, [fetchedLead]);

  const handleClose = () => {
    if (isDirty) {
      setShowConfirmDialog(true);
    } else {
      router.push(`/job-order/${id}`);
    }
  };
  
  const handleConfirmSave = async () => {
    await handleSaveChanges();
    setShowConfirmDialog(false);
  };
  
  const handleConfirmDiscard = () => {
    setShowConfirmDialog(false);
    router.push(`/job-order/${id}`);
  };

  const handleLayoutChange = (layoutIndex: number, field: keyof Layout, value: any) => {
    if (lead && lead.layouts) {
      const newLayouts = [...lead.layouts];
      (newLayouts[layoutIndex] as any)[field] = value;
      setLead({ ...lead, layouts: newLayouts });
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
            const newNamedOrders = [...(newLayouts[layoutIndex].namedOrders || []), { id: `order-${Date.now()}`, name: '', color: '', size: '', quantity: 1, backText: '' }];
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
      const newLayouts = [...(lead.layouts || []), { id: `layout-${Date.now()}`, layoutImage: '', dstLogoLeft: '', dstLogoRight: '', dstBackLogo: '', dstBackText: '', namedOrders: [] }];
      setLead({ ...lead, layouts: newLayouts });
      setCurrentLayoutIndex(newLayouts.length - 1);
    }
  };

  const deleteLayout = (layoutIndex: number) => {
    if (lead && lead.layouts && lead.layouts.length > 1) {
      const newLayouts = lead.layouts.filter((_, i) => i !== layoutIndex);
      setLead({ ...lead, layouts: newLayouts });
      setCurrentLayoutIndex(Math.max(0, layoutIndex - 1));
    }
  };

  const handleLayoutImageUpload = (event: React.ChangeEvent<HTMLInputElement>, layoutIndex: number) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        handleLayoutChange(layoutIndex, 'layoutImage', e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async () => {
    if (!lead || !leadRef) return;
    
    const dataToUpdate = {
      layouts: lead.layouts,
      lastModified: new Date().toISOString(),
    };

    try {
      await updateDoc(leadRef, dataToUpdate);
      toast({
        title: 'Layouts Saved!',
        description: 'Your layout changes have been saved successfully.',
      });
      router.push(`/job-order/${id}`);
    } catch (e: any) {
      console.error('Error saving layouts:', e);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: e.message || 'Could not save the layouts.',
      });
    }
  };

  if (isLeadLoading || !lead) {
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
  
  const currentLayout = lead.layouts?.[currentLayoutIndex];

  return (
    <div className="bg-white text-black min-h-screen">
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
            <AlertDialogAction onClick={handleConfirmSave}>Save & Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <header className="fixed top-0 left-0 right-0 bg-white p-4 no-print shadow-md z-50">
        <div className="flex justify-end gap-2 container mx-auto max-w-4xl">
            <Button onClick={handleClose} variant="outline">
            <X className="mr-2 h-4 w-4" />
            Close
            </Button>
            <Button onClick={handleSaveChanges} className="text-white font-bold">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
            </Button>
        </div>
      </header>
      <div className="p-10 mx-auto max-w-4xl printable-area mt-16">
        <div className="text-left mb-4">
            <p className="font-bold"><span className="text-primary">J.O. No:</span> <span className="inline-block border-b border-black">{joNumber || 'Not Saved'}</span></p>
        </div>
        
        <div className="flex justify-between items-center mb-4 no-print">
            <div className="flex gap-2">
                <Button onClick={addLayout} size="sm"><Plus className="mr-2 h-4 w-4"/>Add Layout</Button>
                <Button onClick={() => deleteLayout(currentLayoutIndex)} size="sm" variant="destructive" disabled={(lead.layouts?.length ?? 0) <= 1}><Trash2 className="mr-2 h-4 w-4" />Delete Layout</Button>
            </div>
            <div className="flex items-center gap-2">
                <Button onClick={() => setCurrentLayoutIndex(i => Math.max(0, i-1))} disabled={currentLayoutIndex === 0} size="sm"><ArrowLeft className="mr-2 h-4 w-4"/>Previous</Button>
                <span>Layout {currentLayoutIndex + 1} of {(lead.layouts?.length ?? 0)}</span>
                <Button onClick={() => setCurrentLayoutIndex(i => Math.min((lead.layouts?.length ?? 1)-1, i+1))} disabled={currentLayoutIndex >= (lead.layouts?.length ?? 1)-1} size="sm">Next <ArrowRight className="ml-2 h-4 w-4"/></Button>
            </div>
        </div>

        {currentLayout && (
          <div key={currentLayout.id}>
            <div
              className="relative w-full h-[500px] border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center mb-4 cursor-pointer no-print"
              onClick={() => layoutImageUploadRef.current?.click()}
            >
              {currentLayout.layoutImage ? (
                <Image src={currentLayout.layoutImage} alt={`Layout ${currentLayoutIndex + 1}`} layout="fill" objectFit="contain" />
              ) : (
                <span className="text-gray-500">Click to upload layout image</span>
              )}
              <input type="file" ref={layoutImageUploadRef} onChange={(e) => handleLayoutImageUpload(e, currentLayoutIndex)} className="hidden" accept="image/*" />
            </div>

            <h2 className="text-2xl font-bold text-center mb-4">LAYOUT</h2>
            <table className="w-full border-collapse border border-black mb-6">
                <tbody>
                    <tr>
                        <td className="border border-black p-2 w-1/2"><strong>DST LOGO LEFT:</strong><Textarea value={currentLayout.dstLogoLeft} onChange={(e) => handleLayoutChange(currentLayoutIndex, 'dstLogoLeft', e.target.value)} className="mt-1" /></td>
                        <td className="border border-black p-2 w-1/2"><strong>DST BACK LOGO:</strong><Textarea value={currentLayout.dstBackLogo} onChange={(e) => handleLayoutChange(currentLayoutIndex, 'dstBackLogo', e.target.value)} className="mt-1" /></td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 w-1/2"><strong>DST LOGO RIGHT:</strong><Textarea value={currentLayout.dstLogoRight} onChange={(e) => handleLayoutChange(currentLayoutIndex, 'dstLogoRight', e.target.value)} className="mt-1" /></td>
                        <td className="border border-black p-2 w-1/2"><strong>DST BACK TEXT:</strong><Textarea value={currentLayout.dstBackText} onChange={(e) => handleLayoutChange(currentLayoutIndex, 'dstBackText', e.target.value)} className="mt-1" /></td>
                    </tr>
                </tbody>
            </table>

            <h2 className="text-2xl font-bold text-center mb-4">NAMES</h2>
            <table className="w-full border-collapse border border-black text-xs">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-1">No.</th>
                  <th className="border border-black p-1">Names</th>
                  <th className="border border-black p-1">Color</th>
                  <th className="border border-black p-1">Sizes</th>
                  <th className="border border-black p-1">Qty</th>
                  <th className="border border-black p-1">BACK TEXT</th>
                  <th className="border border-black p-1 no-print">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentLayout.namedOrders.map((order, orderIndex) => (
                  <tr key={order.id}>
                    <td className="border border-black p-1 text-center">{orderIndex + 1}</td>
                    <td className="border border-black p-1"><Input value={order.name} onChange={(e) => handleNamedOrderChange(currentLayoutIndex, orderIndex, 'name', e.target.value)} className="h-7 text-xs" /></td>
                    <td className="border border-black p-1"><Input value={order.color} onChange={(e) => handleNamedOrderChange(currentLayoutIndex, orderIndex, 'color', e.target.value)} className="h-7 text-xs" /></td>
                    <td className="border border-black p-1"><Input value={order.size} onChange={(e) => handleNamedOrderChange(currentLayoutIndex, orderIndex, 'size', e.target.value)} className="h-7 text-xs" /></td>
                    <td className="border border-black p-1"><Input type="number" value={order.quantity} onChange={(e) => handleNamedOrderChange(currentLayoutIndex, orderIndex, 'quantity', parseInt(e.target.value) || 0)} className="h-7 text-xs" /></td>
                    <td className="border border-black p-1"><Input value={order.backText} onChange={(e) => handleNamedOrderChange(currentLayoutIndex, orderIndex, 'backText', e.target.value)} className="h-7 text-xs" /></td>
                    <td className="border border-black p-1 text-center no-print">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeNamedOrder(currentLayoutIndex, orderIndex)}><Trash2 className="h-4 w-4"/></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button onClick={() => addNamedOrder(currentLayoutIndex)} className="mt-2 no-print" size="sm"><Plus className="mr-2 h-4 w-4"/>Add Name</Button>
          </div>
        )}
      </div>
    </div>
  );
}
