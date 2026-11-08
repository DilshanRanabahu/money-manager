import { create } from 'zustand';

import { addMonths, currentMonth, type MonthKey } from '@/shared/lib/dates';

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

  toast: Toast | null;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id?: number) => void;
};

let toastSeq = 0;

export const useUiStore = create<UiState>((set, get) => ({
  month: currentMonth(),
  monthDirection: 1,
  shiftMonth: (n) => set((s) => ({ month: addMonths(s.month, n), monthDirection: n })),
  setMonth: (next) => {
    const { month } = get();
    if (next !== month) set({ month: next, monthDirection: next > month ? 1 : -1 });
  },
  goToCurrentMonth: () => get().setMonth(currentMonth()),

  toast: null,
  showToast: (toast) => set({ toast: { ...toast, id: ++toastSeq } }),
  hideToast: (id) => set((s) => (id === undefined || s.toast?.id === id ? { toast: null } : s)),
}));
