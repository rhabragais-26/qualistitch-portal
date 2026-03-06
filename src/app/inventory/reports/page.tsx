'use client';

import { Header } from '@/components/header';
import { InventoryReportTable } from '@/components/inventory-report-table';
import { DailySoldQuantityChart } from '@/components/daily-sold-chart';
import { EndorsedItemsChart } from '@/components/endorsed-items-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type LeadOrder = {
  productType: string;
  color: string;
  size: string;
  quantity: number;
};

type Lead = {
  submissionDateTime: string;
  isSentToProduction?: boolean;
  sentToProductionTimestamp?: string;
  isEndorsedToLogistics?: boolean;
  endorsedToLogisticsTimestamp?: string;
  shipmentStatus?: 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  orders: {
    productType: string;
    color: string;
    size: string;
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

const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

export default function InventoryReportsPage() {
  const [productTypeFilter, setProductTypeFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('All Colors');
  const [sizeFilter, setSizeFilter] = useState('All Sizes');
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
  
  const availableColors = useMemo(() => {
    if (!productTypeFilter || (!leads && !inventoryItems)) return [];
    const colorsFromLeads =
      leads
        ?.flatMap((l) => l.orders)
        .filter((o) => o.productType === productTypeFilter)
        .map((o) => o.color) || [];
    const colorsFromInventory =
      inventoryItems
        ?.filter((i) => i.productType === productTypeFilter)
        .map((i) => i.color) || [];

    return [
      'All Colors',
      ...[...new Set([...colorsFromLeads, ...colorsFromInventory])].sort(),
    ];
  }, [leads, inventoryItems, productTypeFilter]);

  const availableSizes = useMemo(() => {
    if (!productTypeFilter || !inventoryItems) return ['All Sizes'];
    const sizesFromInventory =
      inventoryItems
        ?.filter((i) => i.productType === productTypeFilter)
        .map((i) => i.size) || [];

    const uniqueSizes = [...new Set(sizesFromInventory)].sort((a, b) => {
        const indexA = sizeOrder.indexOf(a);
        const indexB = sizeOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    return [
      'All Sizes',
      ...uniqueSizes,
    ];
  }, [inventoryItems, productTypeFilter]);

  useEffect(() => {
    if (productTypes.length > 0 && !productTypeFilter) {
        setProductTypeFilter(productTypes[0]);
    }
  }, [productTypes, productTypeFilter]);

  useEffect(() => {
    setColorFilter('All Colors');
    setSizeFilter('All Sizes');
  }, [productTypeFilter]);

  const handleResetFilters = () => {
    setProductTypeFilter('Corporate Jacket');
    setColorFilter('All Colors');
    setSizeFilter('All Sizes');
    setTimeRange('30d');
  };

  const onHandReportData = useMemo(() => {
    if (!inventoryItems || !leads) return { headers: [], rows: [] };
    
    const soldQuantities = new Map<string, number>();
    const onProcessQuantities = new Map<string, number>();
    const dispatchedQuantities = new Map<string, number>();
    
    leads.forEach(lead => {
        const createKey = (order: { productType: string, color: string, size: string }) => `${order.productType}-${order.color}-${order.size}`;
        
        lead.orders.forEach(order => {
            const key = createKey(order);
            soldQuantities.set(key, (soldQuantities.get(key) || 0) + order.quantity);
        });

        if (lead.shipmentStatus === 'Shipped' || lead.shipmentStatus === 'Delivered') {
            lead.orders.forEach(order => {
                const key = createKey(order);
                dispatchedQuantities.set(key, (dispatchedQuantities.get(key) || 0) + order.quantity);
            });
        } else if (lead.isSentToProduction || lead.isEndorsedToLogistics) {
            lead.orders.forEach(order => {
                const key = createKey(order);
                onProcessQuantities.set(key, (onProcessQuantities.get(key) || 0) + order.quantity);
            });
        }
    });
    
    const processedItems = inventoryItems.map(item => {
        const key = `${item.productType}-${item.color}-${item.size}`;
        const sold = soldQuantities.get(key) || 0;
        const onProcess = onProcessQuantities.get(key) || 0;
        const dispatched = dispatchedQuantities.get(key) || 0;
        const onHand = item.stock;

        const count = (onHand + onProcess + dispatched) - sold;
        return { ...item, count };
      });
    
    let filteredItems = processedItems;
    if (productTypeFilter && productTypeFilter !== 'All') {
        filteredItems = filteredItems.filter(item => item.productType === productTypeFilter);
    }
    if (colorFilter && colorFilter !== 'All Colors') {
        filteredItems = filteredItems.filter(item => item.color === colorFilter);
    }
    if (sizeFilter && sizeFilter !== 'All Sizes') {
        filteredItems = filteredItems.filter(item => item.size === sizeFilter);
    }
    
    if (filteredItems.length === 0) return { headers: [], rows: [] };

    const colors = [...new Set(filteredItems.map(item => item.color))].sort();
    const sizes = sizeFilter !== 'All Sizes' ? [sizeFilter] : [...new Set(filteredItems.map(item => item.size))].sort((a, b) => {
        const indexA = sizeOrder.indexOf(a);
        const indexB = sizeOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    const rows = colors.map(color => {
      const sizeData: { [size: string]: number | null } = {};
      sizes.forEach(size => {
        const item = filteredItems.find(i => i.color === color && i.size === size);
        sizeData[size] = item ? item.count : null;
      });
      return { color, ...sizeData };
    });

    return { headers: sizes, rows };

  }, [inventoryItems, leads, productTypeFilter, colorFilter, sizeFilter]);

  const { totalPositiveStock, totalNegativeStock } = useMemo(() => {
    if (!onHandReportData.rows || onHandReportData.rows.length === 0) {
      return { totalPositiveStock: 0, totalNegativeStock: 0 };
    }

    let positiveSum = 0;
    let negativeSum = 0;

    onHandReportData.rows.forEach(row => {
      onHandReportData.headers.forEach(header => {
        const stock = (row as any)[header];
        if (typeof stock === 'number') {
          if (stock > 0) {
            positiveSum += stock;
          } else if (stock < 0) {
            negativeSum += stock;
          }
        }
      });
    });

    return { totalPositiveStock: positiveSum, totalNegativeStock: negativeSum };
  }, [onHandReportData]);


  return (
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <Card className="w-full shadow-xl">
          <CardHeader>
             <CardTitle className="text-center text-3xl font-bold">Inventory Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
             <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-teal-600">Daily Sold vs. Remaining Stocks</h3>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleResetFilters} className="bg-teal-600 hover:bg-teal-700 text-white">Reset Filters</Button>
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
                    <Select value={colorFilter} onValueChange={setColorFilter} disabled={!productTypeFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Color" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableColors.map((color) => (
                                <SelectItem key={color} value={color}>
                                {color}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Select value={sizeFilter} onValueChange={setSizeFilter} disabled={!productTypeFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Size" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableSizes.map((size) => (
                                <SelectItem key={size} value={size}>
                                {size}
                                </SelectItem>
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
            <DailySoldQuantityChart productTypeFilter={productTypeFilter} colorFilter={colorFilter} sizeFilter={sizeFilter} timeRange={timeRange} />
            
            <Separator />

            <div className="mt-8">
              <h3 className="text-lg font-bold text-teal-600">
                Items Endorsed to Production/Logistics Daily
              </h3>
              <div className="mt-2" />
              <EndorsedItemsChart productTypeFilter={productTypeFilter} colorFilter={colorFilter} sizeFilter={sizeFilter} timeRange={timeRange} />
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                <div className="space-y-4">
                    <h3 className="text-lg font-bold mt-4">
                        <span className="text-teal-600">On-Hand Stocks</span> ({productTypeFilter} - {colorFilter} - {sizeFilter})
                    </h3>
                    <InventoryReportTable reportType="inventory" productTypeFilter={productTypeFilter} colorFilter={colorFilter} sizeFilter={sizeFilter} />
                </div>
                <div className="space-y-4">
                    <h3 className="text-lg font-bold mt-4">
                        <span className="text-teal-600">For Priority Purchase</span> ({productTypeFilter} - {colorFilter} - {sizeFilter})
                    </h3>
                    <InventoryReportTable reportType="priority" productTypeFilter={productTypeFilter} colorFilter={colorFilter} sizeFilter={sizeFilter} />
                </div>
            </div>
            <div className="mt-4">
              <Card className="w-full shadow-lg bg-gray-50">
                  <CardHeader className="p-2">
                      <CardTitle className="text-lg text-center">Overall Inventory Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex justify-around items-center text-center">
                      <div>
                          <p className="text-sm text-muted-foreground">Total Stocks (On-Hand)</p>
                          <p className="text-2xl font-bold text-green-600">{totalPositiveStock.toLocaleString()}</p>
                      </div>
                      <Separator orientation="vertical" className="h-12" />
                      <div>
                          <p className="text-sm text-muted-foreground">Total Deficit</p>
                          <p className="text-2xl font-bold text-destructive">{Math.abs(totalNegativeStock).toLocaleString()}</p>
                      </div>
                  </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </main>
    </Header>
  );
}
