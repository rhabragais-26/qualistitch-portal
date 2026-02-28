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
    // Filter for leads that are in the programming queue (have a JO number and are not archived/completed)
    const programmingLeads = typedLeads.filter(lead => lead.joNumber && !lead.isDigitizingArchived);

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
        // This logic assigns each order to a single "queue" based on the next action required.
        // The hierarchy is checked from latest stage to earliest.
        if (lead.isFinalProgram) {
            // 1. If Final Program is checked, it's completed and not counted.
            return;
        }

        if (lead.isRevision) {
            // 2. If Under Revision is checked, it's prioritized in this queue.
            statusCounts['Revision']++;
        } else if (lead.isFinalApproval) {
            // 3. If Final Approval is checked, it's waiting for Final Program file.
            statusCounts['Final Program']++;
        } else if (lead.isLogoTesting) {
            // 4. If Logo Testing is done (and not under revision), it's waiting for Final Approval.
            statusCounts['Final Approval']++;
        } else if (lead.isInitialApproval) {
            // 5. If Initial Approval is checked, it's waiting for Test.
            statusCounts['Test']++;
        } else if (lead.isUnderProgramming) {
            // 6. If Initial Program is done, it's waiting for Initial Approval.
            statusCounts['Initial Approval']++;
        } else {
            // 7. If nothing else is checked, it's waiting for the Initial Program.
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
