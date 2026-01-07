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
};

const chartConfig = {
  count: {
    label: 'Count',
  },
};

const COLORS = {
    Open: 'hsl(var(--chart-2))',
    Resolved: 'hsl(var(--chart-1))',
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

    const openCases = cases.filter(c => !c.isArchived).length;
    const resolvedCases = cases.filter(c => c.isArchived).length;

    return [
      { name: 'Open', count: openCases, fill: COLORS.Open },
      { name: 'Resolved', count: resolvedCases, fill: COLORS.Resolved },
    ];
  }, [cases]);

  const isLoading = isAuthLoading || areCasesLoading;

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-black">Operational Cases Summary</CardTitle>
        <CardDescription className="text-gray-600">
          Breakdown of open and resolved operational cases.
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
                  <Tooltip content={<ChartTooltipContent nameKey="count" />} />
                  <Pie
                    data={reportData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, count }) => `${name}: ${count}`}
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
