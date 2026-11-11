import { monthAfterDayChange } from './uiStore';

describe('monthAfterDayChange', () => {
  it('moves to the new month when the old current month was on screen', () => {
    expect(monthAfterDayChange({ viewing: '2026-11', previousToday: '2026-11-30', now: '2026-12-01' })).toBe('2026-12');
    expect(monthAfterDayChange({ viewing: '2026-12', previousToday: '2026-12-31', now: '2027-01-01' })).toBe('2027-01');
  });

  it('also catches up after several months away', () => {
    expect(monthAfterDayChange({ viewing: '2026-11', previousToday: '2026-11-20', now: '2027-02-03' })).toBe('2027-02');
  });

  it('stays on a month the user chose to browse', () => {
    expect(monthAfterDayChange({ viewing: '2026-10', previousToday: '2026-11-30', now: '2026-12-01' })).toBe('2026-10');
  });

  it('does nothing when only the day changed', () => {
    expect(monthAfterDayChange({ viewing: '2026-11', previousToday: '2026-11-08', now: '2026-11-09' })).toBe('2026-11');
  });
});
