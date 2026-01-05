// This component is intentionally left blank. It will be created in a future step.
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

type Order = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
}

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  location: string;
  salesRepresentative: string;
  priorityType: string;
  paymentType: string;
  orderType: string;
  orders: Order[];
  submissionDateTime: string;
  lastModified: string;
}

const salesRepresentatives = ['Myreza', 'Quencess', 'Cath', 'Loise', 'Joanne', 'Thors', 'Francis', 'Junary', 'Kenneth'];
const paymentTypes = ['Partially Paid', 'Fully Paid', 'COD'];
const orderTypes = ['MTO', 'Personalize', 'Customize', 'Stock Design', 'Stock (Jacket Only)', 'Services'];
const priorityTypes = ['Rush', 'Regular'];

export function EditLeadDialog({ isOpen, onOpenChange, lead, onSave, onClose }: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  lead: Lead;
  onSave: (updatedLead: Partial<Lead>) => void;
  onClose: () => void;
}) {
  const [customerName, setCustomerName] = useState(lead.customerName);
  const [companyName, setCompanyName] = useState(lead.companyName || '');
  const [contactNumber, setContactNumber] = useState(lead.contactNumber);
  const [landlineNumber, setLandlineNumber] = useState(lead.landlineNumber || '');
  const [location, setLocation] = useState(lead.location);
  const [salesRepresentative, setSalesRepresentative] = useState(lead.salesRepresentative);
  const [paymentType, setPaymentType] = useState(lead.paymentType);
  const [orderType, setOrderType] = useState(lead.orderType);
  const [priorityType, setPriorityType] = useState(lead.priorityType);
  const [error, setError] = useState<string | null>(null);

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  useEffect(() => {
    if (lead) {
      setCustomerName(lead.customerName);
      setCompanyName(lead.companyName || '');
      setContactNumber(lead.contactNumber);
      setLandlineNumber(lead.landlineNumber || '');
      setLocation(lead.location);
      setSalesRepresentative(lead.salesRepresentative);
      setPaymentType(lead.paymentType);
      setOrderType(lead.orderType);
      setPriorityType(lead.priorityType);
    }
  }, [lead]);
  
  const handleMobileNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue.length <= 11) {
      let formattedValue = '';
      if (rawValue.length > 0) {
        formattedValue = rawValue.substring(0, 4);
      }
      if (rawValue.length > 4) {
        formattedValue += '-' + rawValue.substring(4, 7);
      }
      if (rawValue.length > 7) {
        formattedValue += '-' + rawValue.substring(7, 11);
      }
      setContactNumber(formattedValue);
    }
  };

  const handleLandlineNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue.length <= 10) {
      let formattedValue = '';
      if (rawValue.length > 0) {
        formattedValue = rawValue.substring(0, 2);
      }
      if (rawValue.length > 2) {
        formattedValue += '-' + rawValue.substring(2, 6);
      }
      if (rawValue.length > 6) {
        formattedValue += '-' + rawValue.substring(6, 10);
      }
      setLandlineNumber(formattedValue);
    }
  };


  const validateAndSave = () => {
    setError(null);

    const mobile = contactNumber.trim();
    const landline = landlineNumber.trim();
    
    if (mobile && !/^\d{4}-\d{3}-\d{4}$/.test(mobile)) {
        setError("Mobile number must be in 0000-000-0000 format.");
        return;
    }
    if (landline && !/^\d{2}-\d{4}-\d{4}$/.test(landline)) {
        setError("Landline number must be in 00-0000-0000 format.");
        return;
    }

    const updatedLead: Partial<Lead> = {
      customerName: toTitleCase(customerName),
      companyName: companyName ? toTitleCase(companyName) : '-',
      contactNumber: mobile || '-',
      landlineNumber: landline || '-',
      location: toTitleCase(location),
      salesRepresentative,
      paymentType,
      orderType,
      priorityType,
    };
    onSave(updatedLead);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Lead Details</DialogTitle>
          <DialogDescription>
            Update the details for the selected lead.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" value={companyName === '-' ? '' : companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
          </div>
           <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactNo">Mobile No.</Label>
              <Input id="contactNo" value={contactNumber === '-' ? '' : contactNumber} onChange={handleMobileNoChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="landlineNo">Landline No.</Label>
              <Input id="landlineNo" value={landlineNumber === '-' ? '' : landlineNumber} onChange={handleLandlineNoChange} />
            </div>
          </div>
          <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salesRepresentative">CSR</Label>
              <Select onValueChange={setSalesRepresentative} value={salesRepresentative}>
                <SelectTrigger id="salesRepresentative"><SelectValue /></SelectTrigger>
                <SelectContent>{salesRepresentatives.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select onValueChange={setPaymentType} value={paymentType}>
                <SelectTrigger id="paymentType"><SelectValue /></SelectTrigger>
                <SelectContent>{paymentTypes.map(o => <SelectItem key={o} value={o}>{o === 'COD' ? 'COD (Cash on Delivery)' : o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="orderType">Order Type</Label>
            <Select onValueChange={setOrderType} value={orderType}>
              <SelectTrigger id="orderType"><SelectValue /></SelectTrigger>
              <SelectContent>{orderTypes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority Type</Label>
              <RadioGroup onValueChange={(v) => setPriorityType(v as 'Rush' | 'Regular')} value={priorityType} className="flex pt-2">
                {priorityTypes.map(o => <div key={o} className="flex items-center space-x-2"><RadioGroupItem value={o} id={`priority-${o}`}/><Label htmlFor={`priority-${o}`}>{o}</Label></div>)}
              </RadioGroup>
            </div>
          </div>
           {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
          <Button type="button" onClick={validateAndSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
