import { create } from 'zustand';

import { useSettingsStore } from '@/shared/store/settingsStore';

/** Runtime lock state (not persisted). */
type LockState = {
  /** The lock screen is showing; the app needs the fingerprint. */
  locked: boolean;
  /** Content is hidden because the app is in the background (recent-apps preview). */
  covered: boolean;
  /**
   * A system screen we opened ourselves is in front (fingerprint prompt, PIN screen,
   * share sheet, file picker). Leaving the app for these must not lock it.
   */
  busy: boolean;
  /** When the app went to the background, for "lock after 1 min". */
  backgroundAt: number | null;
  /** Message on the lock screen after a failed attempt. */
  message: string | null;
  lock: () => void;
  unlock: () => void;
  set: (patch: Partial<Pick<LockState, 'covered' | 'busy' | 'backgroundAt' | 'message'>>) => void;
};

export const useLockStore = create<LockState>((set) => ({
  // Locked on launch when app lock is on.
  locked: useSettingsStore.getState().appLock,
  covered: false,
  busy: false,
  backgroundAt: null,
  message: null,
  lock: () => set({ locked: true, message: null }),
  unlock: () => set({ locked: false, covered: false, backgroundAt: null, message: null }),
  set: (patch) => set(patch),
}));

/**
 * Run something that opens another app or system screen (share sheet, file picker)
 * without the app locking itself when it comes back.
 */
export async function withoutLocking<T>(fn: () => Promise<T>): Promise<T> {
  useLockStore.getState().set({ busy: true });
  try {
    return await fn();
  } finally {
    useLockStore.getState().set({ busy: false, backgroundAt: null });
  }
}
