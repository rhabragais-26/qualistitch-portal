

'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from './ui/skeleton';
import { Separator } from './ui/separator';

type OperationalCase = {
  id: string;
  isArchived?: boolean;
  caseType: string;
  quantity?: number;
};

const chartConfig = {
  quantity: {
    label: 'Quantity',
  },
};

const COLORS = {
    'Return to Sender (RTS)': 'hsl(var(--chart-1))',
    'Quality Errors': 'hsl(var(--chart-2))',
    'Replacement': 'hsl(var(--chart-3))',
};

const CasePieChart = React.memo(({ data, title }: { data: { name: string; quantity: number; fill: string }[], title: string }) => (
    <div className="w-full h-[250px]">
        <h3 className="text-center font-semibold text-lg mb-2">{title}</h3>
        <ChartContainer config={chartConfig} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Tooltip content={<ChartTooltipContent nameKey="quantity" />} />
                    <Pie
                        data={data}
                        dataKey="quantity"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, quantity }) => `${name}: ${quantity}`}
                    >
                        {data.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </ChartContainer>
    </div>
));
CasePieChart.displayName = 'CasePieChart';


const OperationalCasesSummaryMemo = React.memo(function OperationalCasesSummary() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();

  const casesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'operationalCases'));
  }, [firestore, user]);

  const { data: cases, isLoading: areCasesLoading, error } = useCollection<OperationalCase>(casesQuery, undefined, { listen: false });

  const { openCasesData, resolvedCasesData } = useMemo(() => {
    if (!cases) return { openCasesData: [], resolvedCasesData: [] };

    const processCases = (caseList: OperationalCase[]) => {
        const quantityByCaseType = caseList.reduce((acc, caseItem) => {
            if (caseItem.caseType && caseItem.quantity) {
                if (!acc[caseItem.caseType]) {
                    acc[caseItem.caseType] = 0;
                }
                acc[caseItem.caseType] += caseItem.quantity;
            }
            return acc;
        }, {} as { [key: string]: number });

        return Object.entries(quantityByCaseType).map(([name, quantity]) => ({
            name,
            quantity,
            fill: COLORS[name as keyof typeof COLORS] || 'hsl(var(--chart-4))',
        }));
    };

    const openCases = cases.filter(c => !c.isArchived);
    const resolvedCases = cases.filter(c => c.isArchived);

    return {
        openCasesData: processCases(openCases),
        resolvedCasesData: processCases(resolvedCases)
    };

  }, [cases]);

  const isLoading = isAuthLoading || areCasesLoading;

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black">
      <CardHeader>
        <CardTitle className="text-black">Operational Cases Summary</CardTitle>
        <CardDescription className="text-gray-600">
          Total quantity of items per case type for open and resolved cases.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-start gap-8">
        {isLoading ? (
          <div className="w-full space-y-8">
            <Skeleton className="h-[250px] w-full bg-gray-200" />
            <Skeleton className="h-4 w-full bg-gray-200" />
            <Skeleton className="h-[250px] w-full bg-gray-200" />
          </div>
        ) : error ? (
          <div className="text-red-500 p-4">Error loading data: {error.message}</div>
        ) : (
          <>
            <CasePieChart data={openCasesData} title="Open Cases" />
            <Separator className="my-2" />
            <CasePieChart data={resolvedCasesData} title="Resolved Cases" />
          </>
        )}
      </CardContent>
    </Card>
  );
});

export { OperationalCasesSummaryMemo as OperationalCasesSummary };
