import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

/**
 * Small persisted user preferences. Stored in expo-sqlite's key-value store,
 * separate from the transactions database.
 */

export type ThemePreference = 'system' | 'light' | 'dark';
export type LockAfterPreference = 'immediately' | '1m' | '5m';
export type AssistantModelPreference = 'claude-haiku-5-5' | 'claude-opus-5-5';

const KEYS = {
  theme: 'pref.theme',
  lastExpenseCategory: 'pref.lastCategory.expense',
  lastIncomeCategory: 'pref.lastCategory.income',
  appLock: 'pref.appLock',
  lockAfter: 'pref.lockAfter',
  assistant: 'pref.assistant',
  assistantModel: 'pref.assistantModel',
  reminder: 'pref.reminder',
  reminderHour: 'pref.reminderHour',
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
  /** "Ask Money" chat (sends questions to Claude). Off by default. */
  assistant: boolean;
  assistantModel: AssistantModelPreference;
  setAssistant: (on: boolean) => void;
  setAssistantModel: (model: AssistantModelPreference) => void;
  /** Evening reminder when nothing was logged today. Off by default. */
  reminder: boolean;
  /** Hour of the reminder (20, 21 or 22). */
  reminderHour: number;
  setReminder: (on: boolean) => void;
  setReminderHour: (hour: number) => void;
};

const storedTheme = read(KEYS.theme);
const storedLockAfter = read(KEYS.lockAfter);
const storedModel = read(KEYS.assistantModel);
const storedReminderHour = Number(read(KEYS.reminderHour));

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
  assistant: read(KEYS.assistant) === 'on',
  assistantModel: storedModel === 'claude-opus-5-5' ? storedModel : 'claude-haiku-5-5',
  setAssistant: (on) => {
    write(KEYS.assistant, on ? 'on' : 'off');
    set({ assistant: on });
  },
  setAssistantModel: (model) => {
    write(KEYS.assistantModel, model);
    set({ assistantModel: model });
  },
  reminder: read(KEYS.reminder) === 'on',
  reminderHour: [20, 21, 22].includes(storedReminderHour) ? storedReminderHour : 21,
  setReminder: (on) => {
    write(KEYS.reminder, on ? 'on' : 'off');
    set({ reminder: on });
  },
  setReminderHour: (hour) => {
    write(KEYS.reminderHour, String(hour));
    set({ reminderHour: hour });
  },
}));
