'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import { ClipboardCopy, Download, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface PreviewQuotationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quotationContentRef: React.RefObject<HTMLDivElement>;
}

export function PreviewQuotationDialog({
  isOpen,
  onClose,
  quotationContentRef,
}: PreviewQuotationDialogProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && quotationContentRef.current) {
      setIsLoading(true);
      html2canvas(quotationContentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      }).then(canvas => {
        const url = canvas.toDataURL('image/png');
        setImageUrl(url);
        canvas.toBlob(blob => {
            setImageBlob(blob);
        }, 'image/png');
        setIsLoading(false);
      }).catch(err => {
        console.error("html2canvas error:", err);
        toast({
            variant: "destructive",
            title: "Failed to generate image",
            description: "There was an error creating the quotation image."
        });
        setIsLoading(false);
        onClose();
      });
    }
  }, [isOpen, quotationContentRef, toast, onClose]);

  const handleCopyToClipboard = async () => {
    if (!imageBlob) {
        toast({
            variant: "destructive",
            title: "Copy Failed",
            description: "Image data is not ready.",
        });
        return;
    }
    try {
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': imageBlob })
        ]);
        toast({
            title: "Copied to clipboard!",
            description: "The quotation image has been copied.",
        });
    } catch (err) {
        console.error("Failed to copy:", err);
        toast({
            variant: "destructive",
            title: "Copy Failed",
            description: "Could not copy the image to the clipboard. Please try again or use the download button.",
        });
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'quotation.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Quotation Preview</DialogTitle>
        </DialogHeader>
        <div className="py-4 h-[60vh] flex items-center justify-center bg-gray-100 rounded-md">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Generating preview...</p>
            </div>
          ) : imageUrl ? (
            <Image src={imageUrl} alt="Quotation Preview" width={800} height={600} style={{ objectFit: 'contain', maxHeight: '100%', maxWidth: '100%' }} />
          ) : (
            <p className="text-destructive">Could not generate image preview.</p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleDownload} disabled={isLoading || !imageUrl}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button onClick={handleCopyToClipboard} disabled={isLoading || !imageBlob}>
            <ClipboardCopy className="mr-2 h-4 w-4" />
            Copy Image
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
