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

    // Filter for leads that are in the programming queue
    const programmingLeads = typedLeads.filter(lead => 
        lead.joNumber && 
        !lead.isDigitizingArchived &&
        !orderTypesToSkip.includes(lead.orderType)
    );

    const filteredLeads = programmingLeads.filter(lead => {
        if (priorityFilter === 'All') return true;
        return lead.priorityType === priorityFilter;
    });

    const statusSummary = (() => {
      const statusCounts = {
        'Initial Program': 0,
        'Initial Approval': 0,
        'Test': 0,
        'Revision': 0,
        'Final Approval': 0,
        'Final Program': 0,
      };

      filteredLeads.forEach(lead => {
        // Skip if already fully completed
        if (lead.isFinalProgram) {
            return;
        }

        // Logic based on the next required step (the first *unchecked* box in the sequence)
        if (!lead.isUnderProgramming) {
            // 1. Pending Initial Program: This is the very first step.
            statusCounts['Initial Program']++;
        } else if (!lead.isInitialApproval) {
            // 2. Pending Initial Approval: Initial Program is done, now waiting for approval.
            statusCounts['Initial Approval']++;
        } else if (!lead.isLogoTesting) {
            // 3. Pending Test: Initial Approval is done, now waiting for testing.
            statusCounts['Test']++;
        } else if (lead.isRevision) {
            // 4. Under Revision: This state takes priority if checked.
            // It means we are looping back before final approval.
            statusCounts['Revision']++;
        } else if (!lead.isFinalApproval) {
            // 5. Pending Final Approval: Testing is done, not under revision, waiting for final sign-off.
            statusCounts['Final Approval']++;
        } else {
            // 6. Pending Final Program: Final Approval is checked, the last step is to upload the final program.
            statusCounts['Final Program']++;
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

        filteredLeads.forEach(lead => {
            if (lead.isFinalProgram) return; // Don't count completed leads in overdue summary
            
            const remainingDays = calculateDigitizingDeadline(lead);
            if (remainingDays < 0) {
                overdueCount++;
            } else if (remainingDays <= 2) {
                nearlyOverdueCount++;
            }
            else {
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
