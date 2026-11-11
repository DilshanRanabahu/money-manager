import { create } from 'zustand';

import { addMonths, currentMonth, todayISO, type ISODate, type MonthKey } from '@/shared/lib/dates';

/** Transient UI state only. Persistent data lives in SQLite. */

export type Toast = {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

type UiState = {
  month: MonthKey;
  /** +1 when moving forward, -1 when moving back; drives the slide direction. */
  monthDirection: 1 | -1;
  shiftMonth: (n: 1 | -1) => void;
  setMonth: (month: MonthKey) => void;
  goToCurrentMonth: () => void;
  /** Today's date; changes at midnight so "Today"/"Yesterday" labels stay right. */
  today: ISODate;
  /** Call on resume and at midnight: follow the calendar into a new day/month. */
  syncToday: () => void;

  toast: Toast | null;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id?: number) => void;
};

let toastSeq = 0;

/**
 * When the day changes: if the user was looking at the month that was "current" until now,
 * move them to the new current month. If they were browsing another month on purpose, stay.
 */
export function monthAfterDayChange(args: { viewing: MonthKey; previousToday: ISODate; now: ISODate }): MonthKey {
  const wasCurrent = args.previousToday.slice(0, 7);
  const isCurrent = args.now.slice(0, 7);
  return args.viewing === wasCurrent && isCurrent !== wasCurrent ? isCurrent : args.viewing;
}

export const useUiStore = create<UiState>((set, get) => ({
  month: currentMonth(),
  monthDirection: 1,
  shiftMonth: (n) => set((s) => ({ month: addMonths(s.month, n), monthDirection: n })),
  setMonth: (next) => {
    const { month } = get();
    if (next !== month) set({ month: next, monthDirection: next > month ? 1 : -1 });
  },
  goToCurrentMonth: () => get().setMonth(currentMonth()),
  today: todayISO(),
  syncToday: () => {
    const { today, month, setMonth } = get();
    const now = todayISO();
    if (now === today) return;
    set({ today: now });
    const next = monthAfterDayChange({ viewing: month, previousToday: today, now });
    if (next !== month) setMonth(next);
  },

  toast: null,
  showToast: (toast) => set({ toast: { ...toast, id: ++toastSeq } }),
  hideToast: (id) => set((s) => (id === undefined || s.toast?.id === id ? { toast: null } : s)),
}));
