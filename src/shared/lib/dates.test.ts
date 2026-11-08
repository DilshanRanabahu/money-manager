import {
  addDays,
  addMonths,
  formatDayLabel,
  formatMonth,
  isValidISODate,
  monthRange,
  todayISO,
} from './dates';

describe('dates', () => {
  it('uses local calendar day', () => {
    expect(todayISO(new Date(2026, 10, 8, 23, 59))).toBe('2026-11-08');
    expect(todayISO(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });

  it('validates ISO dates', () => {
    expect(isValidISODate('2026-11-08')).toBe(true);
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2028-02-29')).toBe(true);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('8/11/2026')).toBe(false);
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('adds months', () => {
    expect(addMonths('2026-11', 1)).toBe('2026-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-05', -17)).toBe('2024-12');
  });

  it('builds half-open month ranges', () => {
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' });
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-03-01' });
  });

  it('formats labels', () => {
    expect(formatMonth('2026-11')).toBe('November 2026');
    expect(formatDayLabel('2026-11-08', '2026-11-08')).toBe('Today');
    expect(formatDayLabel('2026-11-07', '2026-11-08')).toBe('Yesterday');
    expect(formatDayLabel('2026-11-01', '2026-11-08')).toBe('Sun, 1 Nov');
    expect(formatDayLabel('2025-12-31', '2026-01-01')).toBe('Yesterday');
    expect(formatDayLabel('2025-12-25', '2026-01-08')).toBe('Thu, 25 Dec 2025');
  });
});
