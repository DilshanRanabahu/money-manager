import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

/**
 * Small persisted user preferences. Stored in expo-sqlite's key-value store,
 * separate from the transactions database.
 */

export type ThemePreference = 'system' | 'light' | 'dark';

const KEYS = {
  theme: 'pref.theme',
  lastExpenseCategory: 'pref.lastCategory.expense',
  lastIncomeCategory: 'pref.lastCategory.income',
} as const;

const read = (key: string): string | null => {
  try {
    return Storage.getItemSync(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string) => {
  try {
    Storage.setItemSync(key, value);
  } catch {
    // Preferences are a convenience; never crash for them.
  }
};

type SettingsState = {
  theme: ThemePreference;
  lastCategory: { expense: string | null; income: string | null };
  setTheme: (theme: ThemePreference) => void;
  setLastCategory: (type: 'expense' | 'income', id: string) => void;
};

const storedTheme = read(KEYS.theme);

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'system',
  lastCategory: {
    expense: read(KEYS.lastExpenseCategory),
    income: read(KEYS.lastIncomeCategory),
  },
  setTheme: (theme) => {
    write(KEYS.theme, theme);
    set({ theme });
  },
  setLastCategory: (type, id) => {
    write(type === 'expense' ? KEYS.lastExpenseCategory : KEYS.lastIncomeCategory, id);
    set((s) => ({ lastCategory: { ...s.lastCategory, [type]: id } }));
  },
}));
