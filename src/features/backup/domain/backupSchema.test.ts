import { backupSchema, BACKUP_LIMITS } from './backupSchema';

jest.mock('expo-sqlite', () => ({}));

const cat = (id: string, type: 'income' | 'expense' = 'expense') => ({
  id,
  name: 'Food',
  type,
  icon: 'fast-food-outline',
  color: 'orange',
  sort_order: 0,
  is_archived: 0 as const,
  created_at: 1,
});
const tx = (id: string, p: Record<string, unknown> = {}) => ({
  id,
  type: 'expense',
  amount: 1000,
  category_id: 'exp_food',
  note: null,
  occurred_on: '2026-11-08',
  created_at: 1,
  updated_at: 1,
  ...p,
});
const backup = (p: Record<string, unknown> = {}) => ({
  app: 'money-manager',
  version: 1,
  exportedAt: '2026-11-08T10:00:00.000Z',
  categories: [cat('exp_food'), cat('inc_salary', 'income')],
  transactions: [tx('t1')],
  ...p,
});

describe('backupSchema', () => {
  it('accepts a valid backup', () => {
    expect(backupSchema.safeParse(backup()).success).toBe(true);
  });

  it.each([
    ['amount above the max', { transactions: [tx('t1', { amount: 100_000_000_000 })] }],
    ['negative amount', { transactions: [tx('t1', { amount: -5 })] }],
    ['fractional amount', { transactions: [tx('t1', { amount: 10.5 })] }],
    ['too long note', { transactions: [tx('t1', { note: 'x'.repeat(121) })] }],
    ['invalid date', { transactions: [tx('t1', { occurred_on: '2026-02-30' })] }],
    ['missing category', { transactions: [tx('t1', { category_id: 'nope' })] }],
    ['type not matching category', { transactions: [tx('t1', { category_id: 'inc_salary' })] }],
    ['duplicate entry ids', { transactions: [tx('t1'), tx('t1')] }],
    ['duplicate category ids', { categories: [cat('exp_food'), cat('exp_food')] }],
    ['too long category name', { categories: [{ ...cat('exp_food'), name: 'x'.repeat(41) }] }],
    ['wrong app', { app: 'other-app' }],
  ])('rejects %s', (_label, patch) => {
    expect(backupSchema.safeParse(backup(patch)).success).toBe(false);
  });

  it('rejects too many entries', () => {
    const many = Array.from({ length: BACKUP_LIMITS.maxTransactions + 1 }, (_, i) => tx(`t${i}`));
    expect(backupSchema.safeParse(backup({ transactions: many })).success).toBe(false);
  });
});
