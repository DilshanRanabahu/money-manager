import { useCallback, useMemo } from 'react';

import { transactionRepo } from '@/db/repositories/transactionRepo';
import { useLiveQuery } from '@/db/useLiveQuery';
import type { MonthKey } from '@/shared/lib/dates';
import { haptics } from '@/shared/lib/haptics';
import { useUiStore } from '@/shared/store/uiStore';
import { groupByDay } from '../domain/groupByDay';
import type { TransactionDraft } from '../domain/types';
import { transactionService } from '../services/instance';

const TABLES = ['transactions', 'categories'] as const;

/** Live list of a month's transactions plus day groups. */
export function useMonthTransactions(month: MonthKey) {
  const { data, loading, error } = useLiveQuery(() => transactionRepo.findByMonth(month), TABLES, [month]);
  const transactions = useMemo(() => data ?? [], [data]);
  const days = useMemo(() => groupByDay(transactions), [transactions]);
  return { transactions, days, loading, error };
}

export function useTransaction(id: string | undefined) {
  const { data, loading } = useLiveQuery(
    () => (id ? transactionRepo.findById(id) : Promise.resolve(null)),
    TABLES,
    [id],
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
