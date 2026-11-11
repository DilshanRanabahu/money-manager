import { BUSY_GRACE_MS, isLockAfter, shouldLockOnReturn, type Stamp } from './lockPolicy';

const at = (wall: number, mono = wall): Stamp => ({ wall, mono });
const T = 1_000_000;

describe('shouldLockOnReturn', () => {
  it('locks on any return when set to "immediately"', () => {
    expect(shouldLockOnReturn({ awayAt: at(T), now: at(T + 1), lockAfter: 'immediately' })).toBe(true);
    expect(shouldLockOnReturn({ awayAt: at(T), now: at(T), lockAfter: 'immediately' })).toBe(true);
  });

  it('waits for the chosen delay', () => {
    expect(shouldLockOnReturn({ awayAt: at(T), now: at(T + 59_999), lockAfter: '1m' })).toBe(false);
    expect(shouldLockOnReturn({ awayAt: at(T), now: at(T + 60_000), lockAfter: '1m' })).toBe(true);
    expect(shouldLockOnReturn({ awayAt: at(T), now: at(T + 299_000), lockAfter: '5m' })).toBe(false);
    expect(shouldLockOnReturn({ awayAt: at(T), now: at(T + 300_000), lockAfter: '5m' })).toBe(true);
  });

  it('never locks when the app did not go away', () => {
    expect(shouldLockOnReturn({ awayAt: null, now: at(T), lockAfter: 'immediately' })).toBe(false);
  });

  // Audit #2: setting the phone clock back must not skip the lock.
  it('locks when the wall clock went backwards', () => {
    expect(shouldLockOnReturn({ awayAt: at(T), now: { wall: T - 3_600_000, mono: T + 10 }, lockAfter: '5m' })).toBe(true);
    expect(shouldLockOnReturn({ awayAt: at(T), now: { wall: T - 1, mono: T + 1 }, lockAfter: 'immediately' })).toBe(true);
  });

  it('counts the longer of the two clocks (monotonic may pause in deep sleep)', () => {
    // wall says 10 min passed, monotonic only 1 s (phone slept): still locks.
    expect(shouldLockOnReturn({ awayAt: at(T), now: { wall: T + 600_000, mono: T + 1_000 }, lockAfter: '5m' })).toBe(true);
  });

  // Audit #1: a share sheet / file picker left open must not keep the app unlocked forever.
  it('allows a short trip to a screen we opened, but not a long one', () => {
    expect(shouldLockOnReturn({ awayAt: at(T), now: at(T + 20_000), lockAfter: 'immediately', busy: true })).toBe(false);
    expect(shouldLockOnReturn({ awayAt: at(T), now: at(T + BUSY_GRACE_MS), lockAfter: 'immediately', busy: true })).toBe(true);
    expect(shouldLockOnReturn({ awayAt: at(T), now: at(T + 120_000), lockAfter: '5m', busy: true })).toBe(false);
    expect(shouldLockOnReturn({ awayAt: at(T), now: at(T + 300_000), lockAfter: '5m', busy: true })).toBe(true);
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
