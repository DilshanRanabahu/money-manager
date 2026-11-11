import { useState } from 'react';
import { Linking, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useSettingsStore } from '@/shared/store/settingsStore';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Text } from '@/shared/ui/Text';
import { formatHour, REMINDER_HOURS } from '../domain/schedule';
import { requestReminderPermission } from '../services/notifications';

const HOUR_OPTIONS = REMINDER_HOURS.map((h) => ({ value: String(h), label: formatHour(h) }));

/** "Daily reminder" switch and time, for the Settings screen. */
export function ReminderSettings() {
  const { colors, spacing, radius } = useTheme();
  const enabled = useSettingsStore((s) => s.reminder);
  const hour = useSettingsStore((s) => s.reminderHour);
  const setEnabled = useSettingsStore((s) => s.setReminder);
  const setHour = useSettingsStore((s) => s.setReminderHour);
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  const toggle = async (next: boolean) => {
    if (!next) {
      setEnabled(false);
      return;
    }
    setBusy(true);
    const granted = await requestReminderPermission().catch(() => false);
    setBusy(false);
    if (!granted) {
      showToast({
        message: 'Notifications are off for Money. Turn them on in phone settings.',
        actionLabel: 'Open',
        onAction: () => void Linking.openSettings(),
      });
      return;
    }
    setEnabled(true);
    showToast({ message: `You'll get a nudge at ${formatHour(hour)} on days with nothing logged` });
  };

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
      <View style={[styles.row, { padding: spacing.lg }]}>
        <Icon name="notifications-outline" size={22} color="textMuted" />
        <View style={styles.text}>
          <Text variant="body" style={styles.label}>
            Daily reminder
          </Text>
          <Text variant="caption" color="textMuted">
            Only on days you haven&apos;t logged anything
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={toggle}
          disabled={busy}
          accessibilityLabel="Daily reminder"
          trackColor={{ false: colors.surfaceMuted, true: colors.income }}
          thumbColor={colors.onAccent === '#FFFFFF' ? '#FFFFFF' : colors.text}
        />
      </View>

      {enabled && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <View style={{ padding: spacing.lg, gap: spacing.sm }}>
            <Text variant="caption" color="textMuted">
              Remind me at
            </Text>
            <SegmentedControl<string> options={HOUR_OPTIONS} value={String(hour)} onChange={(v) => setHour(Number(v))} />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  text: { flex: 1 },
  label: { fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
});
