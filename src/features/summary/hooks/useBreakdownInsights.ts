import { useMemo } from 'react';

import type { TransactionType } from '@/features/categories';
import { useMonthTransactions } from '@/features/transactions';
import { addMonths, monthName, monthShortName, todayISO, type MonthKey } from '@/shared/lib/dates';
import { CARRY_CATEGORY_ID, computeBreakdown, computeSummary, type BreakdownRow } from '../domain/computeSummary';
import {
  changeVsPrevious,
  comparisonPeriod,
  limitToPeriod,
  spendingPace,
  sumByCategory,
  sumOfType,
  type Change,
  type Pace,
} from '../domain/insights';
import { carryLabel } from './useMonthSummary';

export type InsightRow = BreakdownRow & { change: Change | null };

export type BreakdownInsights = {
  total: number;
  rows: InsightRow[];
  /** Change of the real total (without carry-over) vs the comparison period; null if nothing to compare. */
  totalChange: Change | null;
  /** "vs Oct 1–8" or "vs October" */
  compareLabel: string;
  /** Expense tab only. */
  pace: Pace | null;
  /** Money available this month (income incl. carry-over), for the projection warning. */
  available: number;
  loading: boolean;
};

/**
 * Everything the Breakdown screen shows: per-category totals, the change vs last month,
 * and the spending pace. Both months come from the shared query cache.
 */
export function useBreakdownInsights(month: MonthKey, type: TransactionType): BreakdownInsights {
  const current = useMonthTransactions(month);
  const previousMonth = addMonths(month, -1);
  const previous = useMonthTransactions(previousMonth);
  const today = todayISO();

  return useMemo(() => {
    const period = comparisonPeriod(month, today);
    const prevInPeriod = limitToPeriod(previous.transactions, period);
    const compareLabel =
      period.kind === 'same-days'
        ? `vs ${monthShortName(previousMonth)} 1–${period.uptoDay}`
        : `vs ${monthName(previousMonth)}`;

    const breakdown = computeBreakdown(current.transactions, type, current.carry, carryLabel(month));
    const previousTotal = sumOfType(prevInPeriod, type);
    const hasComparison = previousTotal > 0;
    const prevByCategory = sumByCategory(prevInPeriod, type);

    const rows: InsightRow[] = breakdown.rows.map((r) => ({
      ...r,
      change:
        hasComparison && r.category.id !== CARRY_CATEGORY_ID
          ? changeVsPrevious(r.amount, prevByCategory.get(r.category.id) ?? 0)
          : null,
    }));

    return {
      total: breakdown.total,
      rows,
      totalChange: hasComparison ? changeVsPrevious(sumOfType(current.transactions, type), previousTotal) : null,
      compareLabel,
      pace:
        type === 'expense'
          ? spendingPace({ month, today, current: current.transactions, previous: previous.transactions })
          : null,
      available: computeSummary(current.transactions, current.carry).income,
      loading: current.loading || previous.loading,
    };
  }, [month, previousMonth, today, type, current.transactions, current.carry, current.loading, previous.transactions, previous.loading]);
}
