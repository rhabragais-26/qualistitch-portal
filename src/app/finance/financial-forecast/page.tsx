
'use client';

import { Header } from '@/components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialForecastDashboard } from '@/components/financial-forecast/dashboard';
import { MonthlyForecastInput } from '@/components/financial-forecast/monthly-input';
import { ScheduledExpenses } from '@/components/financial-forecast/scheduled-expenses';
// import { Assumptions } from '@/components/financial-forecast/assumptions';

export default function FinancialForecastPage() {
  return (
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="monthly-input">Monthly Forecast Input</TabsTrigger>
            <TabsTrigger value="scheduled-expenses">Scheduled Expenses</TabsTrigger>
            <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard">
            <FinancialForecastDashboard />
          </TabsContent>
          <TabsContent value="monthly-input">
            <MonthlyForecastInput />
          </TabsContent>
          <TabsContent value="scheduled-expenses">
             <ScheduledExpenses />
          </TabsContent>
          <TabsContent value="assumptions">
             <div className="flex items-center justify-center p-8 text-center text-muted-foreground">Assumptions - Coming Soon</div>
          </TabsContent>
        </Tabs>
      </main>
    </Header>
  );
}

    