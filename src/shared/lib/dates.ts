/**
 * A transaction belongs to a calendar day, stored as "YYYY-MM-DD" (local time).
 * A month is "YYYY-MM". Never use `new Date('YYYY-MM-DD')` — it parses as UTC.
 */

export type ISODate = string; // YYYY-MM-DD
export type MonthKey = string; // YYYY-MM

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now);
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseISODate(s);
  return toISODate(d) === s;
}

/** "2026-11-08" -> local Date at midnight */
export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = parseISODate(date);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function monthOf(date: ISODate): MonthKey {
  return date.slice(0, 7);
}

export function currentMonth(now: Date = new Date()): MonthKey {
  return monthOf(todayISO(now));
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

/** Half-open range for SQL: occurred_on >= start AND occurred_on < end */
export function monthRange(month: MonthKey): { start: ISODate; end: ISODate } {
  return { start: `${month}-01`, end: `${addMonths(month, 1)}-01` };
}

/** "2026-11" -> "November 2026" */
export function formatMonth(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** "2026-10" -> "October" */
export function monthName(month: MonthKey): string {
  return MONTHS[Number(month.split('-')[1]) - 1];
}

/** "2026-10" -> "Oct" */
export function monthShortName(month: MonthKey): string {
  return MONTHS_SHORT[Number(month.split('-')[1]) - 1];
}

/** "2026-02" -> 28 */
export function daysInMonth(month: MonthKey): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** "2026-11-08" -> 8 */
export function dayOfMonth(date: ISODate): number {
  return Number(date.slice(8, 10));
}

/** "Today", "Yesterday", or "Sat, 7 Nov" (adds year if not the current year) */
export function formatDayLabel(date: ISODate, today: ISODate = todayISO()): string {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  const d = parseISODate(date);
  const base = `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  return date.slice(0, 4) === today.slice(0, 4) ? base : `${base} ${d.getFullYear()}`;
}
