'use server';

import { generateDigitizingReport, type GenerateDigitizingReportInput } from '@/ai/flows/generate-digitizing-report-flow';

export async function generateDigitizingReportAction(input: GenerateDigitizingReportInput) {
  return generateDigitizingReport(input);
}
