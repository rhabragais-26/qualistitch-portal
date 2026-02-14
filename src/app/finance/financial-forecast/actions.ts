
'use server';

import { firestore } from '@/firebase/admin';
import { collection, query, where, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';
import { startOfMonth, endOfMonth, addMonths, isBefore, isEqual, addWeeks, format, parse } from 'date-fns';

type FinanceForecastMonthly = {
  month: string;
  categoryId: string;
  amount: number;
};

type FinanceForecastScheduled = {
    id: string;
    date: any; // Firestore timestamp on server, string on client
    categoryId: string;
    amount: number;
    recurrence: "One-time" | "Weekly" | "Monthly";
    endDate?: any | null; // Firestore timestamp on server, string on client
};


/**
 * Recalculates and updates the monthly forecast rollup document in Firestore.
 * This should be triggered after any change to financeForecastMonthly or financeForecastScheduled documents.
 * @param month The month to update, in "YYYY-MM" format.
 */
export async function updateMonthlyForecastRollup(month: string): Promise<void> {
  try {
    const monthStart = startOfMonth(parse(month, 'yyyy-MM', new Date()));
    const monthEnd = endOfMonth(monthStart);

    // --- 1. Fetch Manual Monthly Entries ---
    const monthlyEntriesQuery = query(
      collection(firestore, 'financeForecastMonthly'),
      where('month', '==', month)
    );
    const monthlySnapshot = await getDocs(monthlyEntriesQuery);
    
    let totalManualExpense = 0;
    const totalsByCategory: { [key: string]: number } = {};

    monthlySnapshot.forEach((doc) => {
      const data = doc.data() as FinanceForecastMonthly;
      const amount = data.amount || 0;
      const categoryId = data.categoryId;

      totalManualExpense += amount;
      if (categoryId) {
        totalsByCategory[categoryId] = (totalsByCategory[categoryId] || 0) + amount;
      }
    });

    // --- 2. Fetch and Expand Scheduled Entries ---
    const scheduledEntriesQuery = query(collection(firestore, 'financeForecastScheduled'));
    const scheduledSnapshot = await getDocs(scheduledEntriesQuery);
    
    let totalScheduledExpense = 0;

    scheduledSnapshot.forEach(doc => {
      const data = doc.data() as FinanceForecastScheduled;
      const startDate = (data.date as Timestamp).toDate();
      const endDate = data.endDate ? (data.endDate as Timestamp).toDate() : null;
      
      let currentDate = startDate;

      while (isBefore(currentDate, monthEnd) || isEqual(currentDate, monthEnd)) {
        // Stop if the recurring event has an end date and we've passed it
        if (endDate && isBefore(endDate, currentDate)) {
            break;
        }

        // Check if the current occurrence is within the target month
        if (currentDate >= monthStart && currentDate <= monthEnd) {
            totalScheduledExpense += data.amount;
            if (data.categoryId) {
                totalsByCategory[data.categoryId] = (totalsByCategory[data.categoryId] || 0) + data.amount;
            }
        }

        // Move to the next occurrence
        if (data.recurrence === 'Weekly') {
            currentDate = addWeeks(currentDate, 1);
        } else if (data.recurrence === 'Monthly') {
            currentDate = addMonths(currentDate, 1);
        } else { // 'One-time'
            break; // Only process once
        }
      }
    });


    // --- 3. Save the Rollup Document ---
    const rollupRef = doc(firestore, 'financeForecastRollups', month);
    await setDoc(rollupRef, {
      month,
      totalForecastExpense: totalManualExpense,
      scheduledForecastExpense: totalScheduledExpense,
      combinedForecastExpense: totalManualExpense + totalScheduledExpense,
      totalsByCategory,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    console.log(`Successfully updated rollup for ${month}.`);
  } catch (error) {
    console.error(`Error updating rollup for month ${month}:`, error);
    throw new Error('Failed to update financial rollup data.');
  }
}

    