
"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as ShadTableFooter } from '@/components/ui/table';
import { getProductGroup, getUnitPrice, getProgrammingFees, type EmbroideryOption, getAddOnPrice, type PricingConfig } from '@/lib/pricing';
import { AddOns, Discount, Payment } from "./invoice-dialogs";
import { formatCurrency } from '@/lib/utils';
import { useFirestore, useDoc, useMemoFirebase, useFirebaseApp, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { initialPricingConfig } from '@/lib/pricing-data';
import Image from 'next/image';
import { Button } from './ui/button';
import { ClipboardCopy } from 'lucide-react';
import { format } from 'date-fns';
import { useFormContext } from 'react-hook-form';
import { QuotationFormValues, type Order } from '@/lib/form-schemas';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { Skeleton } from './ui/skeleton';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

type QuotationSummaryProps = {
  orders: Order[];
  orderType?: 'MTO' | 'Personalize' | 'Customize' | 'Stock Design' | 'Stock (Jacket Only)' | 'Services' | 'Item Sample';
  addOns: Record<string, AddOns>;
  discounts: Record<string, Discount>;
  grandTotal: number;
  removedFees: Record<string, { logo?: boolean; backText?: boolean }>;
};

export function QuotationSummary({ orders, orderType, addOns, discounts, grandTotal, removedFees = {} }: QuotationSummaryProps) {
    const { watch } = useFormContext<QuotationFormValues>();
    const customerName = watch('customerName');
    const { userProfile } = useUser();
    
    const app = useFirebaseApp();
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoLoading, setLogoLoading] = useState(true);
    
    const quotationRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const [isCopying, setIsCopying] = useState(false);

    useEffect(() => {
        if (!app) return;
        const storage = getStorage(app);
        const logoRef = ref(storage, 'companyLogo/qualistitch.png');
        
        getDownloadURL(logoRef)
            .then((url) => {
                setLogoUrl(url);
            })
            .catch((error) => {
                console.error("Error fetching logo URL:", error);
            })
            .finally(() => {
                setLogoLoading(false);
            });
    }, [app]);

    const firestore = useFirestore();
    const pricingConfigRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'pricing', 'default') : null),
        [firestore]
    );
    const { data: fetchedConfig } = useDoc<PricingConfig>(pricingConfigRef);

    const pricingConfig = useMemo(() => {
        if (fetchedConfig) return fetchedConfig;
        return initialPricingConfig as PricingConfig;
    }, [fetchedConfig]);

    const handleCopyToClipboard = async () => {
        if (!quotationRef.current || isCopying) {
            return;
        }

        setIsCopying(true);
        toast({ title: 'Generating image...', description: 'Please wait.' });

        try {
            const canvas = await html2canvas(quotationRef.current, {
                useCORS: true,
                scale: 2,
            });
            
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    
            if (blob) {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                toast({
                    title: 'Copied to clipboard!',
                    description: 'The quotation has been copied as an image.',
                });
            } else {
                throw new Error('Could not create a blob from the canvas.');
            }
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            let description = 'Could not copy image to clipboard. Please try again.';
            if (err instanceof Error) {
                if (err.name === 'NotAllowedError') {
                    description = 'Clipboard access was denied. Please make sure the browser window is focused and grant permission when prompted.';
                } else {
                    description = err.message;
                }
            }
            toast({
                variant: 'destructive',
                title: 'Copy Failed',
                description: description,
            });
        } finally {
            setIsCopying(false);
        }
    };


    const groupedOrders = useMemo(() => {
      return orders.reduce((acc, order) => {
        const isClientOwned = order.productType === 'Client Owned';
        const isPatches = order.productType === 'Patches';
        const productGroup = getProductGroup(order.productType, pricingConfig);
        
        if (!productGroup && !isClientOwned && order.productType !== 'Patches') return acc;
  
        const embroidery = order.embroidery || 'logo';
        const groupKey = `${order.productType}-${embroidery}`.replace(/\s+/g, '-');
        if (!acc[groupKey]) {
          acc[groupKey] = {
            productType: order.productType,
            embroidery: embroidery,
            orders: [],
            totalQuantity: 0,
          };
        }
        acc[groupKey].orders.push(order);
        acc[groupKey].totalQuantity += order.quantity;
        return acc;
      }, {} as Record<string, { productType: string; embroidery: EmbroideryOption; orders: Order[], totalQuantity: number }>);
    }, [orders, pricingConfig]);

    return (
        <Card className="shadow-lg">
            <CardHeader className="flex flex-row justify-between items-center no-print">
                <CardTitle>Quotation Preview</CardTitle>
                <Button onClick={handleCopyToClipboard} disabled={isCopying}>
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    {isCopying ? 'Copying...' : 'Copy to Clipboard'}
                </Button>
            </CardHeader>
            <CardContent>
                 <div className="p-8 printable-quotation border rounded-lg bg-white" id="quotation-content" ref={quotationRef}>
                    <header className="flex justify-between items-start mb-2">
                        <div>
                            <h2 className="font-bold text-2xl">BURDA PINAS</h2>
                            <p className="text-sm text-gray-500">Owned and Operated by: QUALISTITCH INCORPORATED</p>
                            <div className="text-xs mt-2 space-y-px">
                                <p><span className="font-bold">Address:</span> 005 Holy Family Subdivision, Silangan, San Mateo, Rizal, Philippines 1850</p>
                                <p><span className="font-bold">Mobile No:</span> 0966-278-2437 | 0956-204-1950 | 0956-204-1919</p>
                                <p><span className="font-bold">Landline No:</span> (02) 8716-5814</p>
                                <p><span className="font-bold">VAT Reg. TIN:</span> 675-385-158-00000</p>
                            </div>
                        </div>
                        <div className="relative h-28 w-28">
                           {logoLoading ? (
                                <Skeleton className="h-full w-full" />
                            ) : logoUrl ? (
                                <Image src={logoUrl} alt="Qualistitch Inc. Logo" layout="fill" objectFit="contain" />
                            ) : (
                                <div className="h-full w-full bg-gray-200 flex items-center justify-center text-xs text-center text-gray-500">Logo not found</div>
                            )}
                        </div>
                    </header>

                    <div className="flex justify-between items-center text-sm mb-2">
                        <div>
                            <h2 className="text-2xl font-bold">Quotation</h2>
                             <div className="flex items-center gap-2 mt-4">
                                <p className="font-bold">Customer:</p>
                                {customerName ? (
                                    <p className="flex items-center h-3">{customerName}</p>
                                ) : (
                                    <p className="border-b-2 border-dotted border-gray-400 w-64 h-4"></p>
                                )}
                            </div>
                        </div>
                        <div className="text-sm">
                            <p><strong>QUOTATION NO.</strong></p>
                            <p><strong>DATE:</strong> {format(new Date(), 'MM/dd/yyyy')}</p>
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-200">
                                <TableHead className="text-black font-bold py-1 px-3 text-xs align-middle">DETAILS</TableHead>
                                <TableHead className="text-center text-black font-bold py-1 px-3 text-xs align-middle">QTY</TableHead>
                                <TableHead className="text-right text-black font-bold py-1 px-3 text-xs align-middle">RATE</TableHead>
                                <TableHead className="text-right text-black font-bold py-1 px-3 text-xs align-middle">AMOUNT</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(groupedOrders).map(([groupKey, groupData]) => {
                                const isClientOwned = groupData.productType === 'Client Owned';
                                const isPatches = groupData.productType === 'Patches';
                                const patchPrice = isPatches ? groupData.orders[0]?.pricePerPatch || 0 : 0;
                                const unitPrice = getUnitPrice(groupData.productType, groupData.totalQuantity, groupData.embroidery, pricingConfig, patchPrice, orderType);
                                const { logoFee, backTextFee } = getProgrammingFees(groupData.totalQuantity, groupData.embroidery, isClientOwned, orderType);
                                const itemsSubtotal = groupData.totalQuantity * unitPrice;
                                
                                const groupAddOns = { backLogo: 0, names: 0, plusSize: 0, rushFee: 0, shippingFee: 0, logoProgramming: 0, backDesignProgramming: 0, holdingFee: 0, ...(addOns[groupKey] || {}) };
                                const backLogoPrice = getAddOnPrice('backLogo', groupData.totalQuantity, pricingConfig);
                                const namesPrice = getAddOnPrice('names', groupData.totalQuantity, pricingConfig);
                                const plusSizePrice = getAddOnPrice('plusSize', groupData.totalQuantity, pricingConfig);
                                
                                const finalLogoFee = !removedFees[groupKey]?.logo ? logoFee : 0;
                                const finalBackTextFee = !removedFees[groupKey]?.backText ? backTextFee : 0;

                                const groupDiscount = discounts[groupKey];
                                let discountAmount = 0;
                                if(groupDiscount) {
                                    const subtotalForDiscount = itemsSubtotal + (finalLogoFee + finalBackTextFee) + 
                                        (groupAddOns.backLogo * backLogoPrice) + 
                                        (groupAddOns.names * namesPrice) + 
                                        (groupAddOns.plusSize * plusSizePrice) + 
                                        groupAddOns.rushFee + 
                                        groupAddOns.shippingFee +
                                        groupAddOns.logoProgramming +
                                        groupAddOns.backDesignProgramming +
                                        groupAddOns.holdingFee;

                                    if (groupDiscount.type === 'percentage') {
                                        discountAmount = subtotalForDiscount * (groupDiscount.value / 100);
                                    } else {
                                        discountAmount = groupDiscount.value;
                                    }
                                }

                                return (
                                    <React.Fragment key={groupKey}>
                                        <TableRow>
                                            <TableCell className="font-bold py-1.5 px-3 align-middle">
                                                {groupData.productType}
                                                <p className="text-xs font-normal pl-4">- Sizes: {groupData.orders.map(o => o.size).join(', ')}</p>
                                                <p className="text-xs font-normal pl-4">- Free Design and Layout</p>
                                            </TableCell>
                                            <TableCell className="text-center py-1.5 px-3 align-middle">{groupData.totalQuantity}</TableCell>
                                            <TableCell className="text-right py-1.5 px-3 align-middle">{formatCurrency(unitPrice)}</TableCell>
                                            <TableCell className="text-right py-1.5 px-3 align-middle">{formatCurrency(itemsSubtotal)}</TableCell>
                                        </TableRow>
                                        
                                        {(finalLogoFee > 0 || finalBackTextFee > 0) && (
                                            <TableRow>
                                                <TableCell className="pl-8 text-xs py-1.5 px-3 align-middle">Programming Fee<p className="text-xs font-normal pl-4">- One-Time Payment</p></TableCell>
                                                <TableCell className="text-center text-xs py-1.5 px-3 align-middle">{ (finalLogoFee > 0 ? 1 : 0) + (finalBackTextFee > 0 ? 1 : 0) }</TableCell>
                                                <TableCell className="text-right text-xs py-1.5 px-3 align-middle">{formatCurrency(finalLogoFee > 0 ? finalLogoFee : finalBackTextFee)}</TableCell>
                                                <TableCell className="text-right text-xs py-1.5 px-3 align-middle">{formatCurrency(finalLogoFee + finalBackTextFee)}</TableCell>
                                            </TableRow>
                                        )}

                                        {groupAddOns.backLogo > 0 && <TableRow><TableCell className="pl-8 text-xs py-1.5 px-3 align-middle">Add On: Back Logo</TableCell><TableCell className="text-center text-xs py-1.5 px-3 align-middle">{groupAddOns.backLogo}</TableCell><TableCell className="text-right text-xs py-1.5 px-3 align-middle">{formatCurrency(backLogoPrice)}</TableCell><TableCell className="text-right text-xs py-1.5 px-3 align-middle">{formatCurrency(groupAddOns.backLogo * backLogoPrice)}</TableCell></TableRow>}
                                        {groupAddOns.names > 0 && <TableRow><TableCell className="pl-8 text-xs py-1.5 px-3 align-middle">Add On: Names</TableCell><TableCell className="text-center text-xs py-1.5 px-3 align-middle">{groupAddOns.names}</TableCell><TableCell className="text-right text-xs py-1.5 px-3 align-middle">{formatCurrency(namesPrice)}</TableCell><TableCell className="text-right text-xs py-1.5 px-3 align-middle">{formatCurrency(groupAddOns.names * namesPrice)}</TableCell></TableRow>}
                                        {groupAddOns.plusSize > 0 && <TableRow><TableCell className="pl-8 text-xs py-1.5 px-3 align-middle">Add On: Plus Size</TableCell><TableCell className="text-center text-xs py-1.5 px-3 align-middle">{groupAddOns.plusSize}</TableCell><TableCell className="text-right text-xs py-1.5 px-3 align-middle">{formatCurrency(plusSizePrice)}</TableCell><TableCell className="text-right text-xs py-1.5 px-3 align-middle">{formatCurrency(groupAddOns.plusSize * plusSizePrice)}</TableCell></TableRow>}
                                        {groupAddOns.rushFee > 0 && <TableRow><TableCell className="pl-8 text-xs py-1.5 px-3 align-middle">Add On: Rush Fee</TableCell><TableCell className="py-1.5 px-3 align-middle"></TableCell><TableCell className="py-1.5 px-3 align-middle"></TableCell><TableCell className="text-right text-xs py-1.5 px-3 align-middle">{formatCurrency(groupAddOns.rushFee)}</TableCell></TableRow>}
                                        {groupAddOns.shippingFee > 0 && <TableRow><TableCell className="pl-8 text-xs py-1.5 px-3 align-middle">Add On: Shipping Fee</TableCell><TableCell className="py-1.5 px-3 align-middle"></TableCell><TableCell className="py-1.5 px-3 align-middle"></TableCell><TableCell className="text-right text-xs py-1.5 px-3 align-middle">{formatCurrency(groupAddOns.shippingFee)}</TableCell></TableRow>}
                                        {groupAddOns.logoProgramming > 0 && <TableRow><TableCell className="pl-8 text-xs py-1.5 px-3 align-middle">Add On: Logo Programming</TableCell><TableCell className="py-1.5 px-3 align-middle"></TableCell><TableCell className="py-1.5 px-3 align-middle"></TableCell><TableCell className="text-right text-xs py-1.5 px-3 align-middle">{formatCurrency(groupAddOns.logoProgramming)}</TableCell></TableRow>}
                                        {groupAddOns.backDesignProgramming > 0 && <TableRow><TableCell className="pl-8 text-xs py-1.5 px-3 align-middle">Add On: Back Design Programming</TableCell><TableCell className="py-1.5 px-3 align-middle"></TableCell><TableCell className="py-1.5 px-3 align-middle"></TableCell><TableCell className="text-right text-xs py-1.5 px-3 align-middle">{formatCurrency(groupAddOns.backDesignProgramming)}</TableCell></TableRow>}
                                        {groupAddOns.holdingFee > 0 && <TableRow><TableCell className="pl-8 text-xs py-1.5 px-3 align-middle">Add On: Holding Fee</TableCell><TableCell className="py-1.5 px-3 align-middle"></TableCell><TableCell className="py-1.5 px-3 align-middle"></TableCell><TableCell className="text-right text-xs py-1.5 px-3 align-middle">{formatCurrency(groupAddOns.holdingFee)}</TableCell></TableRow>}
                                        {groupDiscount && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-right font-bold text-destructive text-xs py-1.5 px-3 align-middle">
                                                    Discount {groupDiscount.reason ? `(${groupDiscount.reason})` : ''} ({groupDiscount.type === 'percentage' ? `${groupDiscount.value}%` : formatCurrency(groupDiscount.value)})
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-destructive text-xs py-1.5 px-3 align-middle">-{formatCurrency(discountAmount)}</TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                        <ShadTableFooter>
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold py-1 px-3">TOTAL</TableCell>
                                <TableCell className="text-right font-bold py-1 px-3">{formatCurrency(grandTotal)}</TableCell>
                            </TableRow>
                        </ShadTableFooter>
                    </Table>
                    <div className="mt-24 flex justify-between text-xs">
                        <div className="w-64 text-center">
                            <p className="border-b-2 border-dotted border-gray-400 pb-1 font-bold h-7 text-center text-xs">
                                {userProfile?.nickname || ''}
                            </p>
                            <p className="text-xs mt-1">Prepared By</p>
                        </div>
                         <div className="w-64 text-center">
                            <p className="border-b-2 border-dotted border-gray-400 h-7"></p>
                            <p className="text-xs mt-1">Noted By</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
