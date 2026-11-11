import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { reminderTimes } from '../domain/schedule';

const CHANNEL = 'daily-reminder';
const ID_PREFIX = 'daily-reminder-';
/** Where a tap on the reminder takes the user. */
export const REMINDER_URL = '/transaction/new';

// While the app is open the reminder isn't needed: the user is already here.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Our own channel, so the reminder can be muted separately in phone settings.
 * Returns false when it can't be made (Expo Go rejects it); the default channel is used then.
 */
async function ensureChannel(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Daily reminder',
      description: 'A nudge in the evening when nothing was logged that day',
      importance: AndroidImportance.DEFAULT,
    });
    return true;
  } catch {
    return false;
  }
}

/** Ask for permission (Android 13+ shows a prompt). */
export async function requestReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function cancelReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Replace the scheduled reminders with fresh ones for the next week.
 * Called when the setting changes, when today's entries change, and when the day changes.
 * Returns how many were scheduled.
 */
export async function syncReminders(args: { enabled: boolean; hour: number; loggedToday: boolean }): Promise<number> {
  await cancelReminders();
  if (!args.enabled) return 0;
  if (!(await Notifications.getPermissionsAsync()).granted) return 0;
  const channelId = (await ensureChannel()) ? CHANNEL : undefined;
  const times = reminderTimes({ now: new Date(), hour: args.hour, loggedToday: args.loggedToday });
  for (const date of times) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${ID_PREFIX}${date.getTime()}`,
      content: {
        title: 'Nothing logged today',
        body: 'Spent or received anything? Add it in a few seconds.',
        data: { url: REMINDER_URL },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, ...(channelId ? { channelId } : {}) },
    });
  }
  return times.length;
}

export const useLastNotificationResponse = Notifications.useLastNotificationResponse;
