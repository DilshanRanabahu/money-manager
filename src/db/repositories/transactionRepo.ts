import type { Transaction, TransactionWithCategory } from '@/features/transactions/domain/types';
import { monthRange, type MonthKey } from '@/shared/lib/dates';
import { getDb } from '../client';
import { queryCache } from '../queryCache';
import { seed } from '../seed';
import { toCategory, type CategoryRow } from './categoryRepo';

/** Tell every screen that transactions changed (once per write). */
const changed = () => queryCache.invalidate(['transactions']);

export type TransactionRow = {
  id: string;
  type: string;
  amount: number;
  category_id: string;
  note: string | null;
  occurred_on: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

type JoinedRow = TransactionRow & {
  c_name: string;
  c_type: string;
  c_icon: string;
  c_color: string;
  c_sort_order: number;
  c_is_archived: number;
};

const toTransaction = (r: TransactionRow): Transaction => ({
  id: r.id,
  type: r.type as Transaction['type'],
  amount: r.amount,
  categoryId: r.category_id,
  note: r.note,
  occurredOn: r.occurred_on,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toJoined = (r: JoinedRow): TransactionWithCategory => ({
  ...toTransaction(r),
  category: toCategory({
    id: r.category_id,
    name: r.c_name,
    type: r.c_type,
    icon: r.c_icon,
    color: r.c_color,
    sort_order: r.c_sort_order,
    is_archived: r.c_is_archived,
    created_at: 0,
  } satisfies CategoryRow),
});

const JOINED_SELECT = `
  SELECT t.*, c.name AS c_name, c.type AS c_type, c.icon AS c_icon, c.color AS c_color,
         c.sort_order AS c_sort_order, c.is_archived AS c_is_archived
  FROM transactions t JOIN categories c ON c.id = t.category_id`;

export const transactionRepo = {
  async findByMonth(month: MonthKey): Promise<TransactionWithCategory[]> {
    const { start, end } = monthRange(month);
    const rows = await getDb().getAllAsync<JoinedRow>(
      `${JOINED_SELECT}
       WHERE t.deleted_at IS NULL AND t.occurred_on >= ? AND t.occurred_on < ?
       ORDER BY t.occurred_on DESC, t.created_at DESC`,
      start,
      end,
    );
    return rows.map(toJoined);
  },

  async findById(id: string): Promise<TransactionWithCategory | null> {
    const row = await getDb().getFirstAsync<JoinedRow>(
      `${JOINED_SELECT} WHERE t.id = ? AND t.deleted_at IS NULL`,
      id,
    );
    return row ? toJoined(row) : null;
  },

  async insert(t: Transaction): Promise<void> {
    await getDb().runAsync(
      `INSERT INTO transactions (id, type, amount, category_id, note, occurred_on, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      t.id, t.type, t.amount, t.categoryId, t.note, t.occurredOn, t.createdAt, t.updatedAt,
    );
    changed();
  },

  async update(t: Transaction): Promise<void> {
    await getDb().runAsync(
      `UPDATE transactions SET type = ?, amount = ?, category_id = ?, note = ?, occurred_on = ?, updated_at = ?
       WHERE id = ?`,
      t.type, t.amount, t.categoryId, t.note, t.occurredOn, t.updatedAt, t.id,
    );
    changed();
  },

  async softDelete(id: string, at: number): Promise<void> {
    await getDb().runAsync('UPDATE transactions SET deleted_at = ? WHERE id = ?', at, id);
    changed();
  },

  async restore(id: string): Promise<void> {
    await getDb().runAsync('UPDATE transactions SET deleted_at = NULL WHERE id = ?', id);
    changed();
  },

  async purgeDeleted(olderThan: number): Promise<void> {
    await getDb().runAsync('DELETE FROM transactions WHERE deleted_at IS NOT NULL AND deleted_at < ?', olderThan);
    changed();
  },

  async allRows(): Promise<TransactionRow[]> {
    return getDb().getAllAsync<TransactionRow>(
      'SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY occurred_on, created_at',
    );
  },

  /** Replace all data atomically (used by backup import). */
  async replaceAll(categories: CategoryRow[], transactions: TransactionRow[]): Promise<void> {
    const db = getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM transactions');
      await db.runAsync('DELETE FROM categories');
      for (const c of categories) {
        await db.runAsync(
          `INSERT INTO categories (id, name, type, icon, color, sort_order, is_archived, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          c.id, c.name, c.type, c.icon, c.color, c.sort_order, c.is_archived, c.created_at,
        );
      }
      for (const t of transactions) {
        await db.runAsync(
          `INSERT INTO transactions (id, type, amount, category_id, note, occurred_on, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          t.id, t.type, t.amount, t.category_id, t.note, t.occurred_on, t.created_at, t.updated_at,
        );
      }
    });
    // An older backup may not have newer default categories (e.g. AI subscriptions): add them back.
    await seed(db);
    // One refresh after the whole import has committed (not once per row).
    queryCache.invalidate(['transactions', 'categories']);
  },
};
