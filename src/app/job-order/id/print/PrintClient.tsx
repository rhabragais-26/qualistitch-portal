'use client';

import { useFirestore } from '@/firebase';
import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { useParams, useSearchParams } from 'next/navigation';
import { format, addDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { toTitleCase } from '@/lib/utils';

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
  recipientName?: string;
  companyName?: string;
  contactNumber: string;
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
};

export default function PrintClient() { // Renamed the function and exported as default
  const params = useParams();
  const searchParams = useSearchParams();
  const id = React.useMemo(() => (params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : ''), [params]);
  const isViewOnly = searchParams.get('view') === 'true';
  const firestore = useFirestore();
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLeadData = async () => {
      if (!id) {
        if(isMounted) setError(new Error("Job order ID is missing."));
        return null;
      }

      const storedLeadData = localStorage.getItem(`job-order-${id}`);
      if (storedLeadData) {
        try {
          return JSON.parse(storedLeadData);
        } catch (e) {
          if(isMounted) setError(new Error("Failed to parse job order data."));
          return null;
        }
      }

      if (firestore) {
        const leadDocRef = doc(firestore, 'leads', id as string);
        try {
          const docSnap = await getDoc(leadDocRef);
          if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Lead;
          } else {
            if(isMounted) setError(new Error('Job order not found.'));
            return null;
          }
        } catch (err) {
          console.error("Error fetching job order for print:", err);
           if(isMounted) {
            if (err instanceof Error) {
                setError(err);
            } else {
                setError(new Error('An unknown error occurred during fetch.'));
            }
           }
          return null;
        }
      }
      return null;
    };

    const runPrintFlow = async () => {
      const leadData = await fetchLeadData();
      if (isMounted) {
        if (leadData) {
          setLead(leadData);
          setIsLoading(false);
          if (!isViewOnly) {
            setTimeout(() => window.print(), 500);
          }
        } else {
          setIsLoading(false);
          if (!error) {
            setError(new Error("Job order data could not be loaded for printing. Please close this tab and try again."));
          }
        }
      }
    };

    runPrintFlow();
    
    const handleAfterPrint = () => {
      if (id) {
        localStorage.removeItem(`job-order-${id}`);
      }
      if (!isViewOnly) {
        window.close();
      }
    };

    if (!isViewOnly) {
      window.addEventListener('afterprint', handleAfterPrint);
    }

    return () => {
      if (isMounted) {
          isMounted = false;
          if (!isViewOnly) {
              window.removeEventListener('afterprint', handleAfterPrint);
          }
          if (id) {
            localStorage.removeItem(`job-order-${id}`);
          }
      }
    };
  }, [firestore, id, error, isViewOnly]);
  
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
  const deliveryDate = lead.deliveryDate ? format(new Date(lead.deliveryDate), "MMM dd, yyyy") : format(addDays(new Date(lead.submissionDateTime), lead.priorityType === 'Rush' ? 7 : 22), "MMM dd, yyyy");
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
           (layout.namedOrders && layout.namedOrders.length > 0 && layout.namedOrders.some(o => o.name || o.backText));
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

        <div className="grid grid-cols-3 gap-x-8 text-sm mb-6 border-b border-black pb-4">
            <div className="space-y-1">
                <p><strong>Client Name:</strong> {lead.customerName}</p>
                <p><strong>Contact No:</strong> {getContactDisplay()}</p>
                <p><strong>Delivery Address:</strong> <span className="whitespace-pre-wrap">{lead.location}</span></p>
            </div>
            <div className="space-y-1">
                <p><strong>Date of Transaction:</strong> {format(new Date(lead.submissionDateTime), 'MMM dd, yyyy')}</p>
                <p><strong>Type of Order:</strong> {lead.orderType}</p>
                <p><strong>Terms of Payment:</strong> {lead.paymentType}</p>
                <p><strong>SCES Name:</strong> {toTitleCase(lead.scesFullName || lead.salesRepresentative)}</p>
            </div>
            <div className="space-y-1">
                <p><strong>Recipient's Name:</strong> {lead.recipientName || lead.customerName}</p>
                <p><strong>Courier:</strong> {lead.courier}</p>
                <p><strong>Delivery Date:</strong> {deliveryDate || 'N/A'}</p>
            </div>
        </div>

        <h2 className="text-xl font-bold text-center mb-4">ORDER DETAILS</h2>
        <table className="w-full border-collapse border border-black text-xs mb-2">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black p-1">Qty</th>
              <th className="border border-black p-1">Type</th>
              <th className="border border-black p-1">Color</th>
              <th className="border border-black p-1">Size</th>
              <th className="border border-black p-1">Design</th>
              <th className="border border-black p-1">Remarks/Specifics</th>
            </tr>
          </thead>
          <tbody>
            {lead.orders.map((order, index) => (
                <tr key={index}>
                    <td className="border border-black p-1 text-center">{order.quantity}</td>
                    <td className="border border-black p-1">{order.productType}</td>
                    <td className="border border-black p-1">{order.color}</td>
                    <td className="border border-black p-1 text-center">{order.size}</td>
                    <td className="border border-black p-1">
                        <div className="flex justify-center items-center space-x-2">
                            {order.design?.left && <span className="text-xxs">L</span>}
                            {order.design?.right && <span className="text-xxs">R</span>}
                            {order.design?.backLogo && <span className="text-xxs">BL</span>}
                            {order.design?.backText && <span className="text-xxs">BT</span>}
                        </div>
                    </td>
                    <td className="border border-black p-1 whitespace-pre-wrap">{order.remarks}</td>
                </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className="border border-black p-1 text-center bg-gray-200">{totalQuantity}</td>
              <td className="border border-black p-1 bg-gray-200" colSpan={5}>Total Quantity</td>
            </tr>
          </tfoot>
        </table>
        {/* Continue adding the rest of your original HTML structure here if any was cut off */}
      </div>
    </div>
  );
}