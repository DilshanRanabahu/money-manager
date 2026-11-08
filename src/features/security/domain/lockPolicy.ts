/**
 * When the app should lock again after being in the background.
 * Like banking apps: always on launch, and on return after the chosen delay.
 */

export type LockAfter = 'immediately' | '1m' | '5m';

export const LOCK_AFTER_OPTIONS: readonly LockAfter[] = ['immediately', '1m', '5m'];

export const LOCK_AFTER_MS: Record<LockAfter, number> = {
  immediately: 0,
  '1m': 60_000,
  '5m': 300_000,
};

export function isLockAfter(value: string | null): value is LockAfter {
  return value !== null && (LOCK_AFTER_OPTIONS as readonly string[]).includes(value);
}

/** True when the app was away long enough that it must ask for the fingerprint again. */
export function shouldLockOnReturn(args: { backgroundAt: number | null; now: number; lockAfter: LockAfter }): boolean {
  const { backgroundAt, now, lockAfter } = args;
  if (backgroundAt === null) return false;
  return now - backgroundAt >= LOCK_AFTER_MS[lockAfter];
}
