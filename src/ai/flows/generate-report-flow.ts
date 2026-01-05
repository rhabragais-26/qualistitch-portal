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
  [key: string]: any;
};

const GenerateReportInputSchema = z.object({
  leads: z.array(z.any()).describe('An array of lead objects.'),
  selectedYear: z.string().describe('The selected year for the report.'),
  selectedMonth: z.string().describe('The selected month for the report.'),
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
    })
  ),
  monthlySalesData: z.array(
    z.object({
      date: z.string(),
      quantity: z.number(),
    })
  ),
  soldQtyByProductType: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
    })
  ),
  availableYears: z.array(z.number()),
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
  async ({ leads, selectedYear, selectedMonth }) => {
    const typedLeads = leads as Lead[];

    const availableYears = Array.from(
      new Set(typedLeads.map((lead) => getYear(new Date(lead.submissionDateTime))))
    ).sort((a, b) => b - a);

    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth) - 1; // month is 0-indexed in Date

    const filteredLeads =
      isNaN(year) || isNaN(month)
        ? typedLeads
        : typedLeads.filter((lead) => {
            const submissionDate = new Date(lead.submissionDateTime);
            return (
              getYear(submissionDate) === year &&
              getMonth(submissionDate) === month
            );
          });

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
              acc[csr] = { quantity: 0, customers: new Set<string>() };
            }

            acc[csr].quantity += leadQuantity;
            acc[csr].customers.add(lead.customerName);
          }

          return acc;
        },
        {} as { [key: string]: { quantity: number; customers: Set<string> } }
      );

      return Object.entries(statsBySalesRep)
        .map(([name, { quantity, customers }]) => ({
          name,
          quantity,
          customerCount: customers.size,
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

          if (leadQuantity > 0) {
            if (!acc[date]) {
              acc[date] = 0;
            }
            acc[date] += leadQuantity;
          }

          return acc;
        },
        {} as { [key: string]: number }
      );

      return Object.entries(salesByDay)
        .map(([date, quantity]) => ({
          date,
          quantity,
        }))
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    })();

    const monthlySalesData = (() => {
      const salesByMonth = typedLeads
        .filter((lead) => {
          if (!selectedYear) return true;
          const submissionDate = new Date(lead.submissionDateTime);
          return getYear(submissionDate) === parseInt(selectedYear);
        })
        .reduce(
          (acc, lead) => {
            const submissionDate = new Date(lead.submissionDateTime);
            const month = format(submissionDate, 'MMM yyyy');
            const leadQuantity = lead.orders
              .filter(o => o.productType !== 'Patches')
              .reduce(
                (sum, order) => sum + order.quantity,
                0
              );
            
            if (leadQuantity > 0) {
              if (!acc[month]) {
                acc[month] = 0;
              }
              acc[month] += leadQuantity;
            }

            return acc;
          },
          {} as { [key: string]: number }
        );

      return Object.entries(salesByMonth)
        .map(([date, quantity]) => ({
          date,
          quantity,
        }))
        .sort(
          (a, b) =>
            parse(a.date, 'MMM yyyy', new Date()).getTime() -
            parse(b.date, 'MMM yyyy', new Date()).getTime()
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
      monthlySalesData,
      soldQtyByProductType,
      availableYears,
    };
  }
);
