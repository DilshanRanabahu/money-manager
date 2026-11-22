import type { ReactNode } from 'react';
import { create } from 'zustand';

import { addMonths, currentMonth, todayISO, type ISODate, type MonthKey } from '@/shared/lib/dates';
import type { IconName } from '@/shared/ui/Icon';

/** Transient UI state only. Persistent data lives in SQLite. */

export type Toast = {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** A themed confirm dialog (rendered by ConfirmHost). */
export type ConfirmRequest = {
  id: number;
  title: string;
  message?: string;
  /** Shown in a soft circle above the title. */
  icon?: IconName;
  /** Extra content between the message and the buttons (e.g. a preview of the entry). */
  content?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Red confirm button and icon. */
  destructive?: boolean;
  onConfirm: () => void;
  /** Also runs on Back, a tap outside, or when the app locks. */
  onCancel?: () => void;
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

  confirm: ConfirmRequest | null;
  askConfirm: (request: Omit<ConfirmRequest, 'id'>) => void;
  /** Close the dialog; runs onConfirm or onCancel. Ignored if that dialog is already closed. */
  settleConfirm: (id: number, accepted: boolean) => void;
};

let toastSeq = 0;
let confirmSeq = 0;

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

  confirm: null,
  askConfirm: (request) => {
    // Only one dialog at a time: a new one cancels the old one.
    const open = get().confirm;
    if (open) get().settleConfirm(open.id, false);
    set({ confirm: { ...request, id: ++confirmSeq } });
  },
  settleConfirm: (id, accepted) => {
    const open = get().confirm;
    if (!open || open.id !== id) return;
    set({ confirm: null });
    if (accepted) open.onConfirm();
    else open.onCancel?.();
  },
}));
