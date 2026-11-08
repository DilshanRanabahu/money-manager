import type { Category, TransactionType } from '@/features/categories/domain/types';
import type { ISODate } from '@/shared/lib/dates';

export type { TransactionType };

export type Transaction = {
  id: string;
  type: TransactionType;
  /** Minor units, always > 0. Direction comes from `type`. */
  amount: number;
  categoryId: string;
  note: string | null;
  occurredOn: ISODate;
  createdAt: number;
  updatedAt: number;
};

export type TransactionWithCategory = Transaction & { category: Category };

/** What the form sends to the service. */
export type TransactionDraft = {
  type: TransactionType;
  amountText: string;
  categoryId: string;
  occurredOn: ISODate;
  note: string;
};

export const MAX_NOTE_LENGTH = 120;

/** Signed value: income positive, expense negative. */
export const signedAmount = (t: Pick<Transaction, 'type' | 'amount'>): number =>
  t.type === 'income' ? t.amount : -t.amount;
