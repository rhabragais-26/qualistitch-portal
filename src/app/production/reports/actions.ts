
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

type FileObject = {
    name: string;
    url: string;
};

type Layout = {
    finalLogoDst?: (FileObject | null)[];
    finalBackDesignDst?: (FileObject | null)[];
    finalNamesDst?: (FileObject | null)[];
};

export type Lead = {
  id: string;
  isDone?: boolean;
  doneProductionTimestamp?: string | null;
  orders: Order[];
  layouts?: Layout[];
  isEmbroideryDone?: boolean;
  embroideryDoneTimestamp?: string | null;
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

    const completedLeads = typedLeads.filter(lead => lead.isEmbroideryDone && lead.embroideryDoneTimestamp);

    const dailyProduction: Record<string, number> = {};
    const dailyDesignBreakdown: Record<string, { logo: number; backDesign: number; names: number }> = {};
    const dailyJoDoneCount: Record<string, Set<string>> = {};

    completedLeads.forEach(lead => {
        try {
            const completionDate = parseISO(lead.embroideryDoneTimestamp!);
            if (getYear(completionDate) === year && getMonth(completionDate) === month) {
                const dateStr = format(completionDate, 'MMM-dd');
                
                const totalQuantity = lead.orders.reduce((sum, order) => sum + order.quantity, 0);
                dailyProduction[dateStr] = (dailyProduction[dateStr] || 0) + totalQuantity;

                if (!dailyDesignBreakdown[dateStr]) {
                    dailyDesignBreakdown[dateStr] = { logo: 0, backDesign: 0, names: 0 };
                }

                if (lead.layouts) {
                    lead.layouts.forEach(layout => {
                        dailyDesignBreakdown[dateStr].logo += (layout.finalLogoDst || []).filter(Boolean).length;
                        dailyDesignBreakdown[dateStr].backDesign += (layout.finalBackDesignDst || []).filter(Boolean).length;
                        dailyDesignBreakdown[dateStr].names += (layout.finalNamesDst || []).filter(Boolean).length;
                    });
                }
                
                if (!dailyJoDoneCount[dateStr]) {
                    dailyJoDoneCount[dateStr] = new Set();
                }
                dailyJoDoneCount[dateStr].add(lead.id);
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
    
    const dailyBreakdownData = daysInMonth.map(day => {
        const dateStr = format(day, 'MMM-dd');
        const data = dailyDesignBreakdown[dateStr] || { logo: 0, backDesign: 0, names: 0 };
        return {
            date: dateStr,
            ...data,
            total: data.logo + data.backDesign + data.names,
            doneJoCount: dailyJoDoneCount[dateStr]?.size || 0
        };
    });

    return {
        dailyProgressData,
        dailyBreakdownData,
    };
}
