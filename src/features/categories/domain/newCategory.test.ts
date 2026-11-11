import { DEFAULT_CATEGORIES } from './defaults';
import { unusedHue, validateNewCategory } from './newCategory';

const base = { name: 'Fuel', type: 'expense' as const, icon: 'car-outline', color: 'red' };

describe('validateNewCategory', () => {
  it('accepts and tidies a valid category', () => {
    expect(validateNewCategory({ ...base, name: '  Pet   food ' }, DEFAULT_CATEGORIES)).toEqual({
      ok: true,
      value: { name: 'Pet food', type: 'expense', icon: 'car-outline', color: 'red' },
    });
  });

  it.each([
    [{ name: '  ' }, 'Name is required'],
    [{ name: 'x'.repeat(25) }, 'Name is too long (max 24)'],
    [{ icon: 'rocket' }, 'Pick an icon from the list'],
    [{ color: 'magenta' }, 'Pick a colour from the list'],
    [{ name: 'food' }, '"Food" already exists'],
  ])('rejects %p', (patch, error) => {
    expect(validateNewCategory({ ...base, ...patch }, DEFAULT_CATEGORIES)).toEqual({ ok: false, error });
  });

  it('allows the same name for the other type', () => {
    expect(validateNewCategory({ ...base, name: 'Salary' }, DEFAULT_CATEGORIES).ok).toBe(true);
  });
});

describe('unusedHue', () => {
  it('suggests a colour the type does not use yet', () => {
    const hue = unusedHue('income', DEFAULT_CATEGORIES);
    expect(DEFAULT_CATEGORIES.filter((c) => c.type === 'income').map((c) => c.color)).not.toContain(hue);
  });
});
