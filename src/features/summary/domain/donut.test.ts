import type { Category } from '@/features/categories/domain/types';
import type { BreakdownRow } from './computeSummary';
import { donutSlices, OTHERS_ID } from './donut';

const row = (id: string, amount: number): BreakdownRow => ({
  category: { id, name: id, type: 'expense', icon: 'ellipse', color: 'blue', sortOrder: 0, isArchived: false } as Category,
  amount,
  share: 0,
  count: 1,
});

describe('donutSlices', () => {
  it('is empty with no money', () => {
    expect(donutSlices([])).toEqual([]);
    expect(donutSlices([row('a', 0)])).toEqual([]);
  });

  it('keeps every category when there are few', () => {
    const s = donutSlices([row('a', 300), row('b', 100)]);
    expect(s.map((x) => [x.id, x.share, x.start])).toEqual([
      ['a', 0.75, 0],
      ['b', 0.25, 0.75],
    ]);
  });

  it('merges the small ones into Others', () => {
    const rows = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id, i) => row(id, 700 - i * 100));
    const s = donutSlices(rows, 5);
    expect(s.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd', 'e', OTHERS_ID]);
    expect(s[5]).toMatchObject({ label: 'Others', color: 'gray', amount: 200 + 100 });
    expect(s.reduce((t, x) => t + x.share, 0)).toBeCloseTo(1);
  });

  it('does not make an Others slice for just one extra category', () => {
    const rows = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => row(id, 100));
    expect(donutSlices(rows, 5).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
});
