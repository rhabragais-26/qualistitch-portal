'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, setDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format, addMonths } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Save, RefreshCw, Info, TrendingUp, Banknote, PiggyBank, ShieldCheck } from 'lucide-react';
import { Separator } from '../ui/separator';

const assumptionsSchema = z.object({
  grossMarginPercent: z.coerce.number().min(0, "Cannot be negative").max(100, "Cannot exceed 100"),
  desiredProfit: z.coerce.number().min(0, "Cannot be negative"),
  contingencyPercent: z.coerce.number().min(0, "Cannot be negative").max(100, "Cannot exceed 100"),
  targetPeriodMode: z.enum(['per-month', 'total-range']).default('per-month'),
  notes: z.string().optional(),
});

type AssumptionsFormValues = z.infer<typeof assumptionsSchema>;

type FinanceAssumption = {
  grossMarginPercent: number;
  desiredProfit: number;
  contingencyPercent: number;
  targetPeriodMode: 'per-month' | 'total-range';
  notes?: string;
};

type FinanceForecastRollup = {
  month: string;
  combinedForecastExpense: number;
};

export function Assumptions() {
  const firestore = useFirestore();
  const { userProfile, isAdmin } = useUser();
  const { toast } = useToast();
  
  const [dateRange, setDateRange] = useState('6');
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = isAdmin || userProfile?.position === 'Finance';

  const assumptionsRef = useMemoFirebase(() => firestore ? doc(firestore, 'financeAssumptions', 'current') : null, [firestore]);
  const { data: assumptions, isLoading: assumptionsLoading, refetch } = useDoc<FinanceAssumption>(assumptionsRef);

  const rollupsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const months = parseInt(dateRange, 10);
    const startMonth = format(new Date(), 'yyyy-MM');
    return query(
        collection(firestore, 'financeForecastRollups'),
        where('month', '>=', startMonth),
        orderBy('month', 'asc'),
        limit(months)
    );
  }, [firestore, dateRange]);
  const { data: rollups, isLoading: rollupsLoading } = useCollection<FinanceForecastRollup>(rollupsQuery);

  const form = useForm<AssumptionsFormValues>({
    resolver: zodResolver(assumptionsSchema),
    defaultValues: {
      grossMarginPercent: 0,
      desiredProfit: 0,
      contingencyPercent: 0,
      targetPeriodMode: 'per-month',
      notes: '',
    },
  });

  const formValues = form.watch();

  useEffect(() => {
    if (assumptions) {
      form.reset({
        grossMarginPercent: assumptions.grossMarginPercent * 100,
        desiredProfit: assumptions.desiredProfit,
        contingencyPercent: assumptions.contingencyPercent * 100,
        targetPeriodMode: assumptions.targetPeriodMode || 'per-month',
        notes: assumptions.notes || '',
      });
    }
  }, [assumptions, form.reset]);

  const onSubmit = async (data: AssumptionsFormValues) => {
    if (!firestore || !canEdit) return;
    setIsSaving(true);
    
    const dataToSave = {
      grossMarginPercent: data.grossMarginPercent / 100,
      desiredProfit: data.desiredProfit,
      contingencyPercent: data.contingencyPercent / 100,
      targetPeriodMode: data.targetPeriodMode,
      notes: data.notes || '',
    };

    try {
      await setDoc(assumptionsRef!, dataToSave, { merge: true });
      toast({ title: 'Assumptions Saved', description: 'Your financial forecast assumptions have been updated.' });
      refetch();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const calculatedValues = useMemo(() => {
    const forecastedExpenses = rollups?.reduce((sum, r) => sum + r.combinedForecastExpense, 0) || 0;
    const contingencyAmount = forecastedExpenses * (formValues.contingencyPercent / 100);
    
    let totalDesiredProfit = formValues.desiredProfit || 0;
    if (formValues.targetPeriodMode === 'per-month') {
        totalDesiredProfit *= (rollups?.length || 1);
    }

    const totalNeeded = forecastedExpenses + contingencyAmount + totalDesiredProfit;
    const grossMarginDecimal = formValues.grossMarginPercent / 100;
    const minSalesTarget = grossMarginDecimal > 0 ? totalNeeded / grossMarginDecimal : Infinity;

    return {
      forecastedExpenses,
      contingencyAmount,
      totalDesiredProfit,
      totalNeeded,
      minSalesTarget,
    };
  }, [rollups, formValues]);
  
  const isLoading = assumptionsLoading || rollupsLoading;

  return (
    <div className="mt-6 flex justify-center">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Forecast Assumptions</CardTitle>
          <CardDescription>Define the key drivers for your financial forecast.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-8">
              {isLoading ? <Skeleton className="h-48 w-full" /> : (
                <fieldset disabled={!canEdit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="grossMarginPercent" render={({ field }) => (
                      <FormItem><FormLabel>Gross Margin Percent</FormLabel>
                        <div className="relative"><Input type="number" {...field} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span></div>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="desiredProfit" render={({ field }) => (
                      <FormItem><FormLabel>Desired Profit</FormLabel>
                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                          <Input type="text" className="pl-7"
                            value={field.value ? new Intl.NumberFormat('en-US').format(field.value) : ''}
                            onChange={(e) => field.onChange(Number(e.target.value.replace(/,/g, '')))} />
                        </div><FormMessage />
                      </FormItem>
                    )} />
                     <FormField control={form.control} name="contingencyPercent" render={({ field }) => (
                      <FormItem><FormLabel>Contingency Percent</FormLabel>
                        <div className="relative"><Input type="number" {...field} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span></div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="targetPeriodMode" render={({ field }) => (
                      <FormItem className="space-y-3"><FormLabel>Target Period Mode</FormLabel>
                          <FormControl>
                              <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
                                  <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="per-month" /></FormControl><FormLabel className="font-normal">Per month</FormLabel></FormItem>
                                  <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="total-range" /></FormControl><FormLabel className="font-normal">Total for selected range</FormLabel></FormItem>
                              </RadioGroup>
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem><FormLabel>Notes (Optional)</FormLabel><Textarea {...field} /><FormMessage /></FormItem>
                  )} />
                </fieldset>
              )}
              
              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Calculated Output</h3>
                    <div className="flex items-center gap-2">
                        <Label>Date Range</Label>
                        <Select value={dateRange} onValueChange={setDateRange} disabled={isLoading}>
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="6">Next 6 Months</SelectItem>
                                <SelectItem value="12">Next 12 Months</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-2"><Banknote/> Forecasted Expenses</span> <strong>{formatCurrency(calculatedValues.forecastedExpenses)}</strong></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-2"><ShieldCheck /> Contingency Amount</span> <strong>{formatCurrency(calculatedValues.contingencyAmount)}</strong></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-2"><PiggyBank /> Desired Profit</span> <strong>{formatCurrency(calculatedValues.totalDesiredProfit)}</strong></div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex justify-between items-center font-bold text-base"><span className="text-muted-foreground flex items-center gap-2"><Info /> Total Needed</span> <span>{formatCurrency(calculatedValues.totalNeeded)}</span></div>
                        <Separator />
                        <div className="flex justify-between items-center font-bold text-lg text-primary"><span className="flex items-center gap-2"><TrendingUp/> Minimum Sales Target</span> 
                          <span>
                            {isFinite(calculatedValues.minSalesTarget) 
                                ? formatCurrency(calculatedValues.minSalesTarget) 
                                : <span className="text-destructive text-sm">Invalid Margin %</span>
                            }
                          </span>
                        </div>
                    </div>
                </div>
              </div>
            </CardContent>
            {canEdit && (
              <CardFooter className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => form.reset(assumptions ? {
                    grossMarginPercent: assumptions.grossMarginPercent * 100,
                    desiredProfit: assumptions.desiredProfit,
                    contingencyPercent: assumptions.contingencyPercent * 100,
                    notes: assumptions.notes || '',
                } : form.form.defaultValues)} disabled={isSaving || !form.formState.isDirty}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Reset
                </Button>
                <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Assumptions
                </Button>
              </CardFooter>
            )}
          </form>
        </Form>
      </Card>
    </div>
  );
}
