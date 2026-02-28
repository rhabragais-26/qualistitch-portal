
'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { getYear, format, addDays, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, getMonth } from 'date-fns';

type FileObject = {
  name: string;
  url: string;
};

type Layout = {
  id: string;
  logoLeftImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  logoRightImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  backLogoImages?: { url: string; uploadTime: string; uploadedBy: string; }[];
  backDesignImages?: { url: string; uploadTime: string; uploadedBy: string; }[];

  finalLogoDst?: (FileObject | null)[];
  finalLogoDstUploadTimes?: (string | null)[];
  finalLogoDstUploadedBy?: (string | null)[];

  finalBackDesignDst?: (FileObject | null)[];
  finalBackDesignDstUploadTimes?: (string | null)[];
  finalBackDesignDstUploadedBy?: (string | null)[];

  finalNamesDst?: (FileObject | null)[];
  finalNamesDstUploadTimes?: (string | null)[];
  finalNamesDstUploadedBy?: (string | null)[];
};

type Lead = {
  id: string;
  joNumber?: number;
  orderType: string;
  isUnderProgramming?: boolean;
  underProgrammingTimestamp?: string | null;
  isInitialApproval?: boolean;
  initialApprovalTimestamp?: string | null;
  isLogoTesting?: boolean;
  logoTestingTimestamp?: string | null;
  isRevision?: boolean;
  revisionTimestamp?: string | null;
  isFinalApproval?: boolean;
  finalApprovalTimestamp?: string | null;
  isFinalProgram?: boolean;
  finalProgramTimestamp?: string | null;
  isDigitizingArchived?: boolean;
  priorityType: 'Rush' | 'Regular';
  submissionDateTime: string;
  assignedDigitizer?: string | null;
  layouts?: Layout[];
};

const chartConfig = {
  count: {
    label: 'Count',
  },
};

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(220, 70%, 70%)',
  'hsl(340, 70%, 70%)',
];

const StatusDoughnutCard = ({ title, count, total, color }: { title: string; count: number; total: number; color: string }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    const data = [
        { name: title, value: count },
        { name: 'other', value: Math.max(0, total - count) },
    ];
    const chartColors = [color, '#e5e7eb']; // Active color and a light gray for the rest

    return (
        <Card className="flex flex-col items-center justify-start p-4 text-center">
            <CardHeader className="p-0 mb-2">
                <CardTitle className="text-lg font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 relative w-36 h-36">
                <ChartContainer config={{}} className="w-full h-full">
                    <ResponsiveContainer>
                        <PieChart>
                            <Tooltip
                                cursor={false}
                                content={<ChartTooltipContent
                                    hideLabel
                                    formatter={(value, name) => (
                                        <div className="flex flex-col">
                                            <span className="font-bold">{name === 'other' ? 'Other' : title}</span>
                                            <span>{value} orders</span>
                                        </div>
                                    )}
                                />}
                            />
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius="60%"
                                outerRadius="100%"
                                startAngle={90}
                                endAngle={450}
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={chartColors[index]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold">{count}</span>
                </div>
            </CardContent>
            <div className="mt-2 text-center">
                 <span className="text-sm font-bold">{percentage.toFixed(1)}%</span>
            </div>
        </Card>
    );
};


export function DigitizingReportsSummary() {
  
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery, undefined, { listen: false });
  
  const [isProgressChartLoading, setIsProgressChartLoading] = useState(true);

  const [progressChartMonth, setProgressChartMonth] = useState((new Date().getMonth() + 1).toString());
  const [progressChartYear, setProgressChartYear] = useState(new Date().getFullYear().toString());
  
  const { statusSummary, overdueSummary, digitizerSummary, totalStatusCount } = useMemo(() => {
    if (!leads) return { statusSummary: [], overdueSummary: [], digitizerSummary: [], totalStatusCount: 0 };
    
    const typedLeads = leads as Lead[];
    const orderTypesToSkip = ['Stock (Jacket Only)', 'Item Sample', 'Stock Design'];

    const programmingLeads = typedLeads.filter(lead => 
        lead.joNumber && 
        !lead.isFinalProgram &&
        !orderTypesToSkip.includes(lead.orderType)
    );

    const statusCounts = {
      'Pending Initial Program': 0,
      'For Initial Approval': 0,
      'For Testing': 0,
      'Under Revision': 0,
      'Awaiting Final Approval': 0,
      'For Final Program Uploading': 0,
    };
    programmingLeads.forEach(lead => {
      if (lead.isRevision) statusCounts['Under Revision']++;
      else if (!lead.isUnderProgramming) statusCounts['Pending Initial Program']++;
      else if (!lead.isInitialApproval) statusCounts['For Initial Approval']++;
      else if (!lead.isLogoTesting) statusCounts['For Testing']++;
      else if (!lead.isFinalApproval) statusCounts['Awaiting Final Approval']++;
      else statusCounts['For Final Program Uploading']++;
    });
    const statusSummary = Object.entries(statusCounts).map(([name, count]) => ({ name, count }));

    let overdueCount = 0;
    let onTrackCount = 0;
    let nearlyOverdueCount = 0;
    const leadsForOverdue = typedLeads.filter(lead => 
        lead.joNumber && 
        !lead.isDigitizingArchived &&
        !orderTypesToSkip.includes(lead.orderType)
    );
    leadsForOverdue.forEach(lead => {
        const submissionDate = new Date(lead.submissionDateTime);
        const deadlineDays = lead.priorityType === 'Rush' ? 2 : 6;
        const deadlineDate = addDays(submissionDate, deadlineDays);
        const completionDate = (lead.isFinalProgram && lead.finalProgramTimestamp) ? new Date(lead.finalProgramTimestamp) : new Date();
        const remainingDays = differenceInDays(deadlineDate, completionDate);
        if (remainingDays < 0) overdueCount++;
        else if (remainingDays <= 2) nearlyOverdueCount++;
        else onTrackCount++;
    });
    const overdueSummary = [
        { name: 'On Track', count: onTrackCount },
        { name: 'Nearly Overdue', count: nearlyOverdueCount },
        { name: 'Overdue', count: overdueCount },
    ];

    const digitizerCounts: Record<string, number> = {};
    programmingLeads.forEach(lead => {
        const digitizer = lead.assignedDigitizer || 'Unassigned';
        digitizerCounts[digitizer] = (digitizerCounts[digitizer] || 0) + 1;
    });
    const allDigitizers = Object.entries(digitizerCounts).map(([name, count]) => ({ name, count }));
    const unassigned = allDigitizers.find(d => d.name === 'Unassigned');
    const assigned = allDigitizers.filter(d => d.name !== 'Unassigned').sort((a, b) => b.count - a.count);
    const digitizerSummary = unassigned ? [...assigned, unassigned] : assigned;

    return { 
        statusSummary, 
        overdueSummary, 
        digitizerSummary,
        totalStatusCount: programmingLeads.length
    };
  }, [leads]);
  
  const dailyProgressData = useMemo(() => {
    setIsProgressChartLoading(true);
    if (!leads) {
        setIsProgressChartLoading(false);
        return [];
    }

    const typedLeads = leads as Lead[];
    const year = parseInt(progressChartYear, 10);
    const month = parseInt(progressChartMonth, 10) - 1;
    
    const allUploaders = new Set<string>();
    typedLeads.forEach(lead => {
        lead.layouts?.forEach(layout => {
            const checkUploader = (uploader: string | null | undefined) => { if (uploader) allUploaders.add(uploader); };
            const checkUploaders = (uploaders: (string | null)[] | undefined) => { (uploaders || []).forEach(checkUploader); };
            ((layout as any).logoLeftImages || []).forEach((img: any) => checkUploader(img.uploadedBy));
            ((layout as any).logoRightImages || []).forEach((img: any) => checkUploader(img.uploadedBy));
            ((layout as any).backLogoImages || []).forEach((img: any) => checkUploader(img.uploadedBy));
            ((layout as any).backDesignImages || []).forEach((img: any) => checkUploader(img.uploadedBy));
            checkUploaders((layout as any).finalLogoDstUploadedBy);
            checkUploaders((layout as any).finalBackDesignDstUploadedBy);
            checkUploaders((layout as any).finalNamesDstUploadedBy);
        });
    });
    const sortedUploaders = Array.from(allUploaders).sort();
    
    const dailyCounts: { [date: string]: { [uploader: string]: number } } = {};
    
    typedLeads.forEach(lead => {
        lead.layouts?.forEach(layout => {
            const processUploads = (items: { uploadTime?: string; uploadedBy?: string; }[] | undefined) => {
                (items || []).forEach(item => {
                    if (item?.uploadedBy && item.uploadTime) {
                        try {
                            const uploadDate = new Date(item.uploadTime);
                            if (getYear(uploadDate) === year && getMonth(uploadDate) === month) {
                                const dateStr = format(uploadDate, 'MMM-dd');
                                if (!dailyCounts[dateStr]) dailyCounts[dateStr] = {};
                                if (!dailyCounts[dateStr][item.uploadedBy!]) dailyCounts[dateStr][item.uploadedBy!] = 0;
                                dailyCounts[dateStr][item.uploadedBy!]++;
                            }
                        } catch (e) { /* ignore invalid dates */ }
                    }
                });
            };

            const processFileArrays = (files: (FileObject | null)[] | undefined, times: (string | null)[] | undefined, uploaders: (string | null)[] | undefined) => {
                (files || []).forEach((file, index) => {
                     if (file) {
                         const uploader = uploaders?.[index];
                         const time = times?.[index];
                         if (uploader && time) {
                            try {
                                const uploadDate = new Date(time);
                                if (getYear(uploadDate) === year && getMonth(uploadDate) === month) {
                                    const dateStr = format(uploadDate, 'MMM-dd');
                                    if (!dailyCounts[dateStr]) dailyCounts[dateStr] = {};
                                    if (!dailyCounts[dateStr][uploader]) dailyCounts[dateStr][uploader] = 0;
                                    dailyCounts[dateStr][uploader]++;
                                }
                            } catch (e) { /* ignore */ }
                         }
                     }
                 })
            };
            
            processUploads((layout as any).logoLeftImages);
            processUploads((layout as any).logoRightImages);
            processUploads((layout as any).backLogoImages);
            processUploads((layout as any).backDesignImages);
            processFileArrays(layout.finalLogoDst, (layout as any).finalLogoDstUploadTimes, (layout as any).finalLogoDstUploadedBy);
            processFileArrays(layout.finalBackDesignDst, (layout as any).finalBackDesignDstUploadTimes, (layout as any).finalBackDesignDstUploadedBy);
            processFileArrays(layout.finalNamesDst, (layout as any).finalNamesDstUploadTimes, (layout as any).finalNamesDstUploadedBy);
        });
    });

    const start = startOfMonth(new Date(year, month));
    const end = endOfMonth(start);
    const daysInMonth = eachDayOfInterval({ start, end });

    const data = daysInMonth.map(day => {
        const dateStr = format(day, 'MMM-dd');
        const countsForDay = dailyCounts[dateStr] || {};
        const result: { [key: string]: string | number } = { date: dateStr };
        sortedUploaders.forEach(uploader => {
            result[uploader] = countsForDay[uploader] || 0;
        });
        return result;
    });

    setIsProgressChartLoading(false);
    return data;
  }, [leads, progressChartMonth, progressChartYear]);
  
  const { availableYears, monthOptions } = useMemo(() => {
    if (!leads) {
        const currentYear = new Date().getFullYear();
        return {
            availableYears: [currentYear.toString()],
            monthOptions: Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: format(new Date(2000, i), 'MMMM') }))
        };
    }
    const yearsSet = new Set(leads.map(l => getYear(new Date(l.submissionDateTime))));
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a).map(String);

    const months = Array.from({ length: 12 }, (_, i) => ({
      value: (i + 1).toString(),
      label: format(new Date(2000, i), 'MMMM')
    }));

    return { availableYears: sortedYears, monthOptions: months };
  }, [leads]);

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, count, fill }: any) => {
    // Percentage label inside the slice
    const radiusInside = innerRadius + (outerRadius - innerRadius) * 0.5;
    const xInside = cx + radiusInside * Math.cos(-midAngle * RADIAN);
    const yInside = cy + radiusInside * Math.sin(-midAngle * RADIAN);
  
    // Line and count label outside the slice
    const radiusOutside = outerRadius + 15; // extend line
    const xStart = cx + outerRadius * Math.cos(-midAngle * RADIAN);
    const yStart = cy + outerRadius * Math.sin(-midAngle * RADIAN);
    const xEnd = cx + radiusOutside * Math.cos(-midAngle * RADIAN);
    const yEnd = cy + radiusOutside * Math.sin(-midAngle * RADIAN);
    const textAnchor = xEnd > cx ? 'start' : 'end';
  
    return (
      <g>
        {/* Percentage inside */}
        <text x={xInside} y={yInside} fill="white" textAnchor="middle" dominantBaseline="central" fontWeight="bold" fontSize={14}>
          {`${(percent * 100).toFixed(0)}%`}
        </text>
        
        {/* Line for outside label */}
        <path d={`M${xStart},${yStart} L${xEnd},${yEnd}`} stroke={fill} fill="none" />
        
        {/* Count outside */}
        <text x={xEnd + (xEnd > cx ? 1 : -1) * 4} y={yEnd} textAnchor={textAnchor} fill="#333" dominantBaseline="central" fontWeight="bold">
          {`${count}`}
        </text>
      </g>
    );
  };

  const overdueColors: { [key: string]: string } = {
      'On Track': '#22c55e', // green
      'Nearly Overdue': '#eab308', // yellow
      'Overdue': '#ef4444', // red
  };


  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground">
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading data: {error.message}</p>;
  }
  
  if (!leads) {
     return <p>No data available to generate reports.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statusSummary.map((status, index) => (
            <StatusDoughnutCard
                key={status.name}
                title={status.name}
                count={status.count}
                total={totalStatusCount}
                color={COLORS[index % COLORS.length]}
            />
        ))}
    </div>

      <div className="printable-area grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground border-none">
          <CardHeader>
            <CardTitle>Overdue Status</CardTitle>
            <CardDescription>Breakdown of overdue job orders.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<ChartTooltipContent nameKey="count" />} />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="left"
                      iconType="circle"
                      wrapperStyle={{ lineHeight: '2.5', fontSize: '14px' }}
                    />
                    <Pie
                      data={overdueSummary}
                      dataKey="count"
                      nameKey="name"
                      cx="60%"
                      cy="50%"
                      outerRadius={80}
                      labelLine={false}
                      label={renderCustomizedLabel}
                    >
                      {overdueSummary.map((entry) => (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={overdueColors[entry.name as keyof typeof overdueColors]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
          </CardContent>
        </Card>
        <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-card text-card-foreground border-none">
            <CardHeader>
                <CardTitle>Assigned Orders per Digitizer</CardTitle>
                <CardDescription>Number of active orders assigned to each digitizer.</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
                <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer>
                        <BarChart
                            data={digitizerSummary}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                        >
                            <CartesianGrid horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12 }}
                                width={100}
                            />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))' }}
                                content={<ChartTooltipContent />}
                            />
                            <Bar dataKey="count" name="Orders" radius={[0, 4, 4, 0]}>
                                {digitizerSummary.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                                <LabelList dataKey="count" position="right" offset={8} className="fill-foreground" fontSize={12} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Daily Productivity per Digitizer</CardTitle>
                        <CardDescription>Combined count of Uploaded Initial Program Images and Final DST Files (Logo, Back Design and Names) on a daily basis</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={progressChartYear} onValueChange={setProgressChartYear}>
                            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={progressChartMonth} onValueChange={setProgressChartMonth}>
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {monthOptions.map(month => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="h-80">
              {isProgressChartLoading ? (
                  <Skeleton className="h-full w-full" />
              ) : (
                <ChartContainer config={{}} className="w-full h-full">
                    <ResponsiveContainer>
                        <LineChart data={dailyProgressData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis allowDecimals={false} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend />
                            {dailyProgressData.length > 0 && Object.keys(dailyProgressData[0]).filter(k => k !== 'date').map((key, index) => (
                                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
        </Card>
      </div>
    </>
  );
}
