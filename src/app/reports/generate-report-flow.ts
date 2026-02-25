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

type Payment = {
  type: 'down' | 'full' | 'balance' | 'additional' | 'securityDeposit';
  amount: number;
  [key: string]: any;
};

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
  city?: string;
  orderType?: string;
  payments?: Payment[];
  [key: string]: any;
};

const getLeadSalesAmount = (lead: Lead): number => {
    return lead.grandTotal || 0;
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
      amount: z.number(),
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
  weeklySalesData: z.array(
    z.object({
      week: z.string(),
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
  salesByCityData: z.array(
    z.object({
      city: z.string(),
      amount: z.number(),
      orderCount: z.number(),
    })
  ),
  totalSales: z.number(),
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
            const fromDate = dateRange.from ? parseISO(dateRange.from) : null;
            const toDate = dateRange.to ? parseISO(dateRange.to) : (fromDate ? endOfDay(fromDate) : null);

            if (fromDate && toDate) {
                return typedLeads.filter(lead => {
                    const submissionDate = new Date(lead.submissionDateTime);
                    return isWithinInterval(submissionDate, { start: fromDate, end: toDate });
                });
            }
            if (fromDate) {
                return typedLeads.filter(lead => new Date(lead.submissionDateTime) >= fromDate);
            }
            if (toDate) {
                return typedLeads.filter(lead => new Date(lead.submissionDateTime) <= toDate);
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
    
    const totalSales = filteredLeads.reduce((sum, lead) => sum + getLeadSalesAmount(lead), 0);

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
          const leadAmount = getLeadSalesAmount(lead);

          if (leadQuantity > 0 || leadAmount > 0) {
            if (!acc[csr]) {
              acc[csr] = { quantity: 0, amount: 0, uniqueCustomerDays: new Set() };
            }

            acc[csr].quantity += leadQuantity;
            acc[csr].amount += leadAmount;
            
            const submissionDate = format(new Date(lead.submissionDateTime), 'yyyy-MM-dd');
            const uniqueKey = `${lead.customerName}-${submissionDate}`;
            acc[csr].uniqueCustomerDays.add(uniqueKey);
          }

          return acc;
        },
        {} as { [key: string]: { quantity: number; amount: number; uniqueCustomerDays: Set<string> } }
      );

      return Object.entries(statsBySalesRep)
        .map(([name, { quantity, amount, uniqueCustomerDays }]) => ({
          name,
          quantity,
          customerCount: uniqueCustomerDays.size,
          amount,
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
          const submissionDate = new Date(lead.submissionDateTime);
          const phtOffset = 8 * 60 * 60 * 1000;
          const phtDate = new Date(submissionDate.getTime() + phtOffset);
          const date = format(phtDate, 'MMM-dd-yyyy');
          
          const leadQuantity = lead.orders
            .filter(o => o.productType !== 'Patches')
            .reduce(
              (sum, order) => sum + order.quantity,
              0
            );

          const leadAmount = getLeadSalesAmount(lead);

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

    const weeklySalesData = (() => {
        const salesByWeek = filteredLeads.reduce((acc, lead) => {
            const submissionDate = new Date(lead.submissionDateTime);
            const phtOffset = 8 * 60 * 60 * 1000;
            const phtDate = new Date(submissionDate.getTime() + phtOffset);
            
            const start = startOfWeek(phtDate, { weekStartsOn: 1 });
            const end = endOfWeek(phtDate, { weekStartsOn: 1 });
            const weekRange = `${format(start, 'MMM dd')} - ${format(end, 'MMM dd')}`;

            const leadQuantity = lead.orders
                .filter(o => o.productType !== 'Patches')
                .reduce((sum, order) => sum + order.quantity, 0);

            const leadAmount = getLeadSalesAmount(lead);

            if (leadQuantity > 0 || leadAmount > 0) {
                if (!acc[weekRange]) {
                    acc[weekRange] = { quantity: 0, amount: 0, start: start };
                }
                acc[weekRange].quantity += leadQuantity;
                acc[weekRange].amount += leadAmount;
            }

            return acc;
        }, {} as { [key: string]: { quantity: number; amount: number, start: Date } });

        return Object.entries(salesByWeek)
            .map(([week, { quantity, amount, start }]) => ({
                week,
                quantity,
                amount,
                start,
            }))
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .map(({ week, quantity, amount }) => ({ week, quantity, amount }));
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
        .sort((a, b) => a.name.localeCompare(b.name));
    })();

    const salesByCityData = (() => {
        const salesByCity = filteredLeads.reduce(
          (acc, lead) => {
            const leadAmount = getLeadSalesAmount(lead);
            if (lead.city && leadAmount > 0) {
              const cityLower = lead.city.trim().toLowerCase().replace('zambaonga', 'zamboanga');
              
              const normalizedCity = cityLower
                .replace(/\bcity\b/g, '') // remove the word 'city'
                .replace(/\bof\b/g, '')   // remove the word 'of'
                .replace(/-/g, ' ')      // replace hyphens with space
                .trim()
                .replace(/\s+/g, ' ');    // collapse multiple spaces

              const finalCityName = normalizedCity
                .split(' ')
                .filter(Boolean)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

              if (finalCityName) {
                if (!acc[finalCityName]) {
                  acc[finalCityName] = { amount: 0, orderCount: 0 };
                }
                acc[finalCityName].amount += leadAmount;
                acc[finalCityName].orderCount += 1;
              }
            }
            return acc;
          },
          {} as { [key: string]: { amount: number; orderCount: number } }
        );
    
        return Object.entries(salesByCity)
          .map(([city, { amount, orderCount }]) => ({
            city,
            amount,
            orderCount,
          }))
          .sort((a, b) => b.amount - a.amount);
      })();

    return {
      salesRepData,
      priorityData,
      dailySalesData,
      weeklySalesData,
      soldQtyByProductType,
      salesByCityData,
      totalSales,
      availableYears,
      availableWeeks,
    };
  }
);
