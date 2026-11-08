import { useCallback, useEffect, useMemo } from 'react';

import { queryCache } from '@/db/queryCache';
import { transactionRepo } from '@/db/repositories/transactionRepo';
import { useQuery } from '@/db/useQuery';
import { addMonths, type MonthKey } from '@/shared/lib/dates';
import { haptics } from '@/shared/lib/haptics';
import { useUiStore } from '@/shared/store/uiStore';
import { groupByDay } from '../domain/groupByDay';
import type { TransactionDraft } from '../domain/types';
import { transactionService } from '../services/instance';

const TABLES = ['transactions', 'categories'] as const;

const EMPTY: never[] = [];
const monthKey = (month: MonthKey) => `tx:month:${month}`;
const carryKey = (month: MonthKey) => `tx:carry:${month}`;
const carryFetch = (month: MonthKey) => () => transactionRepo.balanceBefore(`${month}-01`);

/**
 * A month's transactions plus day groups, shared by every screen through the query cache.
 * Also returns `carry`: what was left from all earlier months (computed, never stored).
 * Neighbouring months are prefetched so switching months is instant.
 */
export function useMonthTransactions(month: MonthKey) {
  const { data, loading, error } = useQuery(monthKey(month), () => transactionRepo.findByMonth(month), TABLES);
  const carryQuery = useQuery(carryKey(month), carryFetch(month), TABLES);

  useEffect(() => {
    for (const m of [addMonths(month, -1), addMonths(month, 1)]) {
      void queryCache.prefetch(monthKey(m), () => transactionRepo.findByMonth(m), TABLES);
      void queryCache.prefetch(carryKey(m), carryFetch(m), TABLES);
    }
  }, [month]);

  const transactions = data ?? EMPTY;
  const days = useMemo(() => groupByDay(transactions), [transactions]);
  return {
    transactions,
    days,
    carry: carryQuery.data ?? 0,
    loading: loading || carryQuery.loading,
    error,
  };
}

export function useTransaction(id: string | undefined) {
  const { data, loading } = useQuery(
    `tx:id:${id ?? ''}`,
    () => (id ? transactionRepo.findById(id) : Promise.resolve(null)),
    TABLES,
  );
  return { transaction: data ?? null, loading };
}

/** Write actions used by screens. Validation lives in the service. */
export function useTransactionActions() {
  const showToast = useUiStore((s) => s.showToast);

  const create = useCallback((draft: TransactionDraft) => transactionService.create(draft), []);
  const update = useCallback((id: string, draft: TransactionDraft) => transactionService.update(id, draft), []);

  const remove = useCallback(
    async (id: string) => {
      haptics.impact();
      await transactionService.remove(id);
      showToast({
        message: 'Entry deleted',
        actionLabel: 'Undo',
        onAction: () => {
          haptics.light();
          void transactionService.restore(id);
        },
      });
    },
    [showToast],
  );

  return { create, update, remove };
}
