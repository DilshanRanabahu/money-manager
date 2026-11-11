import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useUiStore } from '@/shared/store/uiStore';

/** Milliseconds until the next local midnight (+1 s so we're safely past it). */
function msToNextMidnight(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return next.getTime() - now.getTime();
}

/**
 * Keeps the app on the calendar: when the app comes back after the day changed, or the
 * clock passes midnight while it's open, update "today" and move into the new month
 * (if the current month was on screen). Mount once at the root.
 */
export function useDayRollover() {
  useEffect(() => {
    const sync = () => useUiStore.getState().syncToday();
    let timer: ReturnType<typeof setTimeout>;
    const scheduleMidnight = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        sync();
        scheduleMidnight();
      }, msToNextMidnight());
    };

    sync();
    scheduleMidnight();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        sync();
        scheduleMidnight(); // timers can drift or pause while in the background
      }
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);
}
