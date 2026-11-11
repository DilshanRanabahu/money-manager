import type { CategoryHue } from '@/shared/theme/tokens';
import type { BreakdownRow } from './computeSummary';

export const OTHERS_ID = 'others';

export type DonutSlice = {
  id: string;
  label: string;
  color: CategoryHue;
  amount: number;
  /** 0..1 of the total */
  share: number;
  /** 0..1 where this slice starts around the circle */
  start: number;
};

/**
 * Turn breakdown rows into donut slices: the biggest `maxSlices` categories keep their own
 * slice, the rest are merged into one grey "Others" slice so the chart stays readable.
 */
export function donutSlices(rows: readonly BreakdownRow[], maxSlices = 5): DonutSlice[] {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  if (total <= 0) return [];

  const sorted = [...rows].filter((r) => r.amount > 0).sort((a, b) => b.amount - a.amount);
  const keep = sorted.length > maxSlices + 1 ? sorted.slice(0, maxSlices) : sorted;
  const rest = sorted.slice(keep.length);

  const parts = keep.map((r) => ({ id: r.category.id, label: r.category.name, color: r.category.color, amount: r.amount }));
  if (rest.length > 0) {
    parts.push({ id: OTHERS_ID, label: 'Others', color: 'gray', amount: rest.reduce((s, r) => s + r.amount, 0) });
  }

  let start = 0;
  return parts.map((p) => {
    const share = p.amount / total;
    const slice = { ...p, share, start };
    start += share;
    return slice;
  });
}
