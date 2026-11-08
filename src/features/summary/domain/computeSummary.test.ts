import { DEFAULT_CATEGORIES } from '@/features/categories/domain/defaults';
import { computeBreakdown, computeSummary } from './computeSummary';

const cat = (id: string) => DEFAULT_CATEGORIES.find((c) => c.id === id)!;

describe('computeSummary', () => {
  it('sums income, expense and balance', () => {
    expect(
      computeSummary([
        { type: 'income', amount: 12_000_000 },
        { type: 'expense', amount: 85_000 },
        { type: 'expense', amount: 15_000 },
      ]),
    ).toEqual({ income: 12_000_000, expense: 100_000, balance: 11_900_000 });
  });

  it('handles zero income (negative balance)', () => {
    expect(computeSummary([{ type: 'expense', amount: 500 }])).toEqual({ income: 0, expense: 500, balance: -500 });
  });

  it('handles empty month', () => {
    expect(computeSummary([])).toEqual({ income: 0, expense: 0, balance: 0 });
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
});
