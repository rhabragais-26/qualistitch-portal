

'use client';

import { collection, query, where } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import React, { useState, useMemo, useCallback } from 'react';
import { Input } from './ui/input';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { cn, formatJoNumber, toTitleCase } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';


// Simplified types for this component
type Order = {
  design?: {
    left?: boolean;
    right?: boolean;
    backLogo?: boolean;
    backText?: boolean;
    names?: boolean;
  };
  quantity: number;
};

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber?: string;
  landlineNumber?: string;
  joNumber?: number;
  priorityType: 'Rush' | 'Regular';
  isCutting?: boolean;
  orders: Order[];
  submissionDateTime: string;
};

type EnrichedLead = Lead & {
  orderNumber: number;
  totalCustomerQuantity: number;
};

type DesignType = keyof LogData['stitches'];

type LogData = {
    stitches: {
        leftLogo: string;
        rightLogo: string;
        backLogo: string;
        backText: string;
        names: string;
    };
    rpm: {
        leftLogo: string;
        rightLogo: string;
        backLogo: string;
        backText: string;
        names: string;
    };
    quantity: {
        leftLogo: string;
        rightLogo: string;
        backLogo: string;
        backText: string;
        names: string;
    };
    shift: 'Morning Shift' | 'Mid Shift' | 'Evening Shift' | '';
};


export function ProductionDailyLogsTable({ isReadOnly }: { isReadOnly: boolean }) {
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');
    const [joNumberSearch, setJoNumberSearch] = useState('');
    const [openCustomerDetails, setOpenCustomerDetails] = useState<string | null>(null);
    const [logs, setLogs] = useState<Record<string, LogData>>({});

    const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads'), where("isCutting", "==", true)) : null, [firestore]);
    const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

    const handleLogChange = (leadId: string, field: keyof LogData, value: any, subField?: DesignType) => {
        setLogs(prev => {
            const newLog = { ...(prev[leadId] || { 
                stitches: { leftLogo: '', rightLogo: '', backLogo: '', backText: '', names: '' }, 
                rpm: { leftLogo: '', rightLogo: '', backLogo: '', backText: '', names: '' },
                quantity: { leftLogo: '', rightLogo: '', backLogo: '', backText: '', names: '' },
                shift: '' 
            }) };

            if ((field === 'stitches' || field === 'rpm' || field === 'quantity') && subField) {
                newLog[field][subField] = value;
            } else if (field !== 'stitches' && field !== 'rpm' && field !== 'quantity') {
                (newLog[field] as any) = value;
            }
            return { ...prev, [leadId]: newLog };
        });
    };

    const calculateTotalEstTime = (log: LogData | undefined) => {
        if (!log) return '-';
        
        let totalTimeInMinutes = 0;
        const designKeys = Object.keys(log.stitches) as DesignType[];

        for (const key of designKeys) {
            const stitches = parseInt(log.stitches[key].replace(/,/g, ''), 10) || 0;
            const rpm = parseInt(log.rpm[key], 10) || 0;

            if (stitches > 0 && rpm > 0) {
                totalTimeInMinutes += (stitches / rpm) + 10;
            }
        }
        
        if (totalTimeInMinutes === 0) return '-';

        if (totalTimeInMinutes < 60) {
            return `${Math.ceil(totalTimeInMinutes)} mins`;
        }
        const hours = Math.floor(totalTimeInMinutes / 60);
        const minutes = Math.ceil(totalTimeInMinutes % 60);
        return `${hours} hr ${minutes} mins`;
    };
    
    const calculateSingleEstTime = (stitchesStr: string, rpmStr: string) => {
        const stitches = parseInt(stitchesStr.replace(/,/g, ''), 10) || 0;
        const rpm = parseInt(rpmStr, 10) || 0;

        if (stitches > 0 && rpm > 0) {
            const timeInMinutes = (stitches / rpm) + 10;
            if (timeInMinutes < 60) {
                return `${Math.ceil(timeInMinutes)} mins`;
            }
            const hours = Math.floor(timeInMinutes / 60);
            const minutes = Math.ceil(timeInMinutes % 60);
            return `${hours} hr ${minutes} mins`;
        }
        return '-';
    };


    const getContactDisplay = useCallback((lead: Lead) => {
        const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
        const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;
        if (mobile && landline) return `${mobile} / ${landline}`;
        return mobile || landline || '';
    }, []);

    const toggleCustomerDetails = useCallback((leadId: string) => {
        setOpenCustomerDetails(prev => prev === leadId ? null : leadId);
    }, []);

    const enrichedLeads = useMemo(() => {
        if (!leads) return [];
        return leads.map(lead => ({
            ...lead,
            orderNumber: 0, // Not needed for this table logic
            totalCustomerQuantity: 0,
        }));
    }, [leads]);
    
    const filteredLeads = useMemo(() => {
        if (!enrichedLeads) return [];
        return enrichedLeads.filter(lead => {
            const lowercasedSearchTerm = searchTerm.toLowerCase();
            const matchesSearch = searchTerm ?
                (lead.customerName.toLowerCase().includes(lowercasedSearchTerm) ||
                (lead.companyName && lead.companyName.toLowerCase().includes(lowercasedSearchTerm)))
                : true;
            
            const joString = formatJoNumber(lead.joNumber);
            const matchesJo = joNumberSearch ? joString.toLowerCase().includes(joNumberSearch.toLowerCase()) : true;

            return matchesSearch && matchesJo;
        });
    }, [enrichedLeads, searchTerm, joNumberSearch]);
    
    const designCheckboxes: { label: string, key: DesignType }[] = [
        { label: 'Left Logo', key: 'leftLogo' },
        { label: 'Right Logo', key: 'rightLogo' },
        { label: 'Back Logo', key: 'backLogo' },
        { label: 'Back Text', key: 'backText' },
        { label: 'Names', key: 'names' },
    ];
    
    if (isLoading) {
        return <div className="p-4"><Skeleton className="h-64 w-full" /></div>;
    }
    if (error) {
        return <div className="p-4 text-destructive">Error: {error.message}</div>;
    }

    return (
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-black">Production Daily Logs</CardTitle>
                        <CardDescription className="text-gray-600">
                        Orders that are currently in production.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <Input
                            placeholder="Search J.O. No..."
                            value={joNumberSearch}
                            onChange={(e) => setJoNumberSearch(e.target.value)}
                            className="bg-gray-100 text-black placeholder:text-gray-500"
                        />
                        <Input
                            placeholder="Search Customer or Company..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-gray-100 text-black placeholder:text-gray-500"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader className="bg-neutral-800">
                            <TableRow>
                                <TableHead className="text-white font-bold text-xs">Customer</TableHead>
                                <TableHead className="text-white font-bold text-xs text-center">J.O. No.</TableHead>
                                <TableHead className="text-white font-bold text-xs text-center">Priority</TableHead>
                                <TableHead colSpan={5} className="text-white font-bold text-xs text-center">Embroidery Details</TableHead>
                                <TableHead className="text-white font-bold text-xs text-center">Shift</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLeads.map(lead => {
                                const logData = logs[lead.id] || { 
                                    stitches: { leftLogo: '', rightLogo: '', backLogo: '', backText: '', names: '' }, 
                                    rpm: { leftLogo: '', rightLogo: '', backLogo: '', backText: '', names: '' },
                                    quantity: { leftLogo: '', rightLogo: '', backLogo: '', backText: '', names: '' },
                                    shift: '' 
                                };
                                return (
                                <TableRow key={lead.id}>
                                    <TableCell className="text-xs">
                                        <Collapsible open={openCustomerDetails === lead.id} onOpenChange={() => toggleCustomerDetails(lead.id)}>
                                            <CollapsibleTrigger asChild>
                                                <div className="flex items-center cursor-pointer">
                                                    <ChevronDown className="h-4 w-4 mr-1 transition-transform [&[data-state=open]]:rotate-180" />
                                                    <span className="font-bold">{toTitleCase(lead.customerName)}</span>
                                                </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="pt-1 pl-6 text-gray-500 text-[11px] font-normal">
                                                {lead.companyName && lead.companyName !== '-' && <div>{toTitleCase(lead.companyName)}</div>}
                                                {getContactDisplay(lead) && <div>{getContactDisplay(lead)}</div>}
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </TableCell>
                                    <TableCell className="text-xs text-center">{formatJoNumber(lead.joNumber)}</TableCell>
                                    <TableCell className="text-xs text-center"><Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>{lead.priorityType}</Badge></TableCell>
                                    <TableCell colSpan={5} className="p-0 align-top">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-0">
                                                    <TableHead className="p-1 h-auto text-center text-black font-bold text-xs border-r w-[150px]">Design</TableHead>
                                                    <TableHead className="p-1 h-auto text-center text-black font-bold text-xs border-r w-[90px]">Quantity</TableHead>
                                                    <TableHead className="p-1 h-auto text-center text-black font-bold text-xs border-r w-[120px]">No. of Stitches</TableHead>
                                                    <TableHead className="p-1 h-auto text-center text-black font-bold text-xs border-r w-[120px]">Machine RPM</TableHead>
                                                    <TableHead className="p-1 h-auto text-center text-black font-bold text-xs">Est. Time</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {designCheckboxes.map(design => {
                                                    const estTime = calculateSingleEstTime(logData.stitches[design.key], logData.rpm[design.key]);
                                                    return (
                                                    <TableRow key={design.key} className="border-0">
                                                        <TableCell className="p-1 border-r">
                                                            <div className="flex items-center h-7">
                                                                <Checkbox id={`${lead.id}-${design.key}`} checked={lead.orders.some(o => o.design?.[design.key as keyof Order['design']])} disabled className="disabled:opacity-100" />
                                                                <Label htmlFor={`${lead.id}-${design.key}`} className="ml-2 text-xs">{design.label}</Label>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="p-1 border-r w-[90px]">
                                                            <Input
                                                                type="text" 
                                                                className="h-7 text-xs text-center" 
                                                                value={logData.quantity[design.key]}
                                                                onChange={(e) => /^\d*$/.test(e.target.value) && handleLogChange(lead.id, 'quantity', e.target.value, design.key)}
                                                                readOnly={isReadOnly}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-1 border-r w-[120px]">
                                                            <Input 
                                                                type="text" 
                                                                className="h-7 text-xs text-center" 
                                                                value={logData.stitches[design.key] ? new Intl.NumberFormat().format(Number(logData.stitches[design.key])) : ''}
                                                                onChange={(e) => {
                                                                    const sanitizedValue = e.target.value.replace(/,/g, '');
                                                                    if (/^\d*$/.test(sanitizedValue)) {
                                                                        handleLogChange(lead.id, 'stitches', sanitizedValue, design.key);
                                                                    }
                                                                }}
                                                                readOnly={isReadOnly}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-1 border-r w-[120px]">
                                                            <Input
                                                                type="text" 
                                                                className="h-7 text-xs text-center" 
                                                                value={logData.rpm[design.key]}
                                                                onChange={(e) => /^\d*$/.test(e.target.value) && handleLogChange(lead.id, 'rpm', e.target.value, design.key)}
                                                                readOnly={isReadOnly}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-1 text-xs text-center align-middle">
                                                            {estTime}
                                                        </TableCell>
                                                    </TableRow>
                                                )})}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-right font-bold py-1 px-2">Total Est. Time</TableCell>
                                                    <TableCell className="text-center font-bold py-1 px-2">{calculateTotalEstTime(logData)}</TableCell>
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    </TableCell>
                                    <TableCell className="align-top pt-2">
                                        <Select value={logData.shift} onValueChange={(value) => handleLogChange(lead.id, 'shift', value)} disabled={isReadOnly}>
                                            <SelectTrigger className="text-xs h-8">
                                                <SelectValue placeholder="Select Shift" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Morning Shift">Morning Shift</SelectItem>
                                                <SelectItem value="Mid Shift">Mid Shift</SelectItem>
                                                <SelectItem value="Evening Shift">Evening Shift</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
