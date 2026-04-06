'use server';
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  parseISO,
  getYear,
  getMonth,
} from 'date-fns';

type Order = {
  quantity: number;
};

export type Lead = {
  id: string;
  isDone?: boolean;
  doneProductionTimestamp?: string | null;
  orders: Order[];
};

export type GenerateProductionReportInput = {
  leads: Lead[];
  selectedMonth: string;
  selectedYear: string;
};

export async function generateProductionReportAction(input: GenerateProductionReportInput) {
    const { leads, selectedMonth, selectedYear } = input;
    const typedLeads = leads as Lead[];
    
    const year = parseInt(selectedYear, 10);
    const month = parseInt(selectedMonth, 10) - 1;

    const completedLeads = typedLeads.filter(lead => lead.isDone && lead.doneProductionTimestamp);

    const dailyProduction: Record<string, number> = {};

    completedLeads.forEach(lead => {
        try {
            const completionDate = parseISO(lead.doneProductionTimestamp!);
            if (getYear(completionDate) === year && getMonth(completionDate) === month) {
                const dateStr = format(completionDate, 'MMM-dd');
                const totalQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
                dailyProduction[dateStr] = (dailyProduction[dateStr] || 0) + totalQuantity;
            }
        } catch(e) {
            // ignore invalid dates
        }
    });

    const start = startOfMonth(new Date(year, month));
    const end = endOfMonth(start);
    const daysInMonth = eachDayOfInterval({ start, end });

    const dailyProgressData = daysInMonth.map(day => {
        const dateStr = format(day, 'MMM-dd');
        return {
            date: dateStr,
            quantity: dailyProduction[dateStr] || 0
        };
    });

    return {
        dailyProgressData,
    };
}
