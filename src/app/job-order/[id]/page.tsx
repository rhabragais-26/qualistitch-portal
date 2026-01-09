
'use client';

import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  name: string;
  color: string;
  size: string;
  quantity: number;
  backText: string;
};

type Layout = {
  layoutImage?: string;
  dstLogoLeft?: string;
  dstLogoRight?: string;
  dstBackLogo?: string;
  dstBackText?: string;
  namedOrders?: NamedOrder[];
};

type Lead = {
  id: string;
  customerName: string;
  recipientName?: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  location: string;
  salesRepresentative: string;
  priorityType: 'Rush' | 'Regular';
  paymentType: string;
  orderType: string;
  orders: Order[];
  submissionDateTime: string;
  deliveryDate?: string;
  courier: string;
  joNumber?: number;
  layouts?: Layout[];
};

export default function JobOrderPage() {
  const { id } = useParams();
  const firestore = useFirestore();
  const [currentPage, setCurrentPage] = useState(1);

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: allLeads, isLoading: areAllLeadsLoading } = useCollection<Lead>(leadsQuery);

  const leadRef = useMemoFirebase(
    () => (firestore && id ? doc(firestore, 'leads', id as string) : null),
    [firestore, id]
  );

  const { data: fetchedLead, isLoading: isLeadLoading, error } = useDoc<Lead>(leadRef);
  const [lead, setLead] = useState<Lead | null>(null);
  const [joNumber, setJoNumber] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();

  useEffect(() => {
    if (fetchedLead) {
      const initializedOrders = fetchedLead.orders.map(order => ({
        ...order,
        remarks: order.remarks || '',
        design: order.design || { left: false, right: false, backLogo: false, backText: false }
      }));
      
      const initializedLayouts = (fetchedLead.layouts && fetchedLead.layouts.length > 0) 
        ? fetchedLead.layouts.map(layout => ({
            ...layout,
            namedOrders: (layout.namedOrders && layout.namedOrders.length > 0) ? layout.namedOrders : [{ name: '', color: '', size: '', quantity: 0, backText: '' }]
          }))
        : [{ 
            layoutImage: '', 
            dstLogoLeft: '', 
            dstLogoRight: '', 
            dstBackLogo: '', 
            dstBackText: '', 
            namedOrders: [{ name: '', color: '', size: '', quantity: 0, backText: '' }] 
          }];

      setLead({
        ...fetchedLead,
        recipientName: fetchedLead.recipientName || fetchedLead.customerName,
        orders: initializedOrders,
        courier: fetchedLead.courier || 'Pick-up',
        layouts: initializedLayouts,
      });

      if (fetchedLead.deliveryDate) {
        setDeliveryDate(new Date(fetchedLead.deliveryDate));
      } else {
        const calculatedDeliveryDate = addDays(new Date(fetchedLead.submissionDateTime), fetchedLead.priorityType === 'Rush' ? 7 : 22);
        setDeliveryDate(calculatedDeliveryDate);
      }
    }
  }, [fetchedLead]);

  useEffect(() => {
    if (lead && allLeads) {
      const currentYear = new Date().getFullYear().toString().slice(-2);
      if (lead.joNumber) {
        setJoNumber(`QSBP-${currentYear}-${lead.joNumber.toString().padStart(5, '0')}`);
      } else {
        // This part is for display only before saving. The actual number is set on save.
        const leadsThisYear = allLeads.filter(l => l.joNumber && new Date(l.submissionDateTime).getFullYear() === new Date().getFullYear());
        const maxJoNumber = leadsThisYear.reduce((max, l) => Math.max(max, l.joNumber || 0), 0);
        const newJoNum = maxJoNumber + 1;
        setJoNumber(`QSBP-${currentYear}-${newJoNum.toString().padStart(5, '0')}`);
      }
    }
  }, [lead, allLeads]);

  if (isLeadLoading || areAllLeadsLoading || !lead) {
    return (
      <div className="p-10 bg-white">
        <div className="flex justify-center items-center gap-4 py-4">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-9 w-24" />
      </div>
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

  if (!fetchedLead) {
    return <div className="p-10">Lead not found.</div>;
  }

  const totalQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
  const totalPages = 1 + (lead.layouts?.length || 0);

  const getContactDisplay = () => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || 'N/A';
  };

  return (
    <div className="bg-white text-black min-h-screen">
      <header className="fixed top-0 left-0 right-0 bg-white p-4 no-print shadow-md z-50">
        <div className="container mx-auto max-w-5xl flex justify-center items-center">
            <div className="flex-1 flex justify-center items-center gap-2 min-w-[300px]">
                 <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                </Button>
                <span className="text-sm font-medium text-center whitespace-nowrap w-24">{`Page ${currentPage} of ${totalPages}`}</span>
                <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
      </header>
       
      <div className="pt-20 p-10 mx-auto max-w-4xl printable-area">
        {/* Page 1 */}
        <div className={cn(currentPage !== 1 && 'hidden print:block')}>
            <div className="text-left mb-4">
                <p className="font-bold"><span className="text-primary">J.O. No:</span> <span className="inline-block border-b border-black">{lead.joNumber ? joNumber : 'Not Saved'}</span></p>
            </div>
            <h1 className="text-2xl font-bold text-center mb-6 border-b-4 border-black pb-2">JOB ORDER FORM</h1>

            <div className="grid grid-cols-2 gap-x-8 text-sm mb-6 border-b border-black pb-4">
                <div className="space-y-2">
                    <p><strong>Client Name:</strong> {lead.customerName}</p>
                    <p><strong>Date of Transaction:</strong> {format(new Date(lead.submissionDateTime), 'MMMM d, yyyy')}</p>
                    <p><strong>Terms of Payment:</strong> {lead.paymentType}</p>
                     <div className="flex items-center gap-2">
                        <p><strong>Recipient's Name:</strong> {lead.recipientName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <strong className='flex-shrink-0'>Delivery Date:</strong>
                        <p>{deliveryDate ? format(deliveryDate, 'MMMM dd, yyyy') : 'N/A'}</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <p><strong>SCES Name:</strong> {lead.salesRepresentative}</p>
                    <p><strong>Type of Order:</strong> {lead.orderType}</p>
                    <div className="flex items-center gap-2">
                        <strong className='flex-shrink-0'>Courier:</strong>
                        <p>{lead.courier}</p>
                    </div>
                    <p><strong>Contact No:</strong> {getContactDisplay()}</p>
                </div>
                <div className="col-span-2 mt-2 flex items-center gap-2">
                    <p><strong>Delivery Address:</strong> {lead.location}</p>
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
                    <td className="border border-black p-0.5">{order.productType}</td>
                    <td className="border border-black p-0.5">{order.color}</td>
                    <td className="border border-black p-0.5 text-center">{order.size}</td>
                    <td className="border border-black p-0.5 text-center">{order.quantity}</td>
                    <td className="border border-black p-0.5 text-center">
                        <Checkbox className="mx-auto pointer-events-none" checked={order.design?.left || false} />
                    </td>
                    <td className="border border-black p-0.5 text-center">
                    <Checkbox className="mx-auto pointer-events-none" checked={order.design?.right || false} />
                    </td>
                    <td className="border border-black p-0.5 text-center">
                    <Checkbox className="mx-auto pointer-events-none" checked={order.design?.backLogo || false} />
                    </td>
                    <td className="border border-black p-0.5 text-center">
                    <Checkbox className="mx-auto pointer-events-none" checked={order.design?.backText || false} />
                    </td>
                    <td className="border border-black p-0.5">
                      <p className="text-xs">{order.remarks}</p>
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
                    <p className="pt-8 border-b border-black text-center font-semibold">{lead.salesRepresentative.toUpperCase()}</p>
                    <p className="text-center font-bold">Customer Service Representative</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>
                <div className="space-y-1">
                    <p className="font-bold italic">Noted by:</p>
                    <p className="pt-8 border-b border-black text-center font-semibold">MYREZA BANAWON</p>
                    <p className="text-center font-bold">Sales Head</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>

                <div className="col-span-2 mt-0">
                    <p className="font-bold italic">Approved by:</p>
                </div>


                <div className="space-y-1">
                    <p className="pt-8 border-b border-black"></p>
                    <p className="text-center font-semibold">Programming</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>
                <div className="space-y-1">
                    <p className="pt-8 border-b border-black"></p>
                    <p className="text-center font-semibold">Inventory</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>
                <div className="space-y-1">
                    <p className="pt-8 border-b border-black"></p>
                    <p className="text-center font-semibold">Production Line Leader</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>
                <div className="space-y-1">
                    <p className="pt-8 border-b border-black"></p>
                    <p className="text-center font-semibold">Production Supervisor</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>
                <div className="space-y-1">
                    <p className="pt-8 border-b border-black"></p>
                    <p className="text-center font-semibold">Quality Control</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>
                <div className="space-y-1">
                    <p className="pt-8 border-b border-black"></p>
                    <p className="text-center font-semibold">Logistics</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>
                <div className="col-span-2 mx-auto w-1/2 space-y-1 pt-4">
                    <p className="pt-8 border-b border-black"></p>
                    <p className="text-center font-semibold">Operations Supervisor</p>
                    <p className="text-center">(Name & Signature, Date)</p>
                </div>
            </div>
        </div>

        {/* Layout Pages */}
        {lead.layouts?.map((layout, layoutIndex) => (
            <div key={layoutIndex} className={cn("page-break", currentPage !== 2 + layoutIndex && 'hidden print:block')}>
                <h1 className="text-2xl font-bold text-center my-6 border-b-4 border-black pb-2">LAYOUT {lead.layouts && lead.layouts.length > 1 ? `(${layoutIndex + 1})` : ''}</h1>
                
                {layout.layoutImage && (
                    <div className="text-center mb-6">
                        <Image src={layout.layoutImage} alt="Layout" width={800} height={600} className="mx-auto max-h-[500px] w-auto" />
                    </div>
                )}
                
                <table className="w-full border-collapse border border-black text-sm mb-6 bg-white">
                  <tbody className='bg-white'>
                    <tr>
                      <td className="border border-black p-2 w-1/2">
                        <p className="font-bold">DST LOGO LEFT:</p>
                        <p className="text-xs whitespace-pre-wrap min-h-[50px]">{layout.dstLogoLeft}</p>
                      </td>
                      <td className="border border-black p-2 w-1/2">
                        <p className="font-bold">DST BACK LOGO:</p>
                        <p className="text-xs whitespace-pre-wrap min-h-[50px]">{layout.dstBackLogo}</p>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 w-1/2">
                        <p className="font-bold">DST LOGO RIGHT:</p>
                        <p className="text-xs whitespace-pre-wrap min-h-[50px]">{layout.dstLogoRight}</p>
                      </td>
                      <td className="border border-black p-2 w-1/2">
                        <p className="font-bold">DST BACK TEXT:</p>
                        <p className="text-xs whitespace-pre-wrap min-h-[50px]">{layout.dstBackText}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <h2 className="text-xl font-bold text-center mb-4">Names</h2>
                <Table className="text-xs">
                    <TableHeader>
                        <TableRow className="bg-white hover:bg-white">
                            <TableHead className="border border-black font-medium text-black text-xs">No.</TableHead>
                            <TableHead className="border border-black font-medium text-black text-xs">Names</TableHead>
                            <TableHead className="border border-black font-medium text-black text-xs">Color</TableHead>
                            <TableHead className="border border-black font-medium text-black text-xs">Sizes</TableHead>
                            <TableHead className="border border-black font-medium text-black text-xs">Qty</TableHead>
                            <TableHead className="border border-black font-medium text-black text-xs">BACK TEXT</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {layout.namedOrders?.map((namedOrder, nameIndex) => (
                            <TableRow key={nameIndex} className="bg-white hover:bg-white">
                                <TableCell className="border border-black p-0.5 text-center text-xs">{nameIndex + 1}</TableCell>
                                <TableCell className="border border-black p-0 text-xs">{namedOrder.name}</TableCell>
                                <TableCell className="border border-black p-0 text-xs">{namedOrder.color}</TableCell>
                                <TableCell className="border border-black p-0 text-xs">{namedOrder.size}</TableCell>
                                <TableCell className="border border-black p-0 text-center text-xs">{namedOrder.quantity}</TableCell>
                                <TableCell className="border border-black p-0 text-xs">{namedOrder.backText}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        ))}

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
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            color: black !important;
          }
          .printable-area * {
            color: black !important;
          }
          .print-only {
            display: block !important;
          }
          .bg-gray-200 {
            background-color: #e5e7eb !important;
          }
          .page-break {
            page-break-before: always;
          }
          @page {
            size: auto;
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
