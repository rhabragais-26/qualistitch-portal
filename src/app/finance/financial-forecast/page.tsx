'use client';

import { Header } from '@/components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialForecastDashboard } from '@/components/financial-forecast/dashboard';
import { MonthlyForecastInput } from '@/components/financial-forecast/monthly-input';
import { ScheduledExpenses } from '@/components/financial-forecast/scheduled-expenses';
import { Assumptions } from '@/components/financial-forecast/assumptions';
import { useEffect } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, writeBatch, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

type FinanceCategory = { id: string; name: string; department: string; group: 'Fixed' | 'Variable' | 'One-Time'; };

const initialCategoriesData: { department: string; categories: { name: string; group: 'Fixed' | 'Variable' | 'One-Time' }[] }[] = [
  { department: 'Production', categories: [ { name: 'Direct Labor', group: 'Variable' }, { name: 'Factory Utilities & Supplies', group: 'Variable' } ] },
  { department: 'Sales', categories: [ { name: 'Sales Commissions', group: 'Variable' }, { name: 'Clients Meet Up Allowance', group: 'Variable' }, { name: 'Sales Salary', group: 'Fixed' }, { name: 'Office Supplies', group: 'Variable' } ] },
  { department: 'Marketing', categories: [ { name: 'Advertising & Promotions', group: 'Variable' }, { name: 'Branding Campaigns', group: 'Variable' }, { name: 'Marketing Salary', group: 'Fixed' } ] },
  { department: 'Finance', categories: [ { name: 'Accounting Salaries', group: 'Fixed' }, { name: 'Bank Charges', group: 'Variable' }, { name: 'Office Supplies', group: 'Variable' } ] },
  { department: 'Human Resources', categories: [ { name: 'Employee Welfare & Improvements', group: 'Variable' } ] },
  { department: 'Programming & I.T.', categories: [ { name: 'Software Licenses/Subscription', group: 'Fixed' }, { name: 'Programming Supplies', group: 'Variable' }, { name: 'Programmer Salary Allocation', group: 'Fixed' } ] },
  { department: 'Operations', categories: [ { name: 'Logistics Supplies', group: 'Variable' }, { name: 'Logistics & Delivery', group: 'Variable' }, { name: 'Administrative Utilities', group: 'Fixed' }, { name: 'Salary', group: 'Fixed' } ] }
];

export default function FinancialForecastPage() {
  const firestore = useFirestore();
  const { userProfile, isAdmin } = useUser();
  const { toast } = useToast();
  const canEdit = isAdmin || userProfile?.position === 'Finance';
  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'financeCategories')) : null, [firestore]);
  const { data: categories, isLoading, refetch } = useCollection<FinanceCategory>(categoriesQuery, undefined, { listen: false });

  useEffect(() => {
    if (!isLoading && categories?.length === 0 && canEdit && firestore) {
      const batch = writeBatch(firestore);
      initialCategoriesData.forEach(dept => {
        dept.categories.forEach(cat => {
          const newId = uuidv4();
          const docRef = doc(firestore, 'financeCategories', newId);
          batch.set(docRef, { ...cat, department: dept.department, id: newId });
        });
      });
      batch.commit().then(() => {
        toast({ title: "Categories Initialized", description: "Default forecast categories have been added."});
        refetch();
      }).catch(e => {
        console.error("Error initializing categories:", e);
        toast({ variant: 'destructive', title: "Initialization Failed", description: e.message });
      });
    }
  }, [isLoading, categories, canEdit, firestore, toast, refetch]);
  
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
             <Assumptions />
          </TabsContent>
        </Tabs>
      </main>
    </Header>
  );
}
