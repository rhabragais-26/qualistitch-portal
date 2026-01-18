
'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const LogisticsSummaryMemo = React.memo(function LogisticsSummary() {
  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black border-none">
      <CardHeader>
        <CardTitle className="text-black">Logistics Summary</CardTitle>
        <CardDescription className="text-gray-600">
          An overview of logistics and shipment data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">No summary data available yet.</p>
        </div>
      </CardContent>
    </Card>
  );
});

export { LogisticsSummaryMemo as LogisticsSummary };
