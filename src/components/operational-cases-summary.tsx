
'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from './ui/skeleton';

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

export function OperationalCasesSummary() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();

  const casesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'operationalCases'));
  }, [firestore, user]);

  const { data: cases, isLoading: areCasesLoading, error } = useCollection<OperationalCase>(casesQuery);

  const reportData = useMemo(() => {
    if (!cases) return [];

    const quantityByCaseType = cases.reduce((acc, caseItem) => {
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
  }, [cases]);

  const isLoading = isAuthLoading || areCasesLoading;

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-black">Operational Cases Summary</CardTitle>
        <CardDescription className="text-gray-600">
          Total quantity of items per case type.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center">
        {isLoading ? (
          <Skeleton className="h-[300px] w-full bg-gray-200" />
        ) : error ? (
          <div className="text-red-500 p-4">Error loading data: {error.message}</div>
        ) : (
          <div className="w-full h-[350px]">
            <ChartContainer config={chartConfig} className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent nameKey="quantity" />} />
                  <Pie
                    data={reportData}
                    dataKey="quantity"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, quantity }) => `${name}: ${quantity}`}
                  >
                    {reportData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
