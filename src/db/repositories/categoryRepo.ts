import type { Category, TransactionType } from '@/features/categories/domain/types';
import { getDb } from '../client';

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

  async allRows(): Promise<CategoryRow[]> {
    return getDb().getAllAsync<CategoryRow>('SELECT * FROM categories ORDER BY sort_order');
  },
};
