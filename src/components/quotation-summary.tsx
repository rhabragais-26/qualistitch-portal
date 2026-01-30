'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as ShadTableFooter } from '@/components/ui/table';
import { getProductGroup, getUnitPrice, getProgrammingFees, type EmbroideryOption, getAddOnPrice, type PricingConfig } from '@/lib/pricing';
import { AddOns, Discount } from "./invoice-dialogs";
import { formatCurrency } from '@/lib/utils';
import {![CDATA['use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as ShadTableFooter } from '@/components/ui/table';
import { getProductGroup, getUnitPrice, getProgrammingFees, type EmbroideryOption, getAddOnPrice, type PricingConfig } from '@/lib/pricing';
import { AddOns, Discount } from "./invoice-dialogs";
import { formatCurrency } from '@/lib/utils';
import { useFirestore, useDoc, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { doc } from 'firebase/firestore';
import { initialPricingConfig } from '@/lib/pricing-data';
import Image from 'next/image';
import { Button } from './ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useFormContext } from 'react-hook-form';
import { QuotationFormValues, type Order } from '@/lib/form-schemas';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { Skeleton } from './ui/skeleton';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

type QuotationSummaryProps = {
  orders: Order[];
  orderType?: 'MTO' | 'Personalize' | 'Customize' | 'Stock Design' | 'Stock (Jacket Only)' | 'Services' | 'Item Sample';
  addOns: Record<string, AddOns>;
  discounts: Record<string, Discount>;
  grandTotal: number;
};

export function QuotationSummary({ orders, orderType, addOns, discounts, grandTotal }: QuotationSummaryProps) {
    const { watch } = useFormContext<QuotationFormValues>();
    const customerName = watch('customerName');
    
    const app = useFirebaseApp();
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoLoading, setLogoLoading] = useState(true);

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

    const handlePrint = () => {
        window.print();
    };

    const groupedOrders = useMemo(() => {
      return orders.reduce((acc, order) => {
        const isClientOwned = order.productType === 'Client Owned';
        const isPatches = order.productType === 'Patches';
        const productGroup = getProductGroup(order.productType, pricingConfig);
        
        if (!productGroup && !isClientOwned && order.productType !== 'Patches') return acc;
  
        const embroidery = order.embroidery || 'logo';
        const groupKey = `${order.productType}-${embroidery}`;
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
                <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print</Button>
            </CardHeader>
            <CardContent>
                 <div className="p-8 printable-quotation" id="quotation-content">
                    <header className="flex justify-between items-start mb-8">
                        <div>
                            <h1 className="font-bold text-lg mb-2">BURDA PINAS</h1>
                            <p className="text-sm text-gray-500">Owned and Operated by: QUALISTITCH INCORPORATED</p>
                            <div className="flex">
                                <p className="text-xs shrink-0 font-bold">Address:&nbsp;</p>
                                <div className='pl-2'>
                                    <p className="text-xs">005 Holy Family Subdivision, Silangan</p>
                                    <p className="text-xs">San Mateo, Rizal, Philippines 1850</p>
                                </div>
                            </div>
                            <p className="text-xs"><span className="font-bold">Mobile No:</span> 0966 278 2437 | 0956 204 1950 | 0956 204 1919</p>
                            <p className="text-xs"><span className="font-bold">Landline No:</span> (02) 8997-0105 | (02) 8997-0098</p>
                            <p className="text-xs"><span className="font-bold">VAT Reg. TIN:</span> 675-385-158-00000</p>
                        </div>
                        <div className="relative h-32 w-32">
                           {logoLoading ? (
                                <Skeleton className="h-full w-full" />
                            ) : logoUrl ? (
                                <Image src={logoUrl} alt="Qualistitch Inc. Logo" fill className="object-contain" />
                            ) : (
                                <div className="h-full w-full bg-gray-200 flex items-center justify-center text-xs text-center text-gray-500">Logo not found</div>
                            )}
                        </div>
                    </header>

                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-xl font-bold">Quotation</h2>
                             <div className="flex items-center gap-2 mt-4">
                                <p className="font-bold">BILLED TO:</p>
                                {customerName ? (
                                    <p className="flex items-center h-4">{customerName}</p>
                                ) : (
                                    <p className="border-b-2 border-dotted border-gray-400 w-64 h-4"></p>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p><strong>QUOTATION NO.</strong></p>
                            <p><strong>DATE:</strong> {format(new Date(), 'MM/dd/yyyy')}</p>
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-200">
                                <TableHead className="py-0">DETAILS</TableHead>
                                <TableHead className="text-center py-0">QTY</TableHead>
                                <TableHead className="text-right py-0">RATE</TableHead>
                                <TableHead className="text-right py-0">AMOUNT</TableHead>
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

                                return (
                                    <React.Fragment key={groupKey}>
                                        <TableRow>
                                            <TableCell className="font-bold py-0">{groupData.productType}
                                                <p className="text-xs font-normal pl-4">*** Sizes: {groupData.orders.map(o => o.size).join(', ')}</p>
                                                <p className="text-xs font-normal pl-4">*** Free Design and Layout</p>
                                            </TableCell>
                                            <TableCell className="text-center py-0">{groupData.totalQuantity}</TableCell>
                                            <TableCell className="text-right py-0">{formatCurrency(unitPrice)}</TableCell>
                                            <TableCell className="text-right py-0">{formatCurrency(itemsSubtotal)}</TableCell>
                                        </TableRow>
                                        
                                        {groupData.embroidery === 'logo' && <TableRow><TableCell className="pl-8 font-bold py-0">Embroidery Logo<p className="text-xs font-normal pl-4">*** Front Left Chest Logo</p></TableCell><TableCell className="py-0"></TableCell><TableCell className="py-0"></TableCell><TableCell className="py-0"></TableCell></TableRow>}
                                        {groupData.embroidery === 'name' && <TableRow><TableCell className="pl-8 font-bold py-0">Embroidery Name</TableCell><TableCell className="py-0"></TableCell><TableCell className="py-0"></TableCell><TableCell className="py-0"></TableCell></TableRow>}
                                        {groupData.embroidery === 'logoAndText' && (
                                            <>
                                                <TableRow><TableCell className="pl-8 font-bold py-0">Embroidery Logo<p className="text-xs font-normal pl-4">*** Front Left Chest Logo</p></TableCell><TableCell className="py-0"></TableCell><TableCell className="py-0"></TableCell><TableCell className="py-0"></TableCell></TableRow>
                                                <TableRow><TableCell className="pl-8 font-bold py-0">Embroidery Name<p className="text-xs font-normal pl-4">*** Back Texts</p></TableCell><TableCell className="py-0"></TableCell><TableCell className="py-0"></TableCell><TableCell className="py-0"></TableCell></TableRow>
                                            </>
                                        )}
                                        
                                        {(logoFee > 0 || backTextFee > 0) && (
                                            <TableRow>
                                                <TableCell className="font-bold py-0">Programming Fee<p className="text-xs font-normal pl-4">*** One-Time Payment</p></TableCell>
                                                <TableCell className="text-center py-0">{ (logoFee > 0 ? 1 : 0) + (backTextFee > 0 ? 1 : 0) }</TableCell>
                                                <TableCell className="text-right py-0">{formatCurrency(logoFee > 0 ? logoFee : backTextFee)}</TableCell>
                                                <TableCell className="text-right py-0">{formatCurrency(logoFee + backTextFee)}</TableCell>
                                            </TableRow>
                                        )}

                                        {groupAddOns.backLogo > 0 && <TableRow><TableCell className="pl-8 font-bold py-0">Add On: Back Logo</TableCell><TableCell className="text-center py-0">{groupAddOns.backLogo}</TableCell><TableCell className="text-right py-0">{formatCurrency(backLogoPrice)}</TableCell><TableCell className="text-right py-0">{formatCurrency(groupAddOns.backLogo * backLogoPrice)}</TableCell></TableRow>}
                                        {groupAddOns.names > 0 && <TableRow><TableCell className="pl-8 font-bold py-0">Add On: Names</TableCell><TableCell className="text-center py-0">{groupAddOns.names}</TableCell><TableCell className="text-right py-0">{formatCurrency(namesPrice)}</TableCell><TableCell className="text-right py-0">{formatCurrency(groupAddOns.names * namesPrice)}</TableCell></TableRow>}

                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                        <ShadTableFooter>
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold text-sm py-0">TOTAL</TableCell>
                                <TableCell className="text-right font-bold text-sm py-0">{formatCurrency(grandTotal)}</TableCell>
                            </TableRow>
                        </ShadTableFooter>
                    </Table>
                    <div className="mt-24 flex justify-between">
                        <div>
                            <p className="border-b-2 border-dotted border-gray-400 w-64"></p>
                            <p className="text-center">Prepared By</p>
                        </div>
                         <div>
                            <p className="border-b-2 border-dotted border-gray-400 w-64"></p>
                            <p className="text-center">Noted By</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
