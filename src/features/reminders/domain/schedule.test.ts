import { formatHour, reminderTimes } from './schedule';

const at = (d: Date) => `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('reminderTimes', () => {
  it('includes tonight when nothing is logged yet', () => {
    const times = reminderTimes({ now: new Date(2026, 10, 11, 14, 30), hour: 21, loggedToday: false, days: 3 });
    expect(times.map(at)).toEqual(['11/11 21:00', '11/12 21:00', '11/13 21:00']);
  });

  it('skips tonight once something is logged today', () => {
    const times = reminderTimes({ now: new Date(2026, 10, 11, 14, 30), hour: 21, loggedToday: true, days: 3 });
    expect(times.map(at)).toEqual(['11/12 21:00', '11/13 21:00']);
  });

  it('skips tonight when the time has passed, and crosses month ends', () => {
    const times = reminderTimes({ now: new Date(2026, 10, 30, 21, 0), hour: 21, loggedToday: false, days: 2 });
    expect(times.map(at)).toEqual(['12/1 21:00']);
  });

  it('defaults to a week ahead', () => {
    expect(reminderTimes({ now: new Date(2026, 10, 11, 8), hour: 20, loggedToday: false })).toHaveLength(7);
  });
});

describe('formatHour', () => {
  it.each([
    [20, '8 PM'],
    [21, '9 PM'],
    [0, '12 AM'],
    [12, '12 PM'],
  ])('%i -> %s', (h, s) => expect(formatHour(h)).toBe(s));
});
