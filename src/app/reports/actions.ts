'use server';

import { generateReport } from './generate-report-flow';

export async function generateReportAction(input: any) {
  return generateReport(input);
}
