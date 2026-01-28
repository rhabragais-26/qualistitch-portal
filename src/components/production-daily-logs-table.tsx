
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
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Input } from './ui/input';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Skeleton } from './ui/skeleton';
import { cn, formatJoNumber, toTitleCase } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Plus, Minus } from 'lucide-react';
import { Separator } from './ui/separator';


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

type TimeValue = { hour: string; minute: string; period: 'AM' | 'PM' };

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
    startTime: TimeValue;
    endTime: TimeValue;
    shift: 'Morning Shift' | 'Mid Shift' | 'Evening Shift' | '';
};


export function ProductionDailyLogsTable({ isReadOnly }: { isReadOnly: boolean }) {
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');
    const [joNumberSearch, setJoNumberSearch] = useState('');
    const [logs, setLogs] = useState<Record<string, LogData>>({});
    const [checkedDesigns, setCheckedDesigns] = useState<Record<string, Record<string, boolean>>>({});


    const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads'), where("isCutting", "==", true)) : null, [firestore]);
    const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

    useEffect(() => {
        if (leads) {
            const initialState: Record<string, Record<string, boolean>> = {};
            leads.forEach(lead => {
                initialState[lead.id] = {};
                designCheckboxes.forEach(design => {
                    const isPresent = lead.orders.some(o => o.design?.[design.key as keyof Order['design']]);
                    initialState[lead.id][design.key] = isPresent;
                });
            });
            setCheckedDesigns(initialState);
        }
    }, [leads]);

    const handleDesignCheckboxChange = (leadId: string, designKey: DesignType, isChecked: boolean) => {
        setCheckedDesigns(prev => ({
            ...prev,
            [leadId]: {
                ...(prev[leadId] || {}),
                [designKey]: isChecked
            }
        }));

        if (!isChecked) {
            handleLogChange(leadId, 'quantity', '', designKey);
            handleLogChange(leadId, 'stitches', '', designKey);
            handleLogChange(leadId, 'rpm', '', designKey);
        }
    };


    const handleLogChange = (
        leadId: string, 
        field: keyof LogData, 
        value: any, 
        subField?: DesignType | keyof TimeValue
    ) => {
        setLogs(prev => {
            const newLog = JSON.parse(JSON.stringify(prev[leadId] || { 
                stitches: { leftLogo: '', rightLogo: '', backLogo: '', backText: '', names: '' }, 
                rpm: { leftLogo: '', rightLogo: '', backLogo: '', backText: '', names: '' },
                quantity: { leftLogo: '', rightLogo: '', backLogo: '', backText: '', names: '' },
                startTime: { hour: '', minute: '', period: 'AM' },
                endTime: { hour: '', minute: '', period: 'AM' },
                shift: '' 
            }));

            if ((field === 'stitches' || field === 'rpm' || field === 'quantity') && subField && subField in newLog[field]) {
                newLog[field][subField as DesignType] = value;
            } else if ((field === 'startTime' || field === 'endTime') && subField && (subField === 'hour' || subField === 'minute' || subField === 'period')) {
                const timeField = newLog[field];
                if (subField === 'hour') {
                    const num = parseInt(value, 10);
                    if (value === '' || (!isNaN(num) && num >= 1 && num <= 12)) {
                        timeField.hour = value;
                    }
                } else if (subField === 'minute') {
                    const num = parseInt(value, 10);
                    if (value === '' || (!isNaN(num) && num >= 0 && num <= 59)) {
                        timeField.minute = value;
                    }
                } else if (subField === 'period') {
                    timeField.period = value as 'AM' | 'PM';
                }
            } else if (field === 'shift') {
                newLog[field] = value;
            }
            
            return { ...prev, [leadId]: newLog };
        });
    };

    const calculateTotalEstTime = (log: LogData | undefined, lead: Lead) => {
        if (!log) return '-';
        
        let totalTimeInMinutes = 0;
        const designKeys = Object.keys(log.stitches) as DesignType[];

        for (const key of designKeys) {
            if (checkedDesigns[lead.id]?.[key]) {
                const stitches = parseInt(log.stitches[key].replace(/,/g, ''), 10) || 0;
                const rpm = parseInt(log.rpm[key], 10) || 0;

                if (stitches > 0 && rpm > 0) {
                    totalTimeInMinutes += (stitches / rpm) + 10;
                }
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

    const parseTime = (time: TimeValue): number | null => {
        let hour = parseInt(time.hour, 10);
        const minute = parseInt(time.minute, 10);

        if (isNaN(hour) || isNaN(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
            return null;
        }

        if (time.period === 'PM' && hour !== 12) {
            hour += 12;
        } else if (time.period === 'AM' && hour === 12) {
            hour = 0; // Midnight case
        }
        
        return hour * 60 + minute;
    };

    const calculateDuration = (startTime: TimeValue, endTime: TimeValue): string => {
        const startMinutes = parseTime(startTime);
        const endMinutes = parseTime(endTime);

        if (startMinutes === null || endMinutes === null) {
            return '-';
        }
        
        let diff = endMinutes - startMinutes;

        if (diff < 0) {
            return 'Check Provided Time';
        }

        if (diff === 0) return '0 mins';

        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;

        if (hours > 0 && minutes > 0) {
            return `${hours} hr ${minutes} mins`;
        }
        if (hours > 0) {
            return `${hours} hr`;
        }
        return `${minutes} mins`;
    };


    const getContactDisplay = useCallback((lead: Lead) => {
        const mobile = lead.contactNumber && lead.contactNumber !== '-' ? lead.contactNumber.replace(/-/g, '') : null;
        const landline = lead.landlineNumber && lead.landlineNumber !== '-' ? lead.landlineNumber.replace(/-/g, '') : null;
        if (mobile && landline) return `${mobile} / ${landline}`;
        return mobile || landline || '';
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
                        <CardTitle className="text-black">Embroidery Daily Logs</CardTitle>
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
                                <TableHead className="text-white font-bold text-xs text-center w-[220px]">Duration</TableHead>
                                <TableHead className="text-white font-bold text-xs text-center">Shift</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLeads.map(lead => {
                                const logData = logs[lead.id] || { 
                                    stitches: { leftLogo: '', rightLogo: '', backLogo: '', backText: '', names: '' }, 
                                    rpm: { leftLogo: '', rightLogo: '', backLogo: '', backText: '', names: '' },
                                    quantity: { leftLogo: '', rightLogo: '', backLogo: '', backText: '', names: '' },
                                    startTime: { hour: '', minute: '', period: 'AM' },
                                    endTime: { hour: '', minute: '', period: 'AM' },
                                    shift: '' 
                                };
                                const isRepeat = lead.orderNumber > 1;
                                return (
                                <TableRow key={lead.id}>
                                    <TableCell className="text-xs align-middle">
                                        <div className="font-bold">{toTitleCase(lead.customerName)}</div>
                                        {isRepeat ? (
                                            <TooltipProvider>
                                                <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center justify-start gap-1.5 cursor-pointer mt-1">
                                                    <span className="text-xs text-yellow-600 font-semibold">Repeat Buyer</span>
                                                    <span className="flex items-center justify-center h-5 w-5 rounded-full border-2 border-yellow-600 text-yellow-700 text-[10px] font-bold">
                                                        {lead.orderNumber}
                                                    </span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Total of {lead.totalCustomerQuantity} items ordered.</p>
                                                </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : (
                                        <div className="text-xs text-blue-600 font-semibold mt-1">New Customer</div>
                                        )}
                                        <div className="mt-1 space-y-0.5 text-gray-500 text-[11px] font-normal">
                                            {lead.companyName && lead.companyName !== '-' && <div>{toTitleCase(lead.companyName)}</div>}
                                            {getContactDisplay(lead) && <div>{getContactDisplay(lead)}</div>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-center">{formatJoNumber(lead.joNumber)}</TableCell>
                                    <TableCell className="text-xs text-center"><Badge variant={lead.priorityType === 'Rush' ? 'destructive' : 'secondary'}>{lead.priorityType}</Badge></TableCell>
                                    <TableCell colSpan={5} className="p-0 align-top">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-0">
                                                    <TableHead className="p-1 h-auto text-left text-blue-900 font-bold text-xs border-r w-[150px]">Design</TableHead>
                                                    <TableHead className="p-1 h-auto text-center text-blue-900 font-bold text-xs border-r w-[80px]">Quantity</TableHead>
                                                    <TableHead className="p-1 h-auto text-center text-blue-900 font-bold text-xs border-r w-[100px]">No. of Stitches</TableHead>
                                                    <TableHead className="p-1 h-auto text-center text-blue-900 font-bold text-xs border-r w-[100px]">Machine RPM</TableHead>
                                                    <TableHead className="p-1 h-auto text-center text-blue-900 font-bold text-xs">Est. Time</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {designCheckboxes.map(design => {
                                                    const isChecked = checkedDesigns[lead.id]?.[design.key] ?? false;
                                                    const estTime = calculateSingleEstTime(logData.stitches[design.key], logData.rpm[design.key]);
                                                    return (
                                                    <TableRow key={design.key} className="border-0">
                                                        <TableCell className="p-1 border-r">
                                                            <div className="flex items-center h-7">
                                                                <Checkbox id={`${lead.id}-${design.key}`} 
                                                                    checked={isChecked}
                                                                    onCheckedChange={(checked) => handleDesignCheckboxChange(lead.id, design.key, !!checked)}
                                                                    disabled={isReadOnly}
                                                                />
                                                                <Label htmlFor={`${lead.id}-${design.key}`} className="ml-2 text-xs">{design.label}</Label>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="p-1 border-r w-[80px]">
                                                            <Input
                                                                type="text" 
                                                                className="h-7 text-xs text-center" 
                                                                value={logData.quantity[design.key]}
                                                                onChange={(e) => /^\d*$/.test(e.target.value) && handleLogChange(lead.id, 'quantity', e.target.value, design.key)}
                                                                disabled={!isChecked || isReadOnly}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-1 border-r w-[100px]">
                                                            <Input 
                                                                type="text" 
                                                                className="h-7 text-xs text-center" 
                                                                value={logData.stitches[design.key] ? new Intl.NumberFormat().format(Number(logData.stitches[design.key].replace(/,/g, ''))) : ''}
                                                                onChange={(e) => {
                                                                    const sanitizedValue = e.target.value.replace(/,/g, '');
                                                                    if (/^\d*$/.test(sanitizedValue)) {
                                                                        handleLogChange(lead.id, 'stitches', sanitizedValue, design.key);
                                                                    }
                                                                }}
                                                                disabled={!isChecked || isReadOnly}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-1 border-r w-[100px]">
                                                            <Input
                                                                type="text" 
                                                                className="h-7 text-xs text-center" 
                                                                value={logData.rpm[design.key]}
                                                                onChange={(e) => /^\d*$/.test(e.target.value) && handleLogChange(lead.id, 'rpm', e.target.value, design.key)}
                                                                disabled={!isChecked || isReadOnly}
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
                                                    <TableCell colSpan={4} className="text-right font-bold py-1 px-2 text-black">Total Estimated Time</TableCell>
                                                    <TableCell className="text-center font-bold py-1 px-2">{calculateTotalEstTime(logData, lead)}</TableCell>
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    </TableCell>
                                    <TableCell className="align-middle text-center w-[220px]">
                                        <div className="flex flex-col items-center gap-2">
                                            <div>
                                                <Label className="text-xs">Start Time</Label>
                                                <div className="flex items-center justify-center gap-1">
                                                    <Input
                                                        type="text"
                                                        placeholder="HH"
                                                        maxLength={2}
                                                        value={logData.startTime.hour}
                                                        onChange={(e) => handleLogChange(lead.id, 'startTime', e.target.value.replace(/\D/g, ''), 'hour')}
                                                        className="w-12 h-8 text-xs text-center"
                                                        disabled={isReadOnly}
                                                    />
                                                    <span>:</span>
                                                    <Input
                                                        type="text"
                                                        placeholder="MM"
                                                        maxLength={2}
                                                        value={logData.startTime.minute}
                                                        onChange={(e) => handleLogChange(lead.id, 'startTime', e.target.value.replace(/\D/g, ''), 'minute')}
                                                        onBlur={(e) => {
                                                            const val = e.target.value;
                                                            if (val.length === 1) {
                                                                handleLogChange(lead.id, 'startTime', val.padStart(2, '0'), 'minute');
                                                            }
                                                        }}
                                                        className="w-12 h-8 text-xs text-center"
                                                        disabled={isReadOnly}
                                                    />
                                                    <Select value={logData.startTime.period} onValueChange={(v) => handleLogChange(lead.id, 'startTime', v, 'period')} disabled={isReadOnly}>
                                                        <SelectTrigger className="w-[70px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="AM">AM</SelectItem>
                                                            <SelectItem value="PM">PM</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-xs">End Time</Label>
                                                <div className="flex items-center justify-center gap-1">
                                                     <Input
                                                        type="text"
                                                        placeholder="HH"
                                                        maxLength={2}
                                                        value={logData.endTime.hour}
                                                        onChange={(e) => handleLogChange(lead.id, 'endTime', e.target.value.replace(/\D/g, ''), 'hour')}
                                                        className="w-12 h-8 text-xs text-center"
                                                        disabled={isReadOnly}
                                                    />
                                                    <span>:</span>
                                                    <Input
                                                        type="text"
                                                        placeholder="MM"
                                                        maxLength={2}
                                                        value={logData.endTime.minute}
                                                        onChange={(e) => handleLogChange(lead.id, 'endTime', e.target.value.replace(/\D/g, ''), 'minute')}
                                                        onBlur={(e) => {
                                                            const val = e.target.value;
                                                            if (val.length === 1) {
                                                                handleLogChange(lead.id, 'endTime', val.padStart(2, '0'), 'minute');
                                                            }
                                                        }}
                                                        className="w-12 h-8 text-xs text-center"
                                                        disabled={isReadOnly}
                                                    />
                                                    <Select value={logData.endTime.period} onValueChange={(v) => handleLogChange(lead.id, 'endTime', v, 'period')} disabled={isReadOnly}>
                                                        <SelectTrigger className="w-[70px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="AM">AM</SelectItem>
                                                            <SelectItem value="PM">PM</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <Separator className="my-1" />
                                            <div className="text-xs font-bold">
                                                {(() => {
                                                    const duration = calculateDuration(logData.startTime, logData.endTime);
                                                    return <span className={cn(duration === 'Check Provided Time' && 'text-destructive')}>{duration}</span>;
                                                })()}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-middle">
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

    
