import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

/**
 * Small persisted user preferences. Stored in expo-sqlite's key-value store,
 * separate from the transactions database.
 */

export type ThemePreference = 'system' | 'light' | 'dark';
export type LockAfterPreference = 'immediately' | '1m' | '5m';

const KEYS = {
  theme: 'pref.theme',
  lastExpenseCategory: 'pref.lastCategory.expense',
  lastIncomeCategory: 'pref.lastCategory.income',
  appLock: 'pref.appLock',
  lockAfter: 'pref.lockAfter',
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
  /** Ask for fingerprint / screen lock to open the app. */
  appLock: boolean;
  lockAfter: LockAfterPreference;
  setAppLock: (on: boolean) => void;
  setLockAfter: (value: LockAfterPreference) => void;
};

const storedTheme = read(KEYS.theme);
const storedLockAfter = read(KEYS.lockAfter);

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
  appLock: read(KEYS.appLock) === 'on',
  lockAfter: storedLockAfter === '1m' || storedLockAfter === '5m' ? storedLockAfter : 'immediately',
  setAppLock: (on) => {
    write(KEYS.appLock, on ? 'on' : 'off');
    set({ appLock: on });
  },
  setLockAfter: (value) => {
    write(KEYS.lockAfter, value);
    set({ lockAfter: value });
  },
}));
