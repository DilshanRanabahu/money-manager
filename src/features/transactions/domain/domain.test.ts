import { applyKey, formatInput, minorToInput, type PadKey } from './amountInput';
import { groupByDay } from './groupByDay';
import type { Transaction } from './types';

const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(),
  type: 'expense',
  amount: 100,
  categoryId: 'exp_food',
  note: null,
  occurredOn: '2026-11-08',
  createdAt: 0,
  updatedAt: 0,
  ...p,
});

describe('groupByDay', () => {
  it('orders days newest first and entries newest first', () => {
    const groups = groupByDay([
      tx({ id: 'a', occurredOn: '2026-11-07', createdAt: 1 }),
      tx({ id: 'b', occurredOn: '2026-11-08', createdAt: 1 }),
      tx({ id: 'c', occurredOn: '2026-11-08', createdAt: 5 }),
      tx({ id: 'd', occurredOn: '2026-11-01', createdAt: 9 }),
    ]);
    expect(groups.map((g) => g.date)).toEqual(['2026-11-08', '2026-11-07', '2026-11-01']);
    expect(groups[0].items.map((t) => t.id)).toEqual(['c', 'b']);
  });

  it('computes net per day', () => {
    const [day] = groupByDay([
      tx({ type: 'income', amount: 10000 }),
      tx({ type: 'expense', amount: 2500 }),
      tx({ type: 'expense', amount: 500 }),
    ]);
    expect(day.net).toBe(7000);
  });

  it('handles empty input', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('amount pad', () => {
  const type = (keys: PadKey[]) => keys.reduce<string>((s, k) => applyKey(s, k) ?? s, '');

  it('types numbers', () => {
    expect(type(['1', '2', '5', '0'])).toBe('1250');
    expect(type(['1', '.', '5'])).toBe('1.5');
    expect(type(['.', '5'])).toBe('0.5');
  });

  it('rejects invalid keys', () => {
    expect(applyKey('1.5', '.')).toBeNull();
    expect(applyKey('1.55', '1')).toBeNull();
    expect(applyKey('0', '0')).toBeNull();
    expect(applyKey('', 'back')).toBeNull();
    expect(applyKey('123456789', '1')).toBeNull();
  });

  it('replaces a single leading zero', () => {
    expect(applyKey('0', '7')).toBe('7');
  });

  it('deletes', () => {
    expect(applyKey('12.5', 'back')).toBe('12.');
  });

  it('formats for display', () => {
    expect(formatInput('')).toBe('0');
    expect(formatInput('1250')).toBe('1,250');
    expect(formatInput('1250.')).toBe('1,250.');
    expect(formatInput('1250.5')).toBe('1,250.5');
  });

  it('converts stored amounts back to input', () => {
    expect(minorToInput(125000)).toBe('1250');
    expect(minorToInput(125050)).toBe('1250.5');
    expect(minorToInput(125005)).toBe('1250.05');
    expect(minorToInput(125055)).toBe('1250.55');
  });
});
