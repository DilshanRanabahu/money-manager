import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { transactionRepo } from '@/db/repositories/transactionRepo';
import { useQuery } from '@/db/useQuery';
import { useSettingsStore } from '@/shared/store/settingsStore';
import { useUiStore } from '@/shared/store/uiStore';
import { REMINDER_URL, syncReminders, useLastNotificationResponse } from '../services/notifications';

const TABLES = ['transactions'] as const;

/**
 * Keeps the scheduled reminders in step with the data: re-schedules when the setting
 * changes, when something is logged for today, and when the day changes.
 * Mount once, inside the database provider.
 */
export function useReminderSync() {
  const enabled = useSettingsStore((s) => s.reminder);
  const hour = useSettingsStore((s) => s.reminderHour);
  const today = useUiStore((s) => s.today);
  const { data: count, loading } = useQuery(`tx:countOn:${today}`, () => transactionRepo.countOn(today), TABLES);
  const loggedToday = (count ?? 0) > 0;

  useEffect(() => {
    if (loading) return;
    syncReminders({ enabled, hour, loggedToday }).catch(() => {
      // Reminders are a convenience; never break the app for them.
    });
  }, [enabled, hour, loggedToday, loading, today]);
}

/** Tapping the reminder opens the add-entry sheet (once per notification). */
export function useReminderTap() {
  const response = useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!response) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    if (response.notification.request.content.data?.url === REMINDER_URL) router.push(REMINDER_URL);
  }, [response]);
}
