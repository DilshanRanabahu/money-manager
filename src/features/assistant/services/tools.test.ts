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
    today: () => '2026-11-11',
  };
  return { data, added, searches, createdCats };
}

const yes = async () => true;
const no = async () => false;
const json = (s: string) => JSON.parse(s);

describe('assistant tools', () => {
  it('defines a schema for every handler', () => {
    expect(TOOL_DEFINITIONS.map((t) => t.name).sort()).toEqual(
      ['add_category', 'add_entry', 'get_breakdown', 'get_month_summary', 'list_categories', 'search_entries'],
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

  it('adds an entry only after the user confirms', async () => {
    const { data, added } = setup();
    const input = { type: 'expense', amount: '850', category_id: 'exp_food', date: '2026-11-11', note: ' lunch ' };
    let seen;
    const r = await runTool('add_entry', input, data, async (p) => ((seen = p), true));
    expect(r.ok).toBe(true);
    expect(seen).toMatchObject({ kind: 'entry', amount: 850_00, note: 'lunch', category: { id: 'exp_food' } });
    expect(added).toEqual([{ type: 'expense', amountText: '850', categoryId: 'exp_food', occurredOn: '2026-11-11', note: 'lunch' }]);
  });

  it('saves nothing when the user declines', async () => {
    const { data, added } = setup();
    const r = await runTool('add_entry', { type: 'expense', amount: '850', category_id: 'exp_food', date: '2026-11-11' }, data, no);
    expect(r.content).toMatch(/declined/);
    expect(added).toHaveLength(0);
  });

  it.each([
    [{ amount: '0' }, /Amount/],
    [{ amount: 'abc' }, /Amount/],
    [{ date: '2026-11-12' }, /Future/],
    [{ category_id: 'inc_salary' }, /is for income/],
    [{ category_id: 'missing' }, /Unknown category/],
  ])('refuses an invalid entry %p without asking', async (patch, message) => {
    const { data, added } = setup();
    const confirm = jest.fn(yes);
    const input = { type: 'expense', amount: '850', category_id: 'exp_food', date: '2026-11-11', ...patch };
    const r = await runTool('add_entry', input, data, confirm);
    expect(r.ok).toBe(false);
    expect(r.content).toMatch(message);
    expect(confirm).not.toHaveBeenCalled();
    expect(added).toHaveLength(0);
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
