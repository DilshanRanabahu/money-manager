import { useMemo } from 'react';

import type { TransactionType } from '@/features/categories';
import { useMonthTransactions } from '@/features/transactions';
import { addMonths, monthName, type MonthKey } from '@/shared/lib/dates';
import { computeBreakdown, computeSummary } from '../domain/computeSummary';

/** "From October" — label for the carry-over into `month`. */
export const carryLabel = (month: MonthKey) => `From ${monthName(addMonths(month, -1))}`;

export function useMonthSummary(month: MonthKey) {
  const { transactions, carry, loading } = useMonthTransactions(month);
  const summary = useMemo(() => computeSummary(transactions, carry), [transactions, carry]);
  return { summary, loading };
}

export function useCategoryBreakdown(month: MonthKey, type: TransactionType) {
  const { transactions, carry, loading } = useMonthTransactions(month);
  const breakdown = useMemo(
    () => computeBreakdown(transactions, type, carry, carryLabel(month)),
    [transactions, type, carry, month],
  );
  return { ...breakdown, loading };
}
