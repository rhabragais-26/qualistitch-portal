
'use client';

import { Header } from '@/components/header';
import { InventoryReportTable } from '@/components/inventory-report-table';
import { DailySoldQuantityChart } from '@/components/daily-sold-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';

type Lead = {
  submissionDateTime: string;
  orders: {
    productType: string;
    quantity: number;
  }[];
};
type InventoryItem = {
    id: string;
    productType: string;
    color: string;
    size: string;
    stock: number;
};

export default function InventoryReportsPage() {
  const [productTypeFilter, setProductTypeFilter] = useState('');
  const [timeRange, setTimeRange] = useState('30d');

  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'leads')) : null), [firestore]);
  const { data: leads } = useCollection<Lead>(leadsQuery, undefined, { listen: false });
  const inventoryQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'inventory')) : null), [firestore]);
  const { data: inventoryItems } = useCollection<InventoryItem>(inventoryQuery, undefined, { listen: false });

  const productTypes = useMemo(() => {
    if (!leads && !inventoryItems) return [];
    const fromLeads = leads?.flatMap(l => l.orders.map(o => o.productType)) || [];
    const fromInventory = inventoryItems?.map(i => i.productType) || [];
    return [...new Set([...fromLeads, ...fromInventory])]
        .filter(type => type && type !== 'Patches' && type !== 'Client Owned')
        .sort();
  }, [leads, inventoryItems]);
  
  useEffect(() => {
    if (productTypes.length > 0 && !productTypeFilter) {
        setProductTypeFilter(productTypes[0]);
    }
  }, [productTypes, productTypeFilter]);

  return (
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <Card className="w-full shadow-xl">
          <CardHeader>
             <CardTitle className="text-center">Inventory Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
             <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">Daily Sold vs. Remaining Stocks</h3>
                  <p className="text-sm text-muted-foreground">Daily sold quantity and remaining stocks for the selected product.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
                        <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Select Product Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {productTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="this_week">This Week</SelectItem>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="14d">Last 14 Days</SelectItem>
                            <SelectItem value="30d">Last 30 Days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
             </div>
            <DailySoldQuantityChart productTypeFilter={productTypeFilter} timeRange={timeRange} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                <div>
                    <h3 className="text-lg font-bold mt-8">Remaining Stocks</h3>
                    <p className="text-sm text-muted-foreground mb-4">Remaining stock quantity breakdown by color and size.</p>
                    <InventoryReportTable reportType="inventory" productTypeFilter={productTypeFilter} />
                </div>
                <div>
                    <h3 className="text-lg font-bold mt-8">For Priority Purchase</h3>
                    <p className="text-sm text-muted-foreground mb-4">Items with low or negative stock levels (10 or less remaining).</p>
                    <InventoryReportTable reportType="priority" productTypeFilter={productTypeFilter} />
                </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </Header>
  );
}
