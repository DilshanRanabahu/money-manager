import { z } from 'zod';

import { isValidISODate } from '@/shared/lib/dates';

export const BACKUP_APP = 'money-manager';
export const BACKUP_VERSION = 1;

const categoryRow = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  icon: z.string().min(1),
  color: z.string().min(1),
  sort_order: z.number().int(),
  is_archived: z.union([z.literal(0), z.literal(1)]),
  created_at: z.number().int(),
});

const transactionRow = z.object({
  id: z.string().min(1),
  type: z.enum(['income', 'expense']),
  amount: z.number().int().positive(),
  category_id: z.string().min(1),
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
    exportedAt: z.string(),
    categories: z.array(categoryRow),
    transactions: z.array(transactionRow),
  })
  .refine(
    (b) => {
      const ids = new Set(b.categories.map((c) => c.id));
      return b.transactions.every((t) => ids.has(t.category_id));
    },
    { message: 'A transaction points to a missing category' },
  );

export type Backup = z.output<typeof backupSchema>;
