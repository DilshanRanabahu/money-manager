import type { SQLiteDatabase } from 'expo-sqlite';

import { DEFAULT_CATEGORIES } from '@/features/categories/domain/defaults';

/** Insert default categories that are missing. Safe to run on every start. */
export async function seed(db: SQLiteDatabase): Promise<void> {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const c of DEFAULT_CATEGORIES) {
      await db.runAsync(
        `INSERT OR IGNORE INTO categories (id, name, type, icon, color, sort_order, is_archived, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        c.id, c.name, c.type, c.icon, c.color, c.sortOrder, now,
      );
    }
  });
}
