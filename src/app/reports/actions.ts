'use server';

import { generateReport } from '@/ai/flows/generate-report-flow';

export async function generateReportAction(input: any) {
  return generateReport(input);
}