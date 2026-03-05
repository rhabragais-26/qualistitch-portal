'use client';

import { Header } from '@/components/header';
import { InventorySummaryTable } from '@/components/inventory-summary-table';
import React, { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types for ReplenishmentAnalysis
type InventoryItemForAnalysis = { productType: string; color: string; stock: number; size: string };
type OrderForAnalysis = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
};
type LeadForAnalysis = { 
  orders: OrderForAnalysis[];
  isSentToProduction?: boolean;
  isEndorsedToLogistics?: boolean;
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
};

function ReplenishmentAnalysis() {
  const firestore = useFirestore();
  const [productTypeFilter, setProductTypeFilter] = useState('All');

  const inventoryQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'inventory')) : null, [firestore]);
  const { data: inventoryItems, isLoading: isInventoryLoading } = useCollection<InventoryItemForAnalysis>(inventoryQuery);

  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading: areLeadsLoading } = useCollection<LeadForAnalysis>(leadsQuery);

  const productTypes = useMemo(() => {
    if (!inventoryItems) return ['All'];
    return ['All', ...[...new Set(inventoryItems.map(i => i.productType))].sort()];
  }, [inventoryItems]);

  useEffect(() => {
    if (productTypes.length > 1 && productTypeFilter === 'All' && productTypes.includes('Executive Jacket 1')) {
      setProductTypeFilter('Executive Jacket 1');
    } else if (productTypes.length > 1 && productTypeFilter === 'All') {
        setProductTypeFilter(productTypes[1]);
    }
  }, [productTypes, productTypeFilter]);

  const analysisData = useMemo(() => {
    if (!inventoryItems || !leads) return [];

    const soldQuantities = new Map<string, number>();
    const onProcessQuantities = new Map<string, number>();

    leads.forEach(lead => {
        lead.orders.forEach(order => {
            const key = `${order.productType}-${order.color}`;
            soldQuantities.set(key, (soldQuantities.get(key) || 0) + order.quantity);

            if (!(lead.shipmentStatus === 'Shipped' || lead.shipmentStatus === 'Delivered')) {
                if (lead.isSentToProduction || lead.isEndorsedToLogistics) {
                    onProcessQuantities.set(key, (onProcessQuantities.get(key) || 0) + order.quantity);
                }
            }
        });
    });

    const stockData = new Map<string, { productType: string, color: string, onHand: number }>();
    inventoryItems.forEach(item => {
      const key = `${item.productType}-${item.color}`;
      const current = stockData.get(key) || { productType: item.productType, color: item.color, onHand: 0 };
      current.onHand += item.stock;
      stockData.set(key, current);
    });

    let data = Array.from(stockData.keys()).map(key => {
      const stockInfo = stockData.get(key)!;
      const totalSold = soldQuantities.get(key) || 0;
      const totalOnHand = stockInfo.onHand;
      const totalOnProcess = onProcessQuantities.get(key) || 0;
      const remainingStock = totalOnHand - totalOnProcess;
      const sellThrough = (remainingStock + totalSold > 0) ? (totalSold / (remainingStock + totalSold)) * 100 : 0;

      let status: 'Urgent' | 'Recommended' | 'Stable' = 'Stable';
      if (remainingStock <= 20) {
        status = 'Urgent';
      } else if (sellThrough > 75) {
        status = 'Urgent';
      } else if (sellThrough > 50) {
        status = 'Recommended';
      }

      return {
        productType: stockInfo.productType,
        color: stockInfo.color,
        totalOnHand,
        totalSold,
        sellThrough,
        status,
        remainingStock,
      };
    });

    if (productTypeFilter !== 'All') {
      data = data.filter(item => item.productType === productTypeFilter);
    }
    
    data.sort((a, b) => {
      const statusOrder = { 'Urgent': 0, 'Recommended': 1, 'Stable': 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return b.sellThrough - a.sellThrough;
    });

    return data;
  }, [inventoryItems, leads, productTypeFilter]);

  const getStatusBadge = (status: 'Urgent' | 'Recommended' | 'Stable') => {
    if (status === 'Urgent') return <Badge variant="destructive">Urgent</Badge>;
    if (status === 'Recommended') return <Badge variant="warning">Recommended</Badge>;
    return <Badge variant="success">Stable</Badge>;
  };
  
  const isLoading = isInventoryLoading || areLeadsLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle>Replenishment Analysis</CardTitle>
            <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
                <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filter by Product Type" />
                </SelectTrigger>
                <SelectContent>
                    {productTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
        <CardDescription>Demand vs. stock to identify replenishment needs.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-center">Remaining Stock</TableHead>
                <TableHead className="text-center">Total Sold (Historical)</TableHead>
                <TableHead className="text-center">Sell-Through Rate</TableHead>
                <TableHead className="text-center">Replenishment Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6}><Skeleton className="h-20 w-full" /></TableCell></TableRow>
              ) : (
                analysisData.map(item => (
                  <TableRow key={`${item.productType}-${item.color}`}>
                    <TableCell className="font-medium">{item.productType}</TableCell>
                    <TableCell>{item.color}</TableCell>
                    <TableCell className="text-center font-bold">{item.remainingStock}</TableCell>
                    <TableCell className="text-center">{item.totalSold}</TableCell>
                    <TableCell className="text-center font-semibold text-primary">{item.sellThrough.toFixed(1)}%</TableCell>
                    <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}


export default function InventorySummaryPage() {
  return (
    <Header>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <InventorySummaryTable />
        <ReplenishmentAnalysis />
      </div>
    </Header>
  );
}
