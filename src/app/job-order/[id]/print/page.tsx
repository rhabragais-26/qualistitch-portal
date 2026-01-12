'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { format, addDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { useEffect } from 'react';


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
  customerName: string;
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

export default function JobOrderPrintPage() {
  const { id } = useParams();
  const firestore = useFirestore();

  const leadRef = useMemoFirebase(
    () => (firestore && id ? doc(firestore, 'leads', id as string) : null),
    [firestore, id]
  );

  const { data: lead, isLoading, error } = useDoc<Lead>(leadRef);

  useEffect(() => {
    if (!isLoading && lead) {
      setTimeout(() => window.print(), 1000);
    }
  }, [isLoading, lead]);

  if (isLoading || !lead) {
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

  const joNumber = lead.joNumber ? `QSBP-${new Date().getFullYear().toString().slice(-2)}-${lead.joNumber.toString().padStart(5, '0')}` : 'Not Saved';
  const deliveryDate = lead.deliveryDate ? new Date(lead.deliveryDate) : addDays(new Date(lead.submissionDateTime), lead.priorityType === 'Rush' ? 7 : 22);
  const totalQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);

  const getContactDisplay = () => {
    const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
    const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;

    if (mobile && landline) {
      return `${mobile} / ${landline}`;
    }
    return mobile || landline || 'N/A';
  };
  
  const hasLayoutContent = (layout: Layout) => {
    return layout.layoutImage || 
           layout.dstLogoLeft || 
           layout.dstLogoRight || 
           layout.dstBackLogo || 
           layout.dstBackText || 
           (layout.namedOrders && layout.namedOrders.length > 0);
  };
  
  const layoutsToPrint = lead.layouts?.filter(hasLayoutContent) || [];


  return (
    <div className="bg-white text-black min-h-screen">
      {/* Job Order Form Page */}
      <div className="p-10 mx-auto max-w-4xl printable-area print-page">
        <div className="text-left mb-4">
            <p className="font-bold"><span className="text-primary">J.O. No:</span> <span className="inline-block border-b border-black">{joNumber}</span></p>
        </div>
        <h1 className="text-2xl font-bold text-center mb-6 border-b-4 border-black pb-2">JOB ORDER FORM</h1>

        <div className="grid grid-cols-3 gap-x-4 text-sm mb-6 border-b border-black pb-4">
            <div className="space-y-1">
                <p><strong>Client Name:</strong> {lead.customerName}</p>
                <p><strong>Recipient's Name:</strong> {lead.customerName}</p>
                <p><strong>Contact No:</strong> {getContactDisplay()}</p>
            </div>
             <div className="space-y-1">
                <p><strong>Date of Transaction:</strong> {format(new Date(lead.submissionDateTime), 'MMMM d, yyyy')}</p>
                <p><strong>Type of Order:</strong> {lead.orderType}</p>
                <p><strong>SCES Name:</strong> {lead.salesRepresentative}</p>
            </div>
            <div className="space-y-1">
                 <p><strong>Terms of Payment:</strong> {lead.paymentType}</p>
                <p><strong>Courier:</strong> {lead.courier}</p>
                <p><strong>Delivery Date:</strong> {deliveryDate ? format(deliveryDate, 'MMMM dd, yyyy') : 'N/A'}</p>
            </div>
            <div className="col-start-2 col-span-2 mt-1">
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
                    <Checkbox className="mx-auto" checked={order.design?.left || false} readOnly />
                </td>
                <td className="border border-black p-0.5 text-center">
                   <Checkbox className="mx-auto" checked={order.design?.right || false} readOnly />
                </td>
                <td className="border border-black p-0.5 text-center">
                  <Checkbox className="mx-auto" checked={order.design?.backLogo || false} readOnly />
                </td>
                <td className="border border-black p-0.5 text-center">
                  <Checkbox className="mx-auto" checked={order.design?.backText || false} readOnly />
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
                <p className="text-center font-bold">Sales & Customer Engagement Specialist</p>
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
      {layoutsToPrint.map((layout, layoutIndex) => (
        <div key={layout.id || `layout-${layoutIndex}`} className="p-10 mx-auto max-w-4xl printable-area print-page">
          <div className="text-left mb-4">
              <p className="font-bold"><span className="text-primary">J.O. No:</span> <span className="inline-block border-b border-black">{joNumber}</span> - Layout {layoutIndex + 1}</p>
          </div>
          
           {layout.layoutImage && (
             <div className="relative w-full h-[500px] border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center mb-4">
                <Image src={layout.layoutImage} alt={`Layout ${layoutIndex + 1}`} layout="fill" objectFit="contain" />
              </div>
            )}
          
          <h2 className="text-2xl font-bold text-center mb-4">
            {layoutsToPrint.length > 1 ? `LAYOUT #${layoutIndex + 1}` : "LAYOUT"}
          </h2>
            <table className="w-full border-collapse border border-black mb-6">
                <tbody>
                    <tr>
                        <td className="border border-black p-2 w-1/2"><strong>DST LOGO LEFT:</strong><p className="mt-1 whitespace-pre-wrap">{layout.dstLogoLeft}</p></td>
                        <td className="border border-black p-2 w-1/2"><strong>DST BACK LOGO:</strong><p className="mt-1 whitespace-pre-wrap">{layout.dstBackLogo}</p></td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 w-1/2"><strong>DST LOGO RIGHT:</strong><p className="mt-1 whitespace-pre-wrap">{layout.dstLogoRight}</p></td>
                        <td className="border border-black p-2 w-1/2"><strong>DST BACK TEXT:</strong><p className="mt-1 whitespace-pre-wrap">{layout.dstBackText}</p></td>
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
                </tr>
              </thead>
              <tbody>
                {layout.namedOrders.map((order, orderIndex) => (
                  <tr key={order.id || `named-order-${orderIndex}`}>
                    <td className="border border-black p-1 text-center">{orderIndex + 1}</td>
                    <td className="border border-black p-1">{order.name}</td>
                    <td className="border border-black p-1">{order.color}</td>
                    <td className="border border-black p-1">{order.size}</td>
                    <td className="border border-black p-1 text-center">{order.quantity}</td>
                    <td className="border border-black p-1">{order.backText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      ))}


      <style jsx global>{`
        @media print {
          body {
            background-color: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .printable-area {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            color: black !important;
          }
          .printable-area *, .printable-area h1, .printable-area p, .printable-area th, .printable-area td {
            color: black !important;
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
      `}</style>
    </div>
  );
}

