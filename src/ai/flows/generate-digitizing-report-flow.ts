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
  isUnderProgramming?: boolean;
  isInitialApproval?: boolean;
  isLogoTesting?: boolean;
  isRevision?: boolean;
  isFinalApproval?: boolean;
  isFinalProgram?: boolean;
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
    const programmingLeads = typedLeads.filter(lead => lead.joNumber);

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

      // --- Logic for Counting Status ---
      // This logic counts each job order based on the NEXT step it is waiting for in the production queue.
      // An order is only counted in one category. Once a stage is complete, it moves to the next.
      // Orders that have the 'Final Program' checkbox checked are considered complete and are not counted.
      filteredLeads.forEach(lead => {
        if (!lead.joNumber || lead.isFinalProgram) {
            // 1. Skip if no J.O. number is assigned.
            // 2. Skip if 'Final Program' is checked (already completed).
        } else if (lead.isFinalApproval) {
            // 3. If 'Final Approval' is checked, it's waiting for the 'Final Program'.
            statusCounts['Final Program']++;
        } else if (lead.isRevision) {
            // 4. If 'Revision' is checked, it stays in the 'Revision' queue.
            statusCounts['Revision']++; 
        } else if (lead.isLogoTesting) {
            // 5. If 'Test' is checked, it's waiting for 'Final Approval'.
            statusCounts['Final Approval']++;
        } else if (lead.isInitialApproval) {
            // 6. If 'Initial Approval' is checked, it's waiting for 'Test'.
            statusCounts['Test']++;
        } else if (lead.isUnderProgramming) {
            // 7. If 'Initial Program' is checked, it's waiting for 'Initial Approval'.
            statusCounts['Initial Approval']++;
        } else {
            // 8. If no other status is checked, it's waiting for the 'Initial Program'.
            statusCounts['Initial Program']++;
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
