import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { useSettingsStore } from '@/shared/store/settingsStore';
import { shouldLockOnReturn } from '../domain/lockPolicy';
import { authenticate } from '../services/biometrics';
import { useLockStore, withoutLocking } from '../store/lockStore';

/**
 * Watches the app going to the background and coming back. Mount once at the root.
 * - Background: hide the content (so the recent-apps preview shows nothing) and note the time.
 * - Back: lock if it was away longer than "Lock after".
 */
export function useAppLockLifecycle() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const { appLock, lockAfter } = useSettingsStore.getState();
      const lock = useLockStore.getState();
      if (!appLock || lock.busy) return;

      if (next === 'background' || next === 'inactive') {
        lock.set({ covered: true, backgroundAt: lock.backgroundAt ?? Date.now() });
      } else if (next === 'active') {
        if (shouldLockOnReturn({ backgroundAt: lock.backgroundAt, now: Date.now(), lockAfter })) lock.lock();
        lock.set({ covered: false, backgroundAt: null });
      }
    });
    return () => sub.remove();
  }, []);
}

/** Ask for the fingerprint; unlock on success, otherwise leave a message for the lock screen. */
export function useUnlock() {
  return useCallback(async () => {
    const lock = useLockStore.getState();
    lock.set({ message: null });
    const result = await withoutLocking(() => authenticate('Unlock Money'));
    if (result.ok) {
      lock.unlock();
    } else if (result.error !== 'cancelled') {
      lock.set({
        message:
          result.error === 'unavailable'
            ? 'Set up a fingerprint or screen lock in your phone settings.'
            : "Couldn't verify. Try again.",
      });
    }
    return result;
  }, []);
}
