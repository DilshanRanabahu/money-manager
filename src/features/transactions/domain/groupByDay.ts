import type { ISODate } from '@/shared/lib/dates';
import { signedAmount, type Transaction } from './types';

export type DayGroup<T extends Transaction> = {
  date: ISODate;
  /** Income minus expense for the day (minor units). */
  net: number;
  items: T[];
};

/** Group transactions by day: newest day first, newest entry first within a day. */
export function groupByDay<T extends Transaction>(transactions: readonly T[]): DayGroup<T>[] {
  const sorted = [...transactions].sort((a, b) =>
    a.occurredOn === b.occurredOn ? b.createdAt - a.createdAt : a.occurredOn < b.occurredOn ? 1 : -1,
  );

  const groups: DayGroup<T>[] = [];
  for (const t of sorted) {
    let group = groups[groups.length - 1];
    if (!group || group.date !== t.occurredOn) {
      group = { date: t.occurredOn, net: 0, items: [] };
      groups.push(group);
    }
    group.items.push(t);
    group.net += signedAmount(t);
  }
  return groups;
}
