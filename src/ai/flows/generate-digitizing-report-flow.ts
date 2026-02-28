'use server';
/**
 * @fileOverview A report generation AI agent for digitizing process.
 *
 * - generateDigitizingReport - A function that handles the report generation process for digitizing.
 * - GenerateDigitizingReportInput - The input type for the generateDigitizingReport function.
 * - GenerateDigitizingReportOutput - The return type for the generateDigitizingReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { addDays, differenceInDays } from 'date-fns';

export type Lead = {
  id: string;
  joNumber?: number;
  orderType: string;
  isUnderProgramming?: boolean;
  isInitialApproval?: boolean;
  isLogoTesting?: boolean;
  isRevision?: boolean;
  isFinalApproval?: boolean;
  isFinalProgram?: boolean;
  isDigitizingArchived?: boolean;
  priorityType: 'Rush' | 'Regular';
  submissionDateTime: string;
};

const GenerateDigitizingReportInputSchema = z.object({
  leads: z.array(z.any()).describe('An array of lead objects with digitizing status.'),
  priorityFilter: z.string().describe('Filter by priority type: All, Rush, or Regular.'),
});
export type GenerateDigitizingReportInput = z.infer<typeof GenerateDigitizingReportInputSchema>;

const GenerateDigitizingReportOutputSchema = z.object({
  statusSummary: z.array(
    z.object({
      name: z.string(),
      count: z.number(),
    })
  ),
  overdueSummary: z.array(
    z.object({
      name: z.string(),
      count: z.number(),
    })
  ),
});
export type GenerateDigitizingReportOutput = z.infer<typeof GenerateDigitizingReportOutputSchema>;

export async function generateDigitizingReport(
  input: GenerateDigitizingReportInput
): Promise<GenerateDigitizingReportOutput> {
  return generateDigitizingReportFlow(input);
}

const generateDigitizingReportFlow = ai.defineFlow(
  {
    name: 'generateDigitizingReportFlow',
    inputSchema: GenerateDigitizingReportInputSchema,
    outputSchema: GenerateDigitizingReportOutputSchema,
  },
  async ({ leads, priorityFilter }) => {
    const typedLeads = leads as Lead[];
    
    // Define order types that should not be in the programming queue
    const orderTypesToSkip = ['Stock (Jacket Only)', 'Item Sample', 'Stock Design'];

    // Filter for leads that are in the programming queue.
    // An order is considered "in the queue" if it has a JO Number, is not a type that skips this process,
    // AND has not had its final program completed yet.
    const programmingLeads = typedLeads.filter(lead => 
        lead.joNumber && 
        !lead.isFinalProgram && // Excludes completed orders from all calculations
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

      // The logic determines the NEXT required step for an order.
      filteredLeads.forEach(lead => {
        // 1. Pending Initial Program: This is the very first step.
        if (!lead.isUnderProgramming) {
            statusCounts['Pending Initial Program']++;
        } 
        // 2. For Initial Approval: Initial Program is done, now waiting for approval.
        else if (!lead.isInitialApproval) {
            statusCounts['For Initial Approval']++;
        } 
        // 3. For Testing: Initial Approval is done, now waiting for testing.
        else if (!lead.isLogoTesting) {
            statusCounts['For Testing']++;
        } 
        // 4. Under Revision: This state takes priority if checked.
        else if (lead.isRevision) {
            statusCounts['Under Revision']++;
        } 
        // 5. Awaiting Final Approval: Testing is done, not under revision, waiting for final sign-off.
        else if (!lead.isFinalApproval) {
            statusCounts['Awaiting Final Approval']++;
        } 
        // 6. For Final Program Uploading: Final Approval is checked, the last step is to upload the final program.
        else {
            statusCounts['For Final Program Uploading']++;
        }
      });
      
      return Object.entries(statusCounts).map(([name, count]) => ({ name, count }));
    })();

    const overdueSummary = (() => {
        let overdueCount = 0;
        let onTrackCount = 0;
        let nearlyOverdueCount = 0;

        const calculateDigitizingDeadline = (lead: Lead) => {
            const submissionDate = new Date(lead.submissionDateTime);
            const deadlineDays = lead.priorityType === 'Rush' ? 2 : 6;
            const deadlineDate = addDays(submissionDate, deadlineDays);
            return differenceInDays(deadlineDate, new Date());
        };

        // filteredLeads already excludes completed orders, so no need for an extra check here.
        filteredLeads.forEach(lead => {
            const remainingDays = calculateDigitizingDeadline(lead);
            if (remainingDays < 0) {
                overdueCount++;
            } else if (remainingDays <= 2) {
                nearlyOverdueCount++;
            } else {
                onTrackCount++;
            }
        });

        return [
            { name: 'On Track', count: onTrackCount },
            { name: 'Nearly Overdue', count: nearlyOverdueCount },
            { name: 'Overdue', count: overdueCount },
        ];
    })();

    return {
      statusSummary,
      overdueSummary,
    };
  }
);
