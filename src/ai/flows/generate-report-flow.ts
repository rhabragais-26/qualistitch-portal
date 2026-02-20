'use server';

/**
 * @fileOverview A report generation AI agent.
 *
 * - generateReport - A function that handles the report generation process.
 * - GenerateReportInput - The input type for the generateReport function.
 * - GenerateReportOutput - The return type for the generateReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  format,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  getMonth,
  getYear,
  parse,
  isValid,
  isSameDay,
  startOfDay,
  endOfDay,
  parseISO
} from 'date-fns';

type Order = {
  quantity: number;
  productType: string;
  [key: string]: any;
};

export type Lead = {
  id: string;
  customerName: string;
  salesRepresentative: string;
  priorityType: string;
  orders: Order[];
  submissionDateTime: string;
  grandTotal?: number;
  [key: string]: any;
};

const GenerateReportInputSchema = z.object({
  leads: z.array(z.any()).describe('An array of lead objects.'),
  selectedYear: z.string().describe('The selected year for the report.'),
  selectedMonth: z.string().describe('The selected month for the report.'),
  selectedWeek: z.string().optional().describe('The selected week for the report (e.g., "mm.dd-mm.dd").'),
  dateRange: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
  }).optional(),
});
export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;

const GenerateReportOutputSchema = z.object({
  salesRepData: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      customerCount: z.number(),
    })
  ),
  priorityData: z.array(
    z.object({
      name: z.string(),
      value: z.number(),
    })
  ),
  dailySalesData: z.array(
    z.object({
      date: z.string(),
      quantity: z.number(),
      amount: z.number(),
    })
  ),
  soldQtyByProductType: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
    })
  ),
  availableYears: z.array(z.number()),
  availableWeeks: z.array(z.string()),
});
export type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;

export async function generateReport(
  input: GenerateReportInput
): Promise<GenerateReportOutput> {
  return generateReportFlow(input);
}

const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: GenerateReportInputSchema,
    outputSchema: GenerateReportOutputSchema,
  },
  async ({ leads, selectedYear, selectedMonth, selectedWeek, dateRange }) => {
    const typedLeads = leads as Lead[];

    const availableYears = Array.from(
      new Set(typedLeads.map((lead) => getYear(new Date(lead.submissionDateTime))))
    ).sort((a, b) => b - a);

    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth) - 1; // month is 0-indexed in Date

    const availableWeeks = Array.from(new Set(
      typedLeads
        .filter(lead => getYear(new Date(lead.submissionDateTime)) === year)
        .map(lead => {
          const date = new Date(lead.submissionDateTime);
          const start = startOfWeek(date, { weekStartsOn: 1 });
          const end = endOfWeek(date, { weekStartsOn: 1 });
          return `${format(start, 'MM.dd')}-${format(end, 'MM.dd')}`;
        })
    )).sort((a,b) => {
        const a_start = parse(a.split('-')[0], 'MM.dd', new Date(year, 0, 1));
        const b_start = parse(b.split('-')[0], 'MM.dd', new Date(year, 0, 1));
        return a_start.getTime() - b_start.getTime();
    });

    const filteredLeads = (() => {
        if (dateRange && (dateRange.from || dateRange.to)) {
            const fromDate = dateRange.from ? startOfDay(parseISO(dateRange.from)) : null;
            // If 'to' is not provided, use the 'from' date to create a single-day range.
            const toDate = dateRange.to ? endOfDay(parseISO(dateRange.to)) : (fromDate ? endOfDay(fromDate) : null);

            if (fromDate && toDate) {
                return typedLeads.filter(lead => {
                    const submissionDate = new Date(lead.submissionDateTime);
                    return isWithinInterval(submissionDate, { start: fromDate, end: toDate });
                });
            }
            // Handle case where only 'to' date might be present
            if (toDate) {
                return typedLeads.filter(lead => {
                    const submissionDate = new Date(lead.submissionDateTime);
                    return submissionDate <= toDate;
                });
            }
        }

      if (selectedWeek) {
        const [startStr, endStr] = selectedWeek.split('-');
        const weekStart = parse(`${startStr}.${year}`, 'MM.dd.yyyy', new Date());
        const weekEnd = parse(`${endStr}.${year}`, 'MM.dd.yyyy', new Date());
        
        if(isValid(weekStart) && isValid(weekEnd)) {
             return typedLeads.filter(lead => {
                const submissionDate = new Date(lead.submissionDateTime);
                return isWithinInterval(submissionDate, { start: startOfDay(weekStart), end: endOfDay(weekEnd) });
            });
        }
      }

      if (selectedYear === 'all') return typedLeads;
      if (isNaN(year)) return typedLeads;

      if (selectedMonth === 'all' || isNaN(month)) {
        return typedLeads.filter(lead => getYear(new Date(lead.submissionDateTime)) === year);
      }
      
      const start = startOfMonth(new Date(year, month));
      const end = endOfMonth(new Date(year, month));

      return typedLeads.filter((lead) => {
            const submissionDate = new Date(lead.submissionDateTime);
            return isWithinInterval(submissionDate, { start, end });
          });
    })();

    const salesRepData = (() => {
      const statsBySalesRep = filteredLeads.reduce(
        (acc, lead) => {
          const leadQuantity = lead.orders
            .filter(o => o.productType !== 'Patches')
            .reduce(
              (sum, order) => sum + order.quantity,
              0
            );
          const csr = lead.salesRepresentative;

          if (leadQuantity > 0) {
            if (!acc[csr]) {
              acc[csr] = { quantity: 0, customerCount: 0 };
            }

            acc[csr].quantity += leadQuantity;
            acc[csr].customerCount += 1;
          }

          return acc;
        },
        {} as { [key: string]: { quantity: number; customerCount: number } }
      );

      return Object.entries(statsBySalesRep)
        .map(([name, { quantity, customerCount }]) => ({
          name,
          quantity,
          customerCount,
        }))
        .sort((a, b) => b.quantity - a.quantity);
    })();

    const priorityData = (() => {
      const quantityByPriority = filteredLeads.reduce(
        (acc, lead) => {
          const leadQuantity = lead.orders
            .filter(o => o.productType !== 'Patches')
            .reduce(
              (sum, order) => sum + order.quantity,
              0
            );
          const priority = lead.priorityType || 'Regular';

          if (leadQuantity > 0) {
            if (acc[priority]) {
              acc[priority] += leadQuantity;
            } else {
              acc[priority] = leadQuantity;
            }
          }
          return acc;
        },
        {} as { [key: string]: number }
      );

      return Object.entries(quantityByPriority)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    })();

    const dailySalesData = (() => {
      const salesByDay = filteredLeads.reduce(
        (acc, lead) => {
          const date = format(new Date(lead.submissionDateTime), 'MMM-dd-yyyy');
          const leadQuantity = lead.orders
            .filter(o => o.productType !== 'Patches')
            .reduce(
              (sum, order) => sum + order.quantity,
              0
            );

          const leadAmount = lead.grandTotal || 0;

          if (leadQuantity > 0 || leadAmount > 0) {
            if (!acc[date]) {
              acc[date] = { quantity: 0, amount: 0 };
            }
            acc[date].quantity += leadQuantity;
            acc[date].amount += leadAmount;
          }

          return acc;
        },
        {} as { [key: string]: { quantity: number; amount: number } }
      );

      return Object.entries(salesByDay)
        .map(([date, { quantity, amount }]) => ({
          date,
          quantity,
          amount,
        }))
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    })();

    const soldQtyByProductType = (() => {
      const quantityByProductType = filteredLeads.reduce(
        (acc, lead) => {
          lead.orders
            .filter(o => o.productType !== 'Patches')
            .forEach((order) => {
              const productType = order.productType;
              const quantity = order.quantity;

              if (!acc[productType]) {
                acc[productType] = 0;
              }
              acc[productType] += quantity;
            });
          return acc;
        },
        {} as { [key: string]: number }
      );

      return Object.entries(quantityByProductType)
        .map(([name, quantity]) => ({
          name,
          quantity,
        }))
        .sort((a, b) => b.quantity - a.quantity);
    })();

    return {
      salesRepData,
      priorityData,
      dailySalesData,
      soldQtyByProductType,
      availableYears,
      availableWeeks,
    };
  }
);
