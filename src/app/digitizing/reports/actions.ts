
'use server';
import { z } from 'zod';
import { addDays, differenceInDays, format, startOfMonth, endOfMonth, eachDayOfInterval, getYear, getMonth } from 'date-fns';

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

export type Lead = {
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

const GenerateDigitizingReportInputSchema = z.object({
  leads: z.array(z.any()).describe('An array of lead objects with digitizing status.'),
  priorityFilter: z.string().describe('Filter by priority type: All, Rush, or Regular.'),
  selectedMonth: z.string().describe('The selected month for the productivity chart (1-12).'),
  selectedYear: z.string().describe('The selected year for the productivity chart.'),
});

export type GenerateDigitizingReportInput = z.infer<typeof GenerateDigitizingReportInputSchema>;

export async function generateDigitizingReportAction(input: GenerateDigitizingReportInput) {
    const { leads, priorityFilter, selectedMonth, selectedYear } = input;
    const typedLeads = leads as Lead[];
    
    const orderTypesToSkip = ['Stock (Jacket Only)', 'Item Sample', 'Stock Design'];

    const programmingLeads = typedLeads.filter(lead => 
        lead.joNumber && 
        !lead.isFinalProgram &&
        !orderTypesToSkip.includes(lead.orderType)
    );

    const filteredLeads = programmingLeads.filter(lead => {
        if (priorityFilter === 'All') return true;
        return lead.priorityType === priorityFilter;
    });

    const statusSummary = (() => {
      const statusCounts = {
        'Pending Initial Program': 0,
        'For Initial Approval': 0,
        'For Testing': 0,
        'Under Revision': 0,
        'Awaiting Final Approval': 0,
        'For Final Program Uploading': 0,
      };
      filteredLeads.forEach(lead => {
        if (lead.isRevision) statusCounts['Under Revision']++;
        else if (!lead.isUnderProgramming) statusCounts['Pending Initial Program']++;
        else if (!lead.isInitialApproval) statusCounts['For Initial Approval']++;
        else if (!lead.isLogoTesting) statusCounts['For Testing']++;
        else if (!lead.isFinalApproval) statusCounts['Awaiting Final Approval']++;
        else statusCounts['For Final Program Uploading']++;
      });
      return Object.entries(statusCounts).map(([name, count]) => ({ name, count }));
    })();

    const overdueSummary = (() => {
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
        return [
            { name: 'On Track', count: onTrackCount },
            { name: 'Nearly Overdue', count: nearlyOverdueCount },
            { name: 'Overdue', count: overdueCount },
        ];
    })();
    
    const digitizerSummary = (() => {
        const counts: Record<string, number> = {};
        filteredLeads.forEach(lead => {
            const digitizer = lead.assignedDigitizer || 'Unassigned';
            counts[digitizer] = (counts[digitizer] || 0) + 1;
        });
        const allDigitizers = Object.entries(counts).map(([name, count]) => ({ name, count }));
        const unassigned = allDigitizers.find(d => d.name === 'Unassigned');
        const assigned = allDigitizers.filter(d => d.name !== 'Unassigned').sort((a, b) => b.count - a.count);
        return unassigned ? [...assigned, unassigned] : assigned;
    })();

    const dailyProgressData = (() => {
        const year = parseInt(selectedYear, 10);
        const month = parseInt(selectedMonth, 10) - 1;
        
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

        return daysInMonth.map(day => {
            const dateStr = format(day, 'MMM-dd');
            const countsForDay = dailyCounts[dateStr] || {};
            const result: { [key: string]: string | number } = { date: dateStr };
            sortedUploaders.forEach(uploader => {
                result[uploader] = countsForDay[uploader] || 0;
            });
            return result;
        });
    })();

    return {
      statusSummary,
      overdueSummary,
      digitizerSummary,
      dailyProgressData,
    };
}
