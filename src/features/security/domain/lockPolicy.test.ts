import { isLockAfter, shouldLockOnReturn } from './lockPolicy';

describe('shouldLockOnReturn', () => {
  const t0 = 1_000_000;

  it('locks immediately on any return when set to "immediately"', () => {
    expect(shouldLockOnReturn({ backgroundAt: t0, now: t0 + 1, lockAfter: 'immediately' })).toBe(true);
    expect(shouldLockOnReturn({ backgroundAt: t0, now: t0, lockAfter: 'immediately' })).toBe(true);
  });

  it('waits for the chosen delay', () => {
    expect(shouldLockOnReturn({ backgroundAt: t0, now: t0 + 59_999, lockAfter: '1m' })).toBe(false);
    expect(shouldLockOnReturn({ backgroundAt: t0, now: t0 + 60_000, lockAfter: '1m' })).toBe(true);
    expect(shouldLockOnReturn({ backgroundAt: t0, now: t0 + 299_000, lockAfter: '5m' })).toBe(false);
    expect(shouldLockOnReturn({ backgroundAt: t0, now: t0 + 300_000, lockAfter: '5m' })).toBe(true);
  });

  it('never locks when the app did not go to the background', () => {
    expect(shouldLockOnReturn({ backgroundAt: null, now: t0, lockAfter: 'immediately' })).toBe(false);
  });
});

describe('isLockAfter', () => {
  it('accepts only known values', () => {
    expect(isLockAfter('1m')).toBe(true);
    expect(isLockAfter('immediately')).toBe(true);
    expect(isLockAfter('10m')).toBe(false);
    expect(isLockAfter(null)).toBe(false);
  });
});
