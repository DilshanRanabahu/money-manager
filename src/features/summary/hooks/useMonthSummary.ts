import { useMemo } from 'react';

import type { TransactionType } from '@/features/categories';
import { useMonthTransactions } from '@/features/transactions';
import type { MonthKey } from '@/shared/lib/dates';
import { computeBreakdown, computeSummary } from '../domain/computeSummary';

export function useMonthSummary(month: MonthKey) {
  const { transactions, loading } = useMonthTransactions(month);
  const summary = useMemo(() => computeSummary(transactions), [transactions]);
  return { summary, loading };
}

export function useCategoryBreakdown(month: MonthKey, type: TransactionType) {
  const { transactions, loading } = useMonthTransactions(month);
  const breakdown = useMemo(() => computeBreakdown(transactions, type), [transactions, type]);
  return { ...breakdown, loading };
}
