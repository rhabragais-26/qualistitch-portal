'use server';

import { firestore } from '@/firebase/admin';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

type FinanceForecastMonthly = {
  month: string;
  categoryId: string;
  amount: number;
};

/**
 * Recalculates and updates the monthly forecast rollup document in Firestore.
 * This should be triggered after any change to financeForecastMonthly documents.
 * @param month The month to update, in "YYYY-MM" format.
 */
export async function updateMonthlyForecastRollup(month: string): Promise<void> {
  try {
    const monthlyEntriesQuery = query(
      collection(firestore, 'financeForecastMonthly'),
      where('month', '==', month)
    );

    const snapshot = await getDocs(monthlyEntriesQuery);

    if (snapshot.empty) {
      // If no entries exist for the month, ensure the rollup is removed or zeroed out.
      const rollupRef = doc(firestore, 'financeForecastRollups', month);
      await setDoc(rollupRef, {
        month,
        totalForecastExpense: 0,
        totalsByCategory: {},
        updatedAt: new Date().toISOString(),
      });
      console.log(`Rollup for ${month} reset to zero.`);
      return;
    }
    
    let totalForecastExpense = 0;
    const totalsByCategory: { [key: string]: number } = {};

    snapshot.forEach((doc) => {
      const data = doc.data() as FinanceForecastMonthly;
      const amount = data.amount || 0;
      const categoryId = data.categoryId;

      totalForecastExpense += amount;
      if (categoryId) {
        totalsByCategory[categoryId] = (totalsByCategory[categoryId] || 0) + amount;
      }
    });

    const rollupRef = doc(firestore, 'financeForecastRollups', month);
    await setDoc(rollupRef, {
      month,
      totalForecastExpense,
      totalsByCategory,
      updatedAt: new Date().toISOString(),
    });

    console.log(`Successfully updated rollup for ${month}.`);
  } catch (error) {
    console.error(`Error updating rollup for month ${month}:`, error);
    // Depending on requirements, you might want to re-throw the error
    // or handle it in a specific way (e.g., logging to a dedicated service).
    throw new Error('Failed to update financial rollup data.');
  }
}
