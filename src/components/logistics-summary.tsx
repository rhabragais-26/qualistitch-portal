
'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

type Lead = {
  isEndorsedToLogistics?: boolean;
  isQualityApproved?: boolean;
  isSalesAuditRequested?: boolean;
  isSalesAuditComplete?: boolean;
};

const chartConfig = {
  count: {
    label: 'Count',
  },
};

const COLORS = {
  awaitingQualityCheck: 'hsl(var(--chart-1))',
  awaitingSalesAudit: 'hsl(var(--chart-2))',
};

const DoughnutChart = ({ data, title }: { data: { name: string; value: number; fill: string }[], title: string }) => (
    <div className="w-full h-[250px] flex flex-col items-center">
        <h3 className="text-center font-semibold text-lg mb-2">{title}</h3>
        {data[0].value > 0 ? (
            <ChartContainer config={chartConfig} className="w-full h-full max-w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Tooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <text
                            x="50%"
                            y="50%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-foreground text-3xl font-bold"
                        >
                            {data[0].value}
                        </text>
                    </PieChart>
                </ResponsiveContainer>
            </ChartContainer>
        ) : (
             <div className="flex-1 flex items-center justify-center text-muted-foreground">No data</div>
        )}
    </div>
);


const LogisticsSummaryMemo = React.memo(function LogisticsSummary() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'leads')) : null), [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

  const summaryData = useMemo(() => {
    if (!leads) return { awaitingQualityCheck: 0, awaitingSalesAudit: 0 };
    
    const awaitingQualityCheck = leads.filter(
        lead => lead.isEndorsedToLogistics && !lead.isQualityApproved
    ).length;

    const awaitingSalesAudit = leads.filter(
        lead => lead.isSalesAuditRequested && !lead.isSalesAuditComplete
    ).length;

    return { awaitingQualityCheck, awaitingSalesAudit };
  }, [leads]);
  
  const qualityCheckData = [{ name: 'Awaiting Quality Check', value: summaryData.awaitingQualityCheck, fill: COLORS.awaitingQualityCheck }];
  const salesAuditData = [{ name: 'Awaiting Sales Audit', value: summaryData.awaitingSalesAudit, fill: COLORS.awaitingSalesAudit }];

  if (isLoading) {
    return (
        <Card className="w-full shadow-xl">
            <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Skeleton className="h-[250px] w-full" />
                <Skeleton className="h-[250px] w-full" />
            </CardContent>
        </Card>
    );
  }

  if (error) {
    return <p className="text-destructive">Error loading summary data: {error.message}</p>;
  }

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black border-none">
      <CardHeader>
        <CardTitle className="text-black">Logistics Reports</CardTitle>
        <CardDescription className="text-gray-600">
          An overview of key metrics for the logistics department.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <DoughnutChart data={qualityCheckData} title="Awaiting Quality Check" />
        <DoughnutChart data={salesAuditData} title="Awaiting Sales Audit" />
      </CardContent>
    </Card>
  );
});

export { LogisticsSummaryMemo as LogisticsSummary };