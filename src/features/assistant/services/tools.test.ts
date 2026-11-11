import { DEFAULT_CATEGORIES } from '@/features/categories/domain/defaults';
import type { TransactionDraft, TransactionWithCategory } from '@/features/transactions/domain/types';
import { runTool, TOOL_DEFINITIONS, type AssistantData, type SearchFilter } from './tools';

const cat = (id: string) => DEFAULT_CATEGORIES.find((c) => c.id === id)!;

const tx = (p: Partial<TransactionWithCategory> & { categoryId: string }): TransactionWithCategory => ({
  id: Math.random().toString(),
  type: 'expense',
  amount: 100_00,
  note: null,
  occurredOn: '2026-11-05',
  createdAt: 0,
  updatedAt: 0,
  category: cat(p.categoryId),
  ...p,
});

function setup() {
  const added: TransactionDraft[] = [];
  const searches: SearchFilter[] = [];
  const createdCats: unknown[] = [];
  const updated: { id: string; draft: TransactionDraft }[] = [];
  const deleted: string[] = [];
  const stored = tx({ id: 'e1', categoryId: 'exp_transport', amount: 160_00, note: 'Bus', occurredOn: '2026-11-10' });
  const data: AssistantData = {
    monthEntries: async () => ({
      transactions: [
        tx({ categoryId: 'exp_food', amount: 850_00 }),
        tx({ categoryId: 'exp_food', amount: 150_00 }),
        tx({ categoryId: 'inc_salary', type: 'income', amount: 10_000_00 }),
      ],
      carry: 500_00,
    }),
    search: async (f) => {
      searches.push(f);
      return { rows: [tx({ categoryId: 'exp_food', note: 'KFC' })], total: -100_00, count: 7 };
    },
    categories: async () => DEFAULT_CATEGORIES,
    addCategory: async (input) => {
      createdCats.push(input);
      return { ok: true, value: { id: 'cat_new', ...input, icon: input.icon as never, color: input.color as never, sortOrder: 99, isArchived: false } };
    },
    addEntry: async (d) => {
      added.push(d);
      return { ok: true, value: { ...tx({ categoryId: d.categoryId }) } };
    },
    getEntry: async (id) => (id === 'e1' ? stored : null),
    updateEntry: async (id, draft) => {
      updated.push({ id, draft });
      return { ok: true, value: stored };
    },
    deleteEntry: async (id) => void deleted.push(id),
    today: () => '2026-11-11',
  };
  return { data, added, searches, createdCats, updated, deleted };
}

const yes = async () => true;
const no = async () => false;
const json = (s: string) => JSON.parse(s);

describe('assistant tools', () => {
  it('defines a schema for every handler', () => {
    expect(TOOL_DEFINITIONS.map((t) => t.name).sort()).toEqual(
      [
        'add_category',
        'add_entries',
        'delete_entry',
        'get_breakdown',
        'get_month_summary',
        'list_categories',
        'search_entries',
        'update_entry',
      ],
    );
  });

  it('summarises a month including carry-over', async () => {
    const { data } = setup();
    const r = await runTool('get_month_summary', { month: '2026-11' }, data, yes);
    expect(r.ok).toBe(true);
    expect(json(r.content)).toMatchObject({
      income: 'Rs. 10,500.00',
      expense: 'Rs. 1,000.00',
      balance: 'Rs. 9,500.00',
      entries: 3,
    });
  });

  it('breaks down a month by category with shares', async () => {
    const { data } = setup();
    const r = json((await runTool('get_breakdown', { month: '2026-11', type: 'expense' }, data, yes)).content);
    expect(r.total).toBe('Rs. 1,000.00');
    expect(r.categories[0]).toMatchObject({ amount: 'Rs. 1,000.00', share: '100%', entries: 2 });
  });

  it('passes search filters through with a default limit', async () => {
    const { data, searches } = setup();
    const r = json((await runTool('search_entries', { text: ' kfc ', type: 'expense' }, data, yes)).content);
    expect(searches[0]).toEqual({ text: 'kfc', type: 'expense', limit: 20, categoryId: undefined, from: undefined, to: undefined });
    expect(r).toMatchObject({ matches: 7, net_total: '−Rs. 100.00' });
    expect(r.shown[0]).toMatchObject({ note: 'KFC', amount: 'Rs. 100.00' });
  });

  it.each([
    ['get_month_summary', { month: '2026-13' }],
    ['get_breakdown', { month: '2026-11', type: 'both' }],
    ['search_entries', { limit: 500 }],
    ['nope', {}],
  ])('rejects bad input for %s', async (name, input) => {
    const { data } = setup();
    expect((await runTool(name, input, data, yes)).ok).toBe(false);
  });

  it('adds several entries on one card after the user confirms', async () => {
    const { data, added } = setup();
    const entries = [
      { type: 'expense', amount: '850', category_id: 'exp_food', date: '2026-11-11', note: ' lunch ' },
      { type: 'expense', amount: '160', category_id: 'exp_transport', date: '2026-11-11' },
    ];
    const seen: unknown[] = [];
    const r = await runTool('add_entries', { entries }, data, async (p) => (seen.push(p), true));
    expect(r.ok).toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ kind: 'entries', items: [{ amount: 850_00, note: 'lunch' }, { amount: 160_00 }] });
    expect(added).toEqual([
      { type: 'expense', amountText: '850.00', categoryId: 'exp_food', occurredOn: '2026-11-11', note: 'lunch' },
      { type: 'expense', amountText: '160.00', categoryId: 'exp_transport', occurredOn: '2026-11-11', note: '' },
    ]);
    expect(json(r.content).saved).toHaveLength(2);
  });

  it('saves nothing when the user declines', async () => {
    const { data, added } = setup();
    const entries = [{ type: 'expense', amount: '850', category_id: 'exp_food', date: '2026-11-11' }];
    const r = await runTool('add_entries', { entries }, data, no);
    expect(r.content).toMatch(/declined/);
    expect(added).toHaveLength(0);
  });

  it('rejects more than 10 entries or an empty list', async () => {
    const { data } = setup();
    const one = { type: 'expense', amount: '1', category_id: 'exp_food', date: '2026-11-11' };
    expect((await runTool('add_entries', { entries: Array(11).fill(one) }, data, yes)).ok).toBe(false);
    expect((await runTool('add_entries', { entries: [] }, data, yes)).ok).toBe(false);
  });

  it.each([
    [{ amount: '0' }, /Amount/],
    [{ amount: 'abc' }, /Amount/],
    [{ date: '2026-11-12' }, /Future/],
    [{ category_id: 'inc_salary' }, /is for income/],
    [{ category_id: 'missing' }, /Unknown category/],
  ])('refuses the whole card if one entry is invalid %p, without asking', async (patch, message) => {
    const { data, added } = setup();
    const confirm = jest.fn(yes);
    const good = { type: 'expense', amount: '850', category_id: 'exp_food', date: '2026-11-11' };
    const r = await runTool('add_entries', { entries: [good, { ...good, ...patch }] }, data, confirm);
    expect(r.ok).toBe(false);
    expect(r.content).toMatch(/^Entry 2: /);
    expect(r.content).toMatch(message);
    expect(confirm).not.toHaveBeenCalled();
    expect(added).toHaveLength(0);
  });
});

describe('update_entry / delete_entry tools', () => {
  it('shows before and after, and saves only changed fields merged with the old ones', async () => {
    const { data, updated } = setup();
    let seen;
    const r = await runTool('update_entry', { id: 'e1', amount: '180' }, data, async (p) => ((seen = p), true));
    expect(r.ok).toBe(true);
    expect(seen).toMatchObject({ kind: 'update', before: { id: 'e1', amount: 160_00 }, after: { amount: 180_00, note: 'Bus' } });
    expect(updated).toEqual([
      { id: 'e1', draft: { type: 'expense', amountText: '180.00', categoryId: 'exp_transport', occurredOn: '2026-11-10', note: 'Bus' } },
    ]);
  });

  it('refuses an unknown id, no-op changes and invalid values without asking', async () => {
    const { data, updated } = setup();
    const confirm = jest.fn(yes);
    expect((await runTool('update_entry', { id: 'nope', amount: '1' }, data, confirm)).content).toMatch(/No entry/);
    expect((await runTool('update_entry', { id: 'e1', amount: '160' }, data, confirm)).content).toMatch(/Nothing would change/);
    expect((await runTool('update_entry', { id: 'e1', type: 'income' }, data, confirm)).content).toMatch(/is for expense/);
    expect(confirm).not.toHaveBeenCalled();
    expect(updated).toHaveLength(0);
  });

  it('deletes only after confirm', async () => {
    const { data, deleted } = setup();
    expect((await runTool('delete_entry', { id: 'e1' }, data, no)).content).toMatch(/declined/);
    expect(deleted).toEqual([]);
    const r = await runTool('delete_entry', { id: 'e1' }, data, yes);
    expect(r.ok).toBe(true);
    expect(deleted).toEqual(['e1']);
    expect((await runTool('delete_entry', { id: 'x' }, data, yes)).ok).toBe(false);
  });
});

describe('add_category tool', () => {
  it('creates after confirm, with an unused colour by default', async () => {
    const { data, createdCats } = setup();
    let seen;
    const r = await runTool('add_category', { name: ' Fuel ', type: 'expense', icon: 'car-outline' }, data, async (p) => ((seen = p), true));
    expect(r.ok).toBe(true);
    expect(json(r.content)).toEqual({ created: { id: 'cat_new', name: 'Fuel', type: 'expense' } });
    expect(seen).toMatchObject({ kind: 'category', category: { name: 'Fuel' } });
    expect(createdCats).toHaveLength(1);
    expect((createdCats[0] as { color: string }).color).not.toBe('orange'); // Food already uses orange
  });

  it('declines and duplicates create nothing', async () => {
    const { data, createdCats } = setup();
    expect((await runTool('add_category', { name: 'Fuel', type: 'expense', icon: 'car-outline' }, data, no)).content).toMatch(/declined/);
    const dup = await runTool('add_category', { name: 'food', type: 'expense', icon: 'car-outline' }, data, yes);
    expect(dup).toEqual({ ok: false, content: '"Food" already exists' });
    expect(createdCats).toHaveLength(0);
  });
});
