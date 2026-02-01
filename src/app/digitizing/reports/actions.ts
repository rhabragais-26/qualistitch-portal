'use server';

import { generateDigitizingReport } from '@/ai/flows/generate-digitizing-report-flow';

export async function generateDigitizingReportAction(payload: any) {
  return await generateDigitizingReport(payload);
}
