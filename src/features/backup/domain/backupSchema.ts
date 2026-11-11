import { z } from 'zod';

import { isValidISODate } from '@/shared/lib/dates';
import { MAX_AMOUNT } from '@/shared/lib/money';

export const BACKUP_APP = 'money-manager';
export const BACKUP_VERSION = 1;

/** Limits for a backup file (audit #8). Generous for real use, they stop huge or odd files. */
export const BACKUP_LIMITS = {
  /** File size in bytes (~200k entries would still fit). */
  maxFileBytes: 50 * 1024 * 1024,
  maxCategories: 500,
  maxTransactions: 200_000,
} as const;

const id = z.string().min(1).max(64);

const categoryRow = z.object({
  id,
  name: z.string().min(1).max(40),
  type: z.enum(['income', 'expense']),
  icon: z.string().min(1).max(40),
  color: z.string().min(1).max(20),
  sort_order: z.number().int().min(-1_000_000).max(1_000_000),
  is_archived: z.union([z.literal(0), z.literal(1)]),
  created_at: z.number().int(),
});

const transactionRow = z.object({
  id,
  type: z.enum(['income', 'expense']),
  amount: z.number().int().positive().max(MAX_AMOUNT),
  category_id: id,
  note: z.string().max(120).nullable(),
  occurred_on: z.string().refine(isValidISODate),
  created_at: z.number().int(),
  updated_at: z.number().int(),
  deleted_at: z.null().optional().default(null),
});

export const backupSchema = z
  .object({
    app: z.literal(BACKUP_APP),
    version: z.literal(BACKUP_VERSION),
    exportedAt: z.string().max(40),
    categories: z.array(categoryRow).max(BACKUP_LIMITS.maxCategories),
    transactions: z.array(transactionRow).max(BACKUP_LIMITS.maxTransactions),
  })
  .superRefine((b, ctx) => {
    const categoryType = new Map(b.categories.map((c) => [c.id, c.type]));
    if (categoryType.size !== b.categories.length) {
      ctx.addIssue({ code: 'custom', message: 'Duplicate category id' });
    }
    if (new Set(b.transactions.map((t) => t.id)).size !== b.transactions.length) {
      ctx.addIssue({ code: 'custom', message: 'Duplicate entry id' });
    }
    for (const t of b.transactions) {
      const type = categoryType.get(t.category_id);
      if (type === undefined) {
        ctx.addIssue({ code: 'custom', message: 'A transaction points to a missing category' });
        return;
      }
      if (type !== t.type) {
        ctx.addIssue({ code: 'custom', message: 'A transaction type does not match its category' });
        return;
      }
    }
  });

export type Backup = z.output<typeof backupSchema>;

/** Exported files are named like this; old ones are cleaned from the cache. */
export const EXPORT_FILE_PREFIX = 'money-backup-';
