import type { Category } from '@/features/categories/domain/types';
import { newId } from '@/shared/lib/id';
import { err, ok, type Result } from '@/shared/lib/result';
import type { Transaction, TransactionDraft } from '../domain/types';
import { draftSchema, type ValidDraft } from '../domain/validation';

/** Ports the service needs. Real repos in the app, fakes in tests. */
export type TransactionStore = {
  findById(id: string): Promise<Transaction | null>;
  insert(t: Transaction): Promise<void>;
  update(t: Transaction): Promise<void>;
  softDelete(id: string, at: number): Promise<void>;
  restore(id: string): Promise<void>;
  purgeDeleted(olderThan: number): Promise<void>;
};

export type CategoryLookup = {
  findById(id: string): Promise<Category | null>;
};

type Deps = {
  transactions: TransactionStore;
  categories: CategoryLookup;
  now?: () => number;
  makeId?: () => string;
};

/** How long a deleted row can still be restored with Undo. */
export const UNDO_WINDOW_MS = 10_000;

export function createTransactionService({ transactions, categories, now = Date.now, makeId = newId }: Deps) {
  async function validate(draft: TransactionDraft): Promise<Result<ValidDraft>> {
    const parsed = draftSchema.safeParse(draft);
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Invalid input');
    const category = await categories.findById(parsed.data.categoryId);
    if (!category || category.isArchived) return err('Pick a category');
    if (category.type !== parsed.data.type) return err('Category does not match type');
    return ok(parsed.data);
  }

  return {
    validate,

    async create(draft: TransactionDraft): Promise<Result<Transaction>> {
      const v = await validate(draft);
      if (!v.ok) return v;
      const ts = now();
      const t: Transaction = {
        id: makeId(),
        type: v.value.type,
        amount: v.value.amountText,
        categoryId: v.value.categoryId,
        note: v.value.note || null,
        occurredOn: v.value.occurredOn,
        createdAt: ts,
        updatedAt: ts,
      };
      await transactions.insert(t);
      return ok(t);
    },

    async update(id: string, draft: TransactionDraft): Promise<Result<Transaction>> {
      const existing = await transactions.findById(id);
      if (!existing) return err('This entry no longer exists');
      const v = await validate(draft);
      if (!v.ok) return v;
      const t: Transaction = {
        ...existing,
        type: v.value.type,
        amount: v.value.amountText,
        categoryId: v.value.categoryId,
        note: v.value.note || null,
        occurredOn: v.value.occurredOn,
        updatedAt: now(),
      };
      await transactions.update(t);
      return ok(t);
    },

    async remove(id: string): Promise<void> {
      await transactions.softDelete(id, now());
    },

    async restore(id: string): Promise<void> {
      await transactions.restore(id);
    },

    /** Hard-delete rows whose undo window has passed. Run at app start. */
    async purge(): Promise<void> {
      await transactions.purgeDeleted(now() - UNDO_WINDOW_MS);
    },
  };
}

export type TransactionService = ReturnType<typeof createTransactionService>;
