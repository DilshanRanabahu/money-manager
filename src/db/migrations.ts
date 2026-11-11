import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Ordered schema migrations. Index + 1 = schema version (PRAGMA user_version).
 * Never edit an applied migration — append a new one.
 */
export const MIGRATIONS: string[] = [
  // v1 — initial schema
  `
  CREATE TABLE categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE transactions (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    category_id TEXT NOT NULL REFERENCES categories(id),
    note TEXT,
    occurred_on TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE INDEX idx_tx_occurred_on ON transactions (occurred_on);
  CREATE INDEX idx_tx_category ON transactions (category_id);
  `,

  // v2 — new expense categories "AI subscriptions" and "API subscriptions" (inserted by seed),
  // placed before "Other". Re-number the default categories to the new order.
  // Must match DEFAULT_CATEGORIES (checked by migrations.test.ts).
  `
  UPDATE categories SET sort_order = CASE id
    WHEN 'exp_food' THEN 0
    WHEN 'exp_transport' THEN 1
    WHEN 'exp_bills' THEN 2
    WHEN 'exp_groceries' THEN 3
    WHEN 'exp_shopping' THEN 4
    WHEN 'exp_health' THEN 5
    WHEN 'exp_education' THEN 6
    WHEN 'exp_fun' THEN 7
    WHEN 'exp_family' THEN 8
    WHEN 'exp_ai_subs' THEN 9
    WHEN 'exp_api_subs' THEN 10
    WHEN 'exp_other' THEN 11
    WHEN 'inc_salary' THEN 12
    WHEN 'inc_overtime' THEN 13
    WHEN 'inc_side' THEN 14
    WHEN 'inc_gift' THEN 15
    WHEN 'inc_other' THEN 16
    ELSE sort_order END;
  `,

  // v3 — every expense category gets its own colour so the donut chart is readable.
  // Must match DEFAULT_CATEGORIES (checked by migrations.test.ts).
  `
  UPDATE categories SET color = 'indigo' WHERE id = 'exp_education';
  UPDATE categories SET color = 'red' WHERE id = 'exp_fun';
  UPDATE categories SET color = 'brown' WHERE id = 'exp_family';
  UPDATE categories SET color = 'cyan' WHERE id = 'exp_api_subs';
  `,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
