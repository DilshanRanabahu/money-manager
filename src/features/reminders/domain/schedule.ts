/**
 * When to remind the user to log their day. Pure, so it is easy to test.
 *
 * We schedule one-off reminders for the next few days instead of a repeating one:
 * today's is skipped as soon as something is logged for today, and if the app isn't
 * opened for a while the next days are still covered.
 */

export type ReminderHour = 20 | 21 | 22;
export const REMINDER_HOURS: readonly ReminderHour[] = [20, 21, 22];
export const DEFAULT_REMINDER_HOUR: ReminderHour = 21;

/** How many days ahead are scheduled each time we sync. */
export const DAYS_AHEAD = 7;

export function reminderTimes(args: {
  now: Date;
  hour: number;
  /** Something is already logged for today's date. */
  loggedToday: boolean;
  days?: number;
}): Date[] {
  const { now, hour, loggedToday, days = DAYS_AHEAD } = args;
  const out: Date[] = [];
  for (let i = 0; i < days; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hour, 0, 0, 0);
    if (i === 0 && (loggedToday || at <= now)) continue;
    out.push(at);
  }
  return out;
}

/** "9 PM" */
export const formatHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;
