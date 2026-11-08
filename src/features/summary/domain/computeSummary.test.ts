import { DEFAULT_CATEGORIES } from '@/features/categories/domain/defaults';
import { CARRY_CATEGORY_ID, computeBreakdown, computeSummary } from './computeSummary';

const cat = (id: string) => DEFAULT_CATEGORIES.find((c) => c.id === id)!;

describe('computeSummary', () => {
  it('sums income, expense and balance', () => {
    expect(
      computeSummary([
        { type: 'income', amount: 12_000_000 },
        { type: 'expense', amount: 85_000 },
        { type: 'expense', amount: 15_000 },
      ]),
    ).toEqual({ income: 12_000_000, expense: 100_000, balance: 11_900_000, carry: 0 });
  });

  it('handles zero income (negative balance)', () => {
    expect(computeSummary([{ type: 'expense', amount: 500 }])).toEqual({ income: 0, expense: 500, balance: -500, carry: 0 });
  });

  it('handles empty month', () => {
    expect(computeSummary([])).toEqual({ income: 0, expense: 0, balance: 0, carry: 0 });
  });

  it('adds a positive carry-over to income', () => {
    expect(computeSummary([{ type: 'expense', amount: 1000 }], 608_000)).toEqual({
      income: 608_000,
      expense: 1000,
      balance: 607_000,
      carry: 608_000,
    });
  });

  it('adds a negative carry-over (overspent) to expense', () => {
    expect(computeSummary([{ type: 'income', amount: 5000 }], -2000)).toEqual({
      income: 5000,
      expense: 2000,
      balance: 3000,
      carry: -2000,
    });
  });

  it('shows the carry-over as the balance of an empty month', () => {
    expect(computeSummary([], 4500).balance).toBe(4500);
  });
});

describe('computeBreakdown', () => {
  it('groups by category, biggest first, with shares', () => {
    const { total, rows } = computeBreakdown(
      [
        { type: 'expense', amount: 300, category: cat('exp_food') },
        { type: 'expense', amount: 600, category: cat('exp_transport') },
        { type: 'expense', amount: 100, category: cat('exp_food') },
        { type: 'income', amount: 9999, category: cat('inc_salary') },
      ],
      'expense',
    );
    expect(total).toBe(1000);
    expect(rows.map((r) => [r.category.id, r.amount, r.share, r.count])).toEqual([
      ['exp_transport', 600, 0.6, 1],
      ['exp_food', 400, 0.4, 2],
    ]);
  });

  it('returns empty rows when nothing matches', () => {
    expect(computeBreakdown([], 'income')).toEqual({ total: 0, rows: [] });
  });

  it('includes a positive carry in income only', () => {
    const tx = [{ type: 'income' as const, amount: 3000, category: cat('inc_salary') }];
    const income = computeBreakdown(tx, 'income', 1000, 'From October');
    expect(income.total).toBe(4000);
    expect(income.rows.map((r) => [r.category.id, r.category.name, r.amount])).toEqual([
      ['inc_salary', 'Salary', 3000],
      [CARRY_CATEGORY_ID, 'From October', 1000],
    ]);
    expect(computeBreakdown(tx, 'expense', 1000).total).toBe(0);
  });

  it('includes a negative carry in expense only', () => {
    expect(computeBreakdown([], 'expense', -700).total).toBe(700);
    expect(computeBreakdown([], 'income', -700).total).toBe(0);
  });
});
