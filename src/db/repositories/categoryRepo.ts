import type { Category, TransactionType } from '@/features/categories/domain/types';
import { getDb } from '../client';
import { queryCache } from '../queryCache';

export type CategoryRow = {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  sort_order: number;
  is_archived: number;
  created_at: number;
};

export const toCategory = (r: CategoryRow): Category => ({
  id: r.id,
  name: r.name,
  type: r.type as TransactionType,
  icon: r.icon as Category['icon'],
  color: r.color as Category['color'],
  sortOrder: r.sort_order,
  isArchived: r.is_archived === 1,
});

export const categoryRepo = {
  async findAll(type?: TransactionType): Promise<Category[]> {
    const rows = type
      ? await getDb().getAllAsync<CategoryRow>(
          'SELECT * FROM categories WHERE is_archived = 0 AND type = ? ORDER BY sort_order',
          type,
        )
      : await getDb().getAllAsync<CategoryRow>('SELECT * FROM categories WHERE is_archived = 0 ORDER BY sort_order');
    return rows.map(toCategory);
  },

  async findById(id: string): Promise<Category | null> {
    const row = await getDb().getFirstAsync<CategoryRow>('SELECT * FROM categories WHERE id = ?', id);
    return row ? toCategory(row) : null;
  },

  /** Add a category before that type's "Other", which stays last. */
  async insert(c: Omit<Category, 'sortOrder' | 'isArchived'>, createdAt: number): Promise<Category> {
    const db = getDb();
    let sortOrder = 0;
    await db.withTransactionAsync(async () => {
      const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM categories');
      sortOrder = (max?.m ?? 0) + 1;
      await db.runAsync(
        `INSERT INTO categories (id, name, type, icon, color, sort_order, is_archived, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        c.id, c.name, c.type, c.icon, c.color, sortOrder, createdAt,
      );
      await db.runAsync(
        "UPDATE categories SET sort_order = ? WHERE id = ?",
        sortOrder + 1,
        c.type === 'income' ? 'inc_other' : 'exp_other',
      );
    });
    queryCache.invalidate(['categories']);
    return { ...c, sortOrder, isArchived: false };
  },

  async allRows(): Promise<CategoryRow[]> {
    return getDb().getAllAsync<CategoryRow>('SELECT * FROM categories ORDER BY sort_order');
  },
};
