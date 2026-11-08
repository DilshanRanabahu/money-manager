import { daysInMonth, dayOfMonth, monthShortName } from '@/shared/lib/dates';
import {
  changeVsPrevious,
  comparisonPeriod,
  limitToPeriod,
  spendingPace,
  sumByCategory,
  sumOfType,
} from './insights';

type T = { type: 'income' | 'expense'; amount: number; categoryId: string; occurredOn: string };
const e = (amount: number, occurredOn: string, categoryId = 'exp_food'): T => ({ type: 'expense', amount, categoryId, occurredOn });
const i = (amount: number, occurredOn: string): T => ({ type: 'income', amount, categoryId: 'inc_salary', occurredOn });

describe('date helpers', () => {
  it('knows month lengths and days', () => {
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-11')).toBe(30);
    expect(dayOfMonth('2026-11-08')).toBe(8);
    expect(monthShortName('2026-10')).toBe('Oct');
  });
});

describe('changeVsPrevious', () => {
  it('gives the ratio of change', () => {
    expect(changeVsPrevious(1180, 1000).ratio).toBeCloseTo(0.18);
    expect(changeVsPrevious(940, 1000).ratio).toBeCloseTo(-0.06);
  });
  it('marks a category as new when there was nothing before', () => {
    expect(changeVsPrevious(500, 0)).toEqual({ previous: 0, ratio: null });
  });
});

describe('sums', () => {
  const tx = [e(100, '2026-11-01'), e(50, '2026-11-02', 'exp_bills'), e(25, '2026-11-03'), i(1000, '2026-11-01')];
  it('sums one type', () => {
    expect(sumOfType(tx, 'expense')).toBe(175);
    expect(sumOfType(tx, 'income')).toBe(1000);
  });
  it('sums by category', () => {
    expect([...sumByCategory(tx, 'expense')]).toEqual([
      ['exp_food', 125],
      ['exp_bills', 50],
    ]);
  });
});

describe('comparison period', () => {
  it('compares the current month with the same days of last month', () => {
    expect(comparisonPeriod('2026-11', '2026-11-08')).toEqual({ kind: 'same-days', uptoDay: 8 });
    const oct = [e(1, '2026-10-01'), e(2, '2026-10-08'), e(4, '2026-10-09'), e(8, '2026-10-31')];
    expect(limitToPeriod(oct, { kind: 'same-days', uptoDay: 8 }).map((t) => t.amount)).toEqual([1, 2]);
  });
  it('compares past months in full', () => {
    expect(comparisonPeriod('2026-10', '2026-11-08')).toEqual({ kind: 'full' });
    expect(limitToPeriod([e(1, '2026-09-30')], { kind: 'full' })).toHaveLength(1);
  });
});

describe('spendingPace', () => {
  const oct = [
    e(10_000, '2026-10-01'), // early big bill
    e(1_000, '2026-10-05'),
    e(2_000, '2026-10-15'),
    e(3_000, '2026-10-31'),
    i(85_000, '2026-10-01'),
  ];

  it('projects the current month using the rest of last month', () => {
    const pace = spendingPace({
      month: '2026-11',
      today: '2026-11-08',
      current: [e(10_000, '2026-11-01'), e(6_000, '2026-11-08'), i(85_000, '2026-11-01')],
      previous: oct,
    })!;
    expect(pace).toEqual({
      spent: 16_000,
      daysElapsed: 8,
      daysInMonth: 30,
      perDay: 2_000,
      projected: 16_000 + 2_000 + 3_000, // + Oct 15 and Oct 31
      basis: 'last-month',
    });
  });

  it('falls back to a straight line without last month', () => {
    const pace = spendingPace({ month: '2026-11', today: '2026-11-10', current: [e(5_000, '2026-11-02')], previous: [] })!;
    expect(pace.basis).toBe('linear');
    expect(pace.perDay).toBe(500);
    expect(pace.projected).toBe(15_000);
  });

  it('gives only the average for a past month', () => {
    const pace = spendingPace({ month: '2026-10', today: '2026-11-08', current: oct, previous: [] })!;
    expect(pace).toMatchObject({ spent: 16_000, daysElapsed: 31, perDay: 516, projected: null, basis: null });
  });

  it('is empty for a future month', () => {
    expect(spendingPace({ month: '2026-12', today: '2026-11-08', current: [], previous: [] })).toBeNull();
  });
});
