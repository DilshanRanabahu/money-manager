import { DEFAULT_CATEGORIES } from '@/features/categories/domain/defaults';
import { MIGRATIONS } from './migrations';

jest.mock('expo-sqlite', () => ({}));

describe('migrations', () => {
  it('v2 sort order matches DEFAULT_CATEGORIES', () => {
    const sql = MIGRATIONS[1];
    const fromSql = [...sql.matchAll(/WHEN '([a-z_]+)' THEN (\d+)/g)].map(([, id, n]) => [id, Number(n)]);
    const fromDefaults = DEFAULT_CATEGORIES.map((c) => [c.id, c.sortOrder]);
    expect(fromSql).toEqual(fromDefaults);
  });
});

describe('default categories', () => {
  it('have unique ids and the new subscription categories', () => {
    const ids = DEFAULT_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(DEFAULT_CATEGORIES.find((c) => c.id === 'exp_ai_subs')).toMatchObject({
      name: 'AI subscriptions',
      type: 'expense',
    });
    expect(DEFAULT_CATEGORIES.find((c) => c.id === 'exp_api_subs')).toMatchObject({
      name: 'API subscriptions',
      type: 'expense',
    });
  });

  it('keep "Other" last within each type', () => {
    for (const type of ['expense', 'income'] as const) {
      const list = DEFAULT_CATEGORIES.filter((c) => c.type === type);
      expect(list[list.length - 1].name).toBe('Other');
    }
  });
});
