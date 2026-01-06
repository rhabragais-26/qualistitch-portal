'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, CheckSquare } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
};

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  location: string;
  salesRepresentative: string;
  priorityType: 'Rush' | 'Regular';
  paymentType: string;
  orderType: string;
  orders: Order[];
  submissionDateTime: string;
  courier: string;
};

export default function JobOrderPage() {
  const { id } = useParams();
  const firestore = useFirestore();

  const leadRef = useMemoFirebase(
    () => (firestore && id ? doc(firestore, 'leads', id as string) : null),
    [firestore, id]
  );

  const { data: lead, isLoading, error } = useDoc<Lead>(leadRef);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
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

  if (!lead) {
    return <div className="p-10">Lead not found.</div>;
  }

  const deliveryDate = addDays(new Date(lead.submissionDateTime), lead.priorityType === 'Rush' ? 7 : 22);
  const totalQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);

  return (
    <div className="bg-white text-black min-h-screen">
      <div className="fixed top-4 right-4 no-print">
        <Button onClick={handlePrint} className="text-white font-bold">
          <Printer className="mr-2 h-4 w-4" />
          Print J.O.
        </Button>
      </div>
      <div className="p-10 mx-auto max-w-4xl printable-area">
        <div className="text-right mb-4">
            <p className="font-bold inline-block border-b-2 border-black pb-1">JO No. ________________</p>
        </div>
        <h1 className="text-2xl font-bold text-center mb-6 border-b-4 border-black pb-2">JOB ORDER FORM</h1>

        <div className="grid grid-cols-2 gap-x-8 text-sm mb-6 border-b border-black pb-4">
            <div className="space-y-2">
                <p><strong>Client Name:</strong> {lead.customerName}</p>
                <p><strong>Date of Transaction:</strong> {format(new Date(lead.submissionDateTime), 'MMMM d, yyyy')}</p>
                <p><strong>Terms of Payment:</strong> {lead.paymentType}</p>
                <p><strong>Recipient's Name:</strong> {lead.customerName}</p>
                <p><strong>Delivery Date:</strong> {format(deliveryDate, 'MMM, d')}</p>
            </div>
             <div className="space-y-2">
                <p><strong>SCES Name:</strong> {lead.salesRepresentative}</p>
                <p><strong>Type of Order:</strong> {lead.orderType}</p>
                <p><strong>Courier:</strong> {lead.courier}</p>
                <p><strong>Contact No:</strong> {lead.contactNumber}</p>
            </div>
             <div className="col-span-2 mt-2">
                <p><strong>Delivery Address:</strong> {lead.location}</p>
            </div>
        </div>

        <h2 className="text-xl font-bold text-center mb-4">ORDER DETAILS</h2>
        <table className="w-full border-collapse border border-black text-sm mb-4">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black p-2" colSpan={3}>Item Description</th>
              <th className="border border-black p-2" rowSpan={2}>Qty</th>
              <th className="border border-black p-2" colSpan={2}>Front Design</th>
              <th className="border border-black p-2" colSpan={2}>Back Design</th>
              <th className="border border-black p-2" rowSpan={2}>Remarks</th>
            </tr>
            <tr className="bg-gray-200">
              <th className="border border-black p-2 font-medium">Type of Product</th>
              <th className="border border-black p-2 font-medium">Color</th>
              <th className="border border-black p-2 font-medium">Size</th>
              <th className="border border-black p-2 font-medium">Left</th>
              <th className="border border-black p-2 font-medium">Right</th>
              <th className="border border-black p-2 font-medium">Back Logo</th>
              <th className="border border-black p-2 font-medium">Back Text</th>
            </tr>
          </thead>
          <tbody>
            {lead.orders.map((order, index) => (
              <tr key={index}>
                <td className="border border-black p-2">{order.productType}</td>
                <td className="border border-black p-2">{order.color}</td>
                <td className="border border-black p-2 text-center">{order.size}</td>
                <td className="border border-black p-2 text-center">{order.quantity}</td>
                <td className="border border-black p-2 text-center"><CheckSquare className="mx-auto" size={16} /></td>
                <td className="border border-black p-2 text-center">N/A</td>
                <td className="border border-black p-2 text-center">N/A</td>
                <td className="border border-black p-2 text-center"><CheckSquare className="mx-auto" size={16} /></td>
                <td className="border border-black p-2"></td>
              </tr>
            ))}
             <tr>
                <td colSpan={3} className="text-right font-bold p-2">TOTAL</td>
                <td className="text-center font-bold p-2">{totalQuantity} PCS</td>
                <td colSpan={5}></td>
            </tr>
          </tbody>
        </table>

        <div className="text-sm mb-8">
            <p><strong>Note:</strong> Specific details for logo and back text on the next page</p>
        </div>

        <div className="grid grid-cols-2 gap-x-16 gap-y-10 text-xs">
            <div className="space-y-1">
                <p>Prepared by:</p>
                <p className="pt-8 border-b border-black text-center font-semibold">{lead.salesRepresentative.toUpperCase()}</p>
                <p className="text-center">(Name & Signature, Date)</p>
                <p className="text-center">Customer Service Representative</p>
            </div>
             <div className="space-y-1">
                <p>Noted by:</p>
                <p className="pt-8 border-b border-black text-center font-semibold">MYREZA BANAWON</p>
                <p className="text-center">(Name & Signature, Date)</p>
                 <p className="text-center">Sales Head</p>
            </div>

            <div>
                <p>Approved by:</p>
            </div>
            <div></div>


            <div className="space-y-1">
                <p className="pt-8 border-b border-black"></p>
                <p className="text-center">(Name & Signature, Date)</p>
                <p className="text-center font-semibold">Programming</p>
            </div>
            <div className="space-y-1">
                <p className="pt-8 border-b border-black"></p>
                <p className="text-center">(Name & Signature, Date)</p>
                <p className="text-center font-semibold">Inventory</p>
            </div>
            <div className="space-y-1">
                <p className="pt-8 border-b border-black"></p>
                <p className="text-center">(Name & Signature, Date)</p>
                <p className="text-center font-semibold">Production Line Leader</p>
            </div>
            <div className="space-y-1">
                <p className="pt-8 border-b border-black"></p>
                <p className="text-center">(Name & Signature, Date)</p>
                <p className="text-center font-semibold">Production Supervisor</p>
            </div>
             <div className="space-y-1">
                <p className="pt-8 border-b border-black"></p>
                <p className="text-center">(Name & Signature, Date)</p>
                <p className="text-center font-semibold">Quality Control</p>
            </div>
            <div className="space-y-1">
                <p className="pt-8 border-b border-black"></p>
                <p className="text-center">(Name & Signature, Date)</p>
                <p className="text-center font-semibold">Logistics</p>
            </div>
             <div className="col-span-2 mx-auto w-1/2 space-y-1 pt-4">
                <p className="pt-8 border-b border-black"></p>
                <p className="text-center">(Name & Signature, Date)</p>
                <p className="text-center font-semibold">Operations Supervisor</p>
            </div>
        </div>

      </div>
    </div>
  );
}
