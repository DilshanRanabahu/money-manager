import type { TransactionType } from '@/features/categories/domain/types';
import type { Transaction } from '@/features/transactions/domain/types';
import { dayOfMonth, daysInMonth, monthOf, type ISODate, type MonthKey } from '@/shared/lib/dates';

type Tx = Pick<Transaction, 'type' | 'amount' | 'categoryId' | 'occurredOn'>;

/** Change against the previous period. `ratio` is null when there was nothing before ("new"). */
export type Change = { previous: number; ratio: number | null };

export function changeVsPrevious(current: number, previous: number): Change {
  return { previous, ratio: previous > 0 ? (current - previous) / previous : null };
}

export function sumOfType(transactions: readonly Pick<Tx, 'type' | 'amount'>[], type: TransactionType): number {
  let total = 0;
  for (const t of transactions) if (t.type === type) total += t.amount;
  return total;
}

export function sumByCategory(transactions: readonly Tx[], type: TransactionType): Map<string, number> {
  const out = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === type) out.set(t.categoryId, (out.get(t.categoryId) ?? 0) + t.amount);
  }
  return out;
}

/**
 * What to compare a month against.
 * The current month is only partly over, so it is compared with the same days of last month
 * (Nov 1–8 vs Oct 1–8). Past and future months are compared with the whole previous month.
 */
export type ComparisonPeriod = { kind: 'same-days'; uptoDay: number } | { kind: 'full' };

export function comparisonPeriod(month: MonthKey, today: ISODate): ComparisonPeriod {
  return month === monthOf(today) ? { kind: 'same-days', uptoDay: dayOfMonth(today) } : { kind: 'full' };
}

export function limitToPeriod<T extends Pick<Tx, 'occurredOn'>>(transactions: readonly T[], period: ComparisonPeriod): T[] {
  if (period.kind === 'full') return [...transactions];
  return transactions.filter((t) => dayOfMonth(t.occurredOn) <= period.uptoDay);
}

/**
 * Spending speed for a month.
 * - Current month: average per day so far, plus a projection for the whole month.
 *   The projection assumes the rest of the month goes like the same days of last month
 *   (big bills usually come early, so a straight-line guess would overshoot). With no data
 *   for last month it falls back to a straight line.
 * - Past month: average per day only. Future month: null.
 */
export type Pace = {
  spent: number;
  daysElapsed: number;
  daysInMonth: number;
  perDay: number;
  projected: number | null;
  basis: 'last-month' | 'linear' | null;
};

export function spendingPace(args: {
  month: MonthKey;
  today: ISODate;
  /** This month's transactions (any type; only expenses are used). */
  current: readonly Pick<Tx, 'type' | 'amount' | 'occurredOn'>[];
  /** The whole previous month (any type). */
  previous: readonly Pick<Tx, 'type' | 'amount' | 'occurredOn'>[];
}): Pace | null {
  const { month, today, current, previous } = args;
  const thisMonth = monthOf(today);
  if (month > thisMonth) return null;

  const total = daysInMonth(month);
  const spent = sumOfType(current, 'expense');

  if (month < thisMonth) {
    return { spent, daysElapsed: total, daysInMonth: total, perDay: Math.round(spent / total), projected: null, basis: null };
  }

  const elapsed = dayOfMonth(today);
  const perDay = Math.round(spent / elapsed);
  const previousExpenses = previous.filter((t) => t.type === 'expense');

  if (previousExpenses.length > 0) {
    const restOfLastMonth = previousExpenses
      .filter((t) => dayOfMonth(t.occurredOn) > elapsed)
      .reduce((s, t) => s + t.amount, 0);
    return { spent, daysElapsed: elapsed, daysInMonth: total, perDay, projected: spent + restOfLastMonth, basis: 'last-month' };
  }
  return { spent, daysElapsed: elapsed, daysInMonth: total, perDay, projected: Math.round((spent / elapsed) * total), basis: 'linear' };
}
