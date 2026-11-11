import { router } from 'expo-router';
import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { useSettingsStore } from '@/shared/store/settingsStore';
import { shouldLockOnReturn } from '../domain/lockPolicy';
import { authenticate } from '../services/biometrics';
import { stampNow, useLockStore, withoutLocking } from '../store/lockStore';

const SCREEN_CAPTURE_KEY = 'app-lock';

/**
 * Watches the app going away and coming back. Mount once at the root.
 * - Away: hide the content and note the time (on two clocks) and whether a screen we
 *   opened ourselves was in front.
 * - Back: lock if it was away too long (see lockPolicy).
 * - While app lock is on, block screenshots and the recent-apps preview (FLAG_SECURE).
 */
export function useAppLockLifecycle() {
  const appLock = useSettingsStore((s) => s.appLock);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const { appLock: on, lockAfter } = useSettingsStore.getState();
      const lock = useLockStore.getState();
      if (!on) return;

      if (next === 'background' || next === 'inactive') {
        if (lock.awayAt === null) lock.set({ awayAt: stampNow(), awayBusy: lock.busy });
        lock.set({ covered: true });
      } else if (next === 'active') {
        const busy = lock.busy || lock.awayBusy;
        if (shouldLockOnReturn({ awayAt: lock.awayAt, now: stampNow(), lockAfter, busy })) lock.lock();
        lock.set({ covered: false, awayAt: null, awayBusy: false });
      }
    });
    return () => sub.remove();
  }, []);

  // Audit #4: no screenshots / recent-apps preview of the amounts while app lock is on.
  useEffect(() => {
    const action = appLock ? preventScreenCaptureAsync : allowScreenCaptureAsync;
    action(SCREEN_CAPTURE_KEY).catch(() => {});
  }, [appLock]);

  // Audit #7: when the app locks, close any open sheet or pushed screen so nothing can
  // sit above the lock screen. (Unsaved input in an open sheet is dropped, like banking apps.)
  const locked = useLockStore((s) => s.locked);
  useEffect(() => {
    if (!locked) return;
    try {
      if (router.canDismiss()) router.dismissAll();
    } catch {
      // Navigation not ready yet (cold start): nothing is open.
    }
  }, [locked]);
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
