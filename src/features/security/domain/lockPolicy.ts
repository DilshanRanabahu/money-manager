/**
 * When the app should lock again after being away.
 * Like banking apps: always on launch, and on return after the chosen delay.
 */

export type LockAfter = 'immediately' | '1m' | '5m';

export const LOCK_AFTER_OPTIONS: readonly LockAfter[] = ['immediately', '1m', '5m'];

export const LOCK_AFTER_MS: Record<LockAfter, number> = {
  immediately: 0,
  '1m': 60_000,
  '5m': 300_000,
};

/**
 * While a system screen we opened ourselves is in front (fingerprint/PIN prompt, share
 * sheet, file picker) the app is allowed to be away a little without locking — but only
 * this long. Leaving the phone with the share sheet open still locks the app.
 */
export const BUSY_GRACE_MS = 60_000;

export function isLockAfter(value: string | null): value is LockAfter {
  return value !== null && (LOCK_AFTER_OPTIONS as readonly string[]).includes(value);
}

/**
 * A moment measured on two clocks:
 * - `wall`: Date.now(); the user can change it in phone settings.
 * - `mono`: a monotonic clock (performance.now()); can't be changed, but may pause while
 *   the phone sleeps.
 * Using both closes the "set the clock back" trick without under-counting sleep time.
 */
export type Stamp = { wall: number; mono: number };

export function shouldLockOnReturn(args: {
  awayAt: Stamp | null;
  now: Stamp;
  lockAfter: LockAfter;
  /** A screen we opened ourselves was in front while away. */
  busy?: boolean;
}): boolean {
  const { awayAt, now, lockAfter, busy = false } = args;
  if (awayAt === null) return false;

  // The wall clock went backwards: someone changed the time. Lock.
  if (now.wall < awayAt.wall) return true;

  const away = Math.max(now.wall - awayAt.wall, now.mono - awayAt.mono);
  const limit = busy ? Math.max(LOCK_AFTER_MS[lockAfter], BUSY_GRACE_MS) : LOCK_AFTER_MS[lockAfter];
  return away >= limit;
}
