
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

type DesignDetails = {
    left?: boolean;
    right?: boolean;
    backLogo?: boolean;
    backText?: boolean;
};

type Order = {
  quantity: number;
  design?: DesignDetails;
};

type NamedOrder = {
    name: string;
    quantity: number;
}

type FileObject = {
    name: string;
    url: string;
};

type Layout = {
    finalLogoDst?: (FileObject | null)[];
    finalBackDesignDst?: (FileObject | null)[];
    finalNamesDst?: (FileObject | null)[];
    namedOrders?: NamedOrder[];
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

    const completedLeads = typedLeads.filter(lead => {
        if (!lead.isEmbroideryDone || !lead.embroideryDoneTimestamp) return false;
        try {
            const completionDate = parseISO(lead.embroideryDoneTimestamp);
            return getYear(completionDate) === year && getMonth(completionDate) === month;
        } catch(e) { return false; }
    });

    const dailyProduction: Record<string, number> = {};
    const dailyDesignBreakdown: Record<string, { logo: number; backDesign: number; names: number }> = {};
    const dailyJoDoneCount: Record<string, Set<string>> = {};

    completedLeads.forEach(lead => {
        try {
            const completionDate = parseISO(lead.embroideryDoneTimestamp!);
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
    
    const designTypeQuantities = (() => {
        const totals = {
            logos: 0,
            backDesigns: 0,
            names: 0
        };

        completedLeads.forEach(lead => {
            lead.orders.forEach(order => {
                const qty = order.quantity || 0;
                if (order.design) {
                    if (order.design.left) totals.logos += qty;
                    if (order.design.right) totals.logos += qty;
                    if (order.design.backLogo) totals.logos += qty;
                    if (order.design.backText) totals.backDesigns += qty;
                }
            });

            lead.layouts?.forEach(layout => {
                if (layout.namedOrders) {
                    layout.namedOrders.forEach(namedOrder => {
                        totals.names += namedOrder.quantity || 0;
                    });
                }
            });
        });

        return [
            { name: 'Logos', count: totals.logos, color: 'hsl(var(--chart-1))' },
            { name: 'Back Designs', count: totals.backDesigns, color: 'hsl(var(--chart-3))' },
            { name: 'Names', count: totals.names, color: 'hsl(var(--chart-5))' },
        ];
    })();

    return {
        dailyProgressData,
        dailyBreakdownData,
        designTypeQuantities,
    };
}
