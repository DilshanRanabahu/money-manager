import type { Category, TransactionType } from '@/features/categories/domain/types';
import type { Transaction } from '@/features/transactions/domain/types';

/**
 * Carry-over: what was left at the end of the previous month (all earlier income minus all
 * earlier expense). It is computed, never stored, so editing an old entry updates it.
 * A positive carry counts as income this month; a negative one (overspent) as expense.
 */
export type MonthSummary = {
  income: number;
  expense: number;
  balance: number;
  /** Signed carry-over included in income (if > 0) or expense (if < 0). */
  carry: number;
};

export function computeSummary(
  transactions: readonly Pick<Transaction, 'type' | 'amount'>[],
  carry = 0,
): MonthSummary {
  let income = carry > 0 ? carry : 0;
  let expense = carry < 0 ? -carry : 0;
  for (const t of transactions) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense, carry };
}

/** Pseudo-category used to show the carry-over in lists and breakdowns. */
export const CARRY_CATEGORY_ID = 'carry';

export function carryCategory(type: TransactionType, label: string): Category {
  return {
    id: CARRY_CATEGORY_ID,
    name: label,
    type,
    icon: 'wallet-outline',
    color: 'gray',
    sortOrder: -1,
    isArchived: false,
  };
}

export type BreakdownRow = {
  category: Category;
  amount: number;
  /** 0..1 share of the total for this type */
  share: number;
  count: number;
};

/**
 * Per-category totals for one type, biggest first.
 * A positive carry is added to the income breakdown, a negative one to the expense breakdown.
 */
export function computeBreakdown(
  transactions: readonly (Pick<Transaction, 'type' | 'amount'> & { category: Category })[],
  type: TransactionType,
  carry = 0,
  carryLabel = 'From last month',
): { total: number; rows: BreakdownRow[] } {
  const byCategory = new Map<string, BreakdownRow>();
  let total = 0;

  const carryForType = type === 'income' ? Math.max(carry, 0) : Math.max(-carry, 0);
  if (carryForType > 0) {
    total += carryForType;
    byCategory.set(CARRY_CATEGORY_ID, { category: carryCategory(type, carryLabel), amount: carryForType, share: 0, count: 1 });
  }

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
