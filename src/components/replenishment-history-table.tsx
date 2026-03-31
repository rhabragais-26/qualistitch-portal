'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, writeBatch, doc } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { DateRange } from 'react-day-picker';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarIcon, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';

type InventoryReplenishment = {
  id: string;
  date: string;
  productType: string;
  color: string;
  size: string;
  quantity: number;
  submittedBy: string;
  timestamp: string;
};

const productTypes = [
  'Executive Jacket 1', 'Executive Jacket v2 (with lines)', 'Turtle Neck Jacket',
  'Corporate Jacket', 'Reversible v1', 'Reversible v2', 'Polo Shirt (Smilee) - Cool Pass',
  'Polo Shirt (Smilee) - Cotton Blend)', 'Polo Shirt (Lifeline)', 'Polo Shirt (Blue Corner)', 'Polo Shirt (Softex)',
];

const jacketColors = [
    'Army Green', 'Black', 'Black/Gray', 'Black/Khaki', 'Black/Navy Blue', 'Brown',
    'Dark Gray', 'Dark Khaki', 'Khaki', 'Light Gray', 'Light Khaki', 'Maroon/Gray',
    'Navy Blue', 'Navy Blue/Gray', 'Olive Green',
];

const poloShirtColors = [
    'Aqua Blue', 'Black', 'Brown', 'Choco Brown', 'Cream', 'Dark Green', 'Dark Gray', 'Dawn Blue',
    'Emerald Green', 'Estate Blue', 'Fair Orchid', 'Fuchsia', 'Gold', 'Golden Yellow', 'Green',
    'Green Briar', 'Honey Mustard', 'Irish Green', 'Jade Green', 'Light Green', 'Light Gray',
    'Maroon', 'Melange Gray', 'Military Green', 'Mint Green', 'Mocha', 'Navy Blue', 'Nine Ion Gray',
    'Oatmeal', 'Orange', 'Pink', 'Purple', 'Rapture Rose', 'Red', 'Royal Blue', 'Sky Blue',
    'Slate Blue', 'Teal', 'White', 'Yellow',
];

const productSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

type BatchUpdateData = {
  date?: string;
  productType?: string;
  color?: string;
  size?: string;
  quantity?: number;
};

function BatchEditDialog({
  open,
  onOpenChange,
  selectedCount,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onSave: (updateData: BatchUpdateData) => void;
}) {
  const [updateData, setUpdateData] = useState<BatchUpdateData>({});

  const handleSave = () => {
    onSave(updateData);
    setUpdateData({});
  };

  const isPolo = updateData.productType?.includes('Polo Shirt');
  const availableColors = isPolo ? poloShirtColors : jacketColors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batch Edit Replenishments</DialogTitle>
          <DialogDescription>
            Editing {selectedCount} record(s). Only fill the fields you want to change.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="batch-date">Date</Label>
            <Input
              id="batch-date"
              type="date"
              onChange={(e) => setUpdateData(prev => ({ ...prev, date: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch-product-type">Product Type</Label>
            <Select onValueChange={(value) => setUpdateData(prev => ({ ...prev, productType: value }))}>
              <SelectTrigger><SelectValue placeholder="Select a Product Type" /></SelectTrigger>
              <SelectContent>
                {productTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batch-color">Color</Label>
              <Select onValueChange={(value) => setUpdateData(prev => ({ ...prev, color: value }))} disabled={!updateData.productType}>
                <SelectTrigger><SelectValue placeholder="Select a Color" /></SelectTrigger>
                <SelectContent>
                  {availableColors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-size">Size</Label>
              <Select onValueChange={(value) => setUpdateData(prev => ({ ...prev, size: value }))}>
                <SelectTrigger><SelectValue placeholder="Select a Size" /></SelectTrigger>
                <SelectContent>
                  {productSizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch-quantity">Quantity</Label>
            <Input
              id="batch-quantity"
              type="number"
              placeholder="Leave blank to keep original"
              onChange={(e) => setUpdateData(prev => ({ ...prev, quantity: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Apply Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReplenishmentHistoryTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const replenishmentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'inventory_replenishments'), orderBy('timestamp', 'desc')) : null, [firestore]);
  const { data: replenishments, isLoading, error } = useCollection<InventoryReplenishment>(replenishmentsQuery, undefined, { listen: false });

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isBatchEditDialogOpen, setIsBatchEditDialogOpen] = useState(false);

  const filteredReplenishments = useMemo(() => {
    if (!replenishments) return [];
    if (!dateRange?.from) return replenishments;

    const from = dateRange.from;
    const to = dateRange.to || from;

    return replenishments.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= from && itemDate <= to;
    });
  }, [replenishments, dateRange]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(filteredReplenishments.map(r => r.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleBatchUpdate = async (updateData: BatchUpdateData) => {
    if (selectedRows.size === 0 || !firestore) return;
    const batch = writeBatch(firestore);
    
    // Filter out undefined values
    const cleanUpdateData = Object.fromEntries(Object.entries(updateData).filter(([_, v]) => v !== undefined));

    if (Object.keys(cleanUpdateData).length === 0) {
      toast({ variant: 'destructive', title: 'No Changes', description: 'Please select a value to update.' });
      return;
    }
    
    selectedRows.forEach(id => {
      const docRef = doc(firestore, 'inventory_replenishments', id);
      batch.update(docRef, cleanUpdateData);
    });

    try {
      await batch.commit();
      toast({ title: 'Batch Update Successful', description: `${selectedRows.size} records have been updated.` });
      setSelectedRows(new Set());
      setIsBatchEditDialogOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    }
  };


  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Replenishment History</CardTitle>
            <CardDescription>History of all inventory replenishments.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
             <Button onClick={() => setIsBatchEditDialogOpen(true)} disabled={selectedRows.size === 0}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Selected ({selectedRows.size})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.size > 0 && selectedRows.size === filteredReplenishments.length}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Product Type</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead>Submitted By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Skeleton className="h-20 w-full" />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-destructive">Error: {error.message}</TableCell>
                  </TableRow>
                ) : filteredReplenishments.length > 0 ? (
                  filteredReplenishments.map((item) => (
                    <TableRow key={item.id} data-state={selectedRows.has(item.id) && "selected"}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(item.id)}
                          onCheckedChange={(checked) => handleSelectRow(item.id, !!checked)}
                          aria-label={`Select row for ${item.id}`}
                        />
                      </TableCell>
                      <TableCell>{format(new Date(item.date), 'MM-dd-yyyy')}</TableCell>
                      <TableCell>{item.productType}</TableCell>
                      <TableCell>{item.color}</TableCell>
                      <TableCell>{item.size}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell>{item.submittedBy}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No replenishments found for the selected period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <BatchEditDialog
        open={isBatchEditDialogOpen}
        onOpenChange={setIsBatchEditDialogOpen}
        selectedCount={selectedRows.size}
        onSave={handleBatchUpdate}
      />
    </>
  );
}
