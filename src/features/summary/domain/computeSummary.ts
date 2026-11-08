import type { Category, TransactionType } from '@/features/categories/domain/types';
import type { Transaction } from '@/features/transactions/domain/types';

export type MonthSummary = { income: number; expense: number; balance: number };

export function computeSummary(transactions: readonly Pick<Transaction, 'type' | 'amount'>[]): MonthSummary {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

export type BreakdownRow = {
  category: Category;
  amount: number;
  /** 0..1 share of the total for this type */
  share: number;
  count: number;
};

/** Per-category totals for one type, biggest first. */
export function computeBreakdown(
  transactions: readonly (Pick<Transaction, 'type' | 'amount'> & { category: Category })[],
  type: TransactionType,
): { total: number; rows: BreakdownRow[] } {
  const byCategory = new Map<string, BreakdownRow>();
  let total = 0;
  for (const t of transactions) {
    if (t.type !== type) continue;
    total += t.amount;
    const row = byCategory.get(t.category.id) ?? { category: t.category, amount: 0, share: 0, count: 0 };
    row.amount += t.amount;
    row.count += 1;
    byCategory.set(t.category.id, row);
  }
  const rows = [...byCategory.values()]
    .map((r) => ({ ...r, share: total > 0 ? r.amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount || a.category.sortOrder - b.category.sortOrder);
  return { total, rows };
}
