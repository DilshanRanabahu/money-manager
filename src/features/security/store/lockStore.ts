import { create } from 'zustand';

import { useSettingsStore } from '@/shared/store/settingsStore';
import type { Stamp } from '../domain/lockPolicy';

/** Runtime lock state (not persisted). */
type LockState = {
  /** The lock screen is showing; the app needs the fingerprint. */
  locked: boolean;
  /** Content is hidden because the app is in the background (recent-apps preview). */
  covered: boolean;
  /**
   * A system screen we opened ourselves is in front (fingerprint prompt, PIN screen,
   * share sheet, file picker). Short trips to these don't lock; long ones still do.
   */
  busy: boolean;
  /** When the app went away, and whether a screen we opened was in front at the time. */
  awayAt: Stamp | null;
  awayBusy: boolean;
  /** Message on the lock screen after a failed attempt. */
  message: string | null;
  lock: () => void;
  unlock: () => void;
  set: (patch: Partial<Pick<LockState, 'covered' | 'busy' | 'awayAt' | 'awayBusy' | 'message'>>) => void;
};

export const useLockStore = create<LockState>((set) => ({
  // Locked on launch when app lock is on.
  locked: useSettingsStore.getState().appLock,
  covered: false,
  busy: false,
  awayAt: null,
  awayBusy: false,
  message: null,
  lock: () => set({ locked: true, message: null }),
  unlock: () => set({ locked: false, covered: false, awayAt: null, awayBusy: false, message: null }),
  set: (patch) => set(patch),
}));

/** Now, on both clocks (see lockPolicy). */
export const stampNow = (): Stamp => ({ wall: Date.now(), mono: performance.now() });

/**
 * Run something that opens another app or system screen (share sheet, file picker,
 * fingerprint prompt). A short trip there won't lock the app; a long one still will.
 */
export async function withoutLocking<T>(fn: () => Promise<T>): Promise<T> {
  useLockStore.getState().set({ busy: true });
  try {
    return await fn();
  } finally {
    useLockStore.getState().set({ busy: false });
  }
}
