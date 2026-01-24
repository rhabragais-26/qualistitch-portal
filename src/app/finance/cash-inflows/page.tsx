'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
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
import { Header } from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Banknote } from 'lucide-react';

type Payment = {
  type: 'down' | 'full';
  amount: number;
  mode: string;
};

type Lead = {
  payments?: Payment[];
  submissionDateTime: string;
};

export default function CashInflowsPage() {
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

  const cashInflowsData = useMemo(() => {
    if (!leads) return [];

    const inflowsByDate: { [date: string]: { [mode: string]: number } } = {};

    leads.forEach(lead => {
      if (lead.payments) {
        lead.payments.forEach(payment => {
          if (payment.type === 'down' && payment.amount > 0) {
            const paymentDate = format(parseISO(lead.submissionDateTime), 'yyyy-MM-dd');
            if (!inflowsByDate[paymentDate]) {
              inflowsByDate[paymentDate] = {};
            }
            if (!inflowsByDate[paymentDate][payment.mode]) {
              inflowsByDate[paymentDate][payment.mode] = 0;
            }
            inflowsByDate[paymentDate][payment.mode] += payment.amount;
          }
        });
      }
    });

    const sortedDates = Object.keys(inflowsByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    return sortedDates.map(date => {
        const modes = inflowsByDate[date];
        const dateTotal = Object.values(modes).reduce((sum, amount) => sum + amount, 0);
        return {
            date,
            modes,
            total: dateTotal,
        };
    });
  }, [leads]);
  
  const grandTotal = useMemo(() => {
    return cashInflowsData.reduce((sum, day) => sum + day.total, 0);
  }, [cashInflowsData]);

  if (isLoading) {
    return (
      <Header>
        <div className="p-8">
          <Skeleton className="h-96 w-full" />
        </div>
      </Header>
    );
  }

  if (error) {
    return (
      <Header>
        <div className="p-8 text-destructive">
          Error loading data: {error.message}
        </div>
      </Header>
    );
  }

  return (
    <Header>
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Banknote />
                  Cash Inflows from Downpayments
                </CardTitle>
                <CardDescription>
                  Summary of all recorded downpayments, grouped by day and payment method.
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Cash Inflow</p>
                <p className="text-2xl font-bold">{formatCurrency(grandTotal)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md h-[75vh] overflow-y-auto modern-scrollbar">
              <Table>
                <TableHeader className="sticky top-0 bg-neutral-800 z-10">
                  <TableRow>
                    <TableHead className="text-white font-bold">Date</TableHead>
                    <TableHead className="text-white font-bold">Payment Method</TableHead>
                    <TableHead className="text-white font-bold text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashInflowsData.length > 0 ? (
                    cashInflowsData.map(({date, modes, total}) => (
                        <React.Fragment key={date}>
                            {Object.entries(modes).map(([mode, amount], index) => (
                                <TableRow key={`${date}-${mode}`} className={index > 0 ? "border-t-0" : ""}>
                                    {index === 0 && (
                                        <TableCell rowSpan={Object.keys(modes).length} className="font-bold align-top pt-4">
                                            {format(parseISO(date), 'MMM dd, yyyy')}
                                        </TableCell>
                                    )}
                                    <TableCell>{mode}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(amount)}</TableCell>
                                </TableRow>
                            ))}
                             <TableRow className="bg-muted/50 font-bold border-b-2 border-black">
                                <TableCell colSpan={2} className="text-right">Total for {format(parseISO(date), 'MMM dd')}</TableCell>
                                <TableCell className="text-right">{formatCurrency(total)}</TableCell>
                            </TableRow>
                        </React.Fragment>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No downpayment data available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </Header>
  );
}
