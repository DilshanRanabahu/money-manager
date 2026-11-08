import type { Category } from '@/features/categories/domain/types';
import { DEFAULT_CATEGORIES } from '@/features/categories/domain/defaults';
import type { Transaction, TransactionDraft } from '../domain/types';
import { createTransactionService, UNDO_WINDOW_MS, type TransactionStore } from './transactionService';

function setup() {
  const rows = new Map<string, Transaction & { deletedAt: number | null }>();
  let clock = 1_000_000;
  let seq = 0;

  const store: TransactionStore = {
    findById: async (id) => {
      const r = rows.get(id);
      return r && r.deletedAt === null ? r : null;
    },
    insert: async (t) => void rows.set(t.id, { ...t, deletedAt: null }),
    update: async (t) => void rows.set(t.id, { ...t, deletedAt: null }),
    softDelete: async (id, at) => {
      const r = rows.get(id);
      if (r) r.deletedAt = at;
    },
    restore: async (id) => {
      const r = rows.get(id);
      if (r) r.deletedAt = null;
    },
    purgeDeleted: async (olderThan) => {
      for (const [id, r] of rows) if (r.deletedAt !== null && r.deletedAt < olderThan) rows.delete(id);
    },
  };

  const categories = {
    findById: async (id: string): Promise<Category | null> => DEFAULT_CATEGORIES.find((c) => c.id === id) ?? null,
  };

  const service = createTransactionService({
    transactions: store,
    categories,
    now: () => clock,
    makeId: () => `id${++seq}`,
  });

  return { service, rows, tick: (ms: number) => (clock += ms) };
}

const draft = (p: Partial<TransactionDraft> = {}): TransactionDraft => ({
  type: 'expense',
  amountText: '1,250.50',
  categoryId: 'exp_food',
  occurredOn: '2026-11-08',
  note: '  lunch  ',
  ...p,
});

describe('transactionService', () => {
  it('creates a valid transaction with exact minor units', async () => {
    const { service, rows } = setup();
    const r = await service.create(draft());
    expect(r.ok).toBe(true);
    const saved = rows.get('id1')!;
    expect(saved.amount).toBe(125050);
    expect(saved.note).toBe('lunch');
  });

  it('stores empty notes as null', async () => {
    const { service, rows } = setup();
    await service.create(draft({ note: '   ' }));
    expect(rows.get('id1')!.note).toBeNull();
  });

  it.each([
    [{ amountText: '0' }, 'Enter an amount greater than 0'],
    [{ amountText: '' }, 'Enter an amount greater than 0'],
    [{ categoryId: '' }, 'Pick a category'],
    [{ categoryId: 'nope' }, 'Pick a category'],
    [{ categoryId: 'inc_salary' }, 'Category does not match type'],
    [{ occurredOn: '2026-02-30' }, 'Invalid date'],
    [{ note: 'x'.repeat(121) }, 'Note is too long (max 120)'],
  ])('rejects %p', async (patch, message) => {
    const { service, rows } = setup();
    const r = await service.create(draft(patch));
    expect(r).toEqual({ ok: false, error: message });
    expect(rows.size).toBe(0);
  });

  it('updates and keeps createdAt', async () => {
    const { service, rows, tick } = setup();
    await service.create(draft());
    tick(500);
    const r = await service.update('id1', draft({ type: 'income', categoryId: 'inc_salary', amountText: '100000' }));
    expect(r.ok).toBe(true);
    const saved = rows.get('id1')!;
    expect(saved).toMatchObject({ type: 'income', amount: 10_000_000, createdAt: 1_000_000, updatedAt: 1_000_500 });
  });

  it('fails to update a missing entry', async () => {
    const { service } = setup();
    expect(await service.update('missing', draft())).toEqual({ ok: false, error: 'This entry no longer exists' });
  });

  it('soft deletes, restores, and purges after the undo window', async () => {
    const { service, rows, tick } = setup();
    await service.create(draft());
    await service.remove('id1');
    await service.restore('id1');
    expect(rows.get('id1')!.deletedAt).toBeNull();

    await service.remove('id1');
    await service.purge();
    expect(rows.has('id1')).toBe(true); // still inside undo window

    tick(UNDO_WINDOW_MS + 1);
    await service.purge();
    expect(rows.has('id1')).toBe(false);
  });
});
