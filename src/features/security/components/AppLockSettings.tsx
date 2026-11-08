import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useSettingsStore, type LockAfterPreference } from '@/shared/store/settingsStore';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Text } from '@/shared/ui/Text';
import { authenticate, canProtect } from '../services/biometrics';
import { useLockStore, withoutLocking } from '../store/lockStore';

const LOCK_AFTER = [
  { value: 'immediately', label: 'Immediately' },
  { value: '1m', label: '1 min' },
  { value: '5m', label: '5 min' },
] as const;

/** "App lock" switch + "Lock after" choice, for the Settings screen. */
export function AppLockSettings() {
  const { colors, spacing, radius } = useTheme();
  const appLock = useSettingsStore((s) => s.appLock);
  const lockAfter = useSettingsStore((s) => s.lockAfter);
  const setAppLock = useSettingsStore((s) => s.setAppLock);
  const setLockAfter = useSettingsStore((s) => s.setLockAfter);
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  const toggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (next && !(await canProtect())) {
        showToast({ message: 'Set up a fingerprint or screen lock in your phone settings first.' });
        return;
      }
      // Confirm it's the owner, both to turn on and to turn off.
      const result = await withoutLocking(() => authenticate(next ? 'Turn on app lock' : 'Turn off app lock'));
      if (!result.ok) {
        if (result.error !== 'cancelled') showToast({ message: "Couldn't verify. App lock not changed." });
        return;
      }
      setAppLock(next);
      if (!next) useLockStore.getState().unlock();
      showToast({ message: next ? 'App lock is on' : 'App lock is off' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
      <View style={[styles.row, { padding: spacing.lg }]}>
        <Icon name="finger-print" size={22} color="textMuted" />
        <View style={styles.text}>
          <Text variant="body" style={styles.label}>
            App lock
          </Text>
          <Text variant="caption" color="textMuted">
            Fingerprint or phone screen lock to open
          </Text>
        </View>
        <Switch
          value={appLock}
          onValueChange={toggle}
          disabled={busy}
          accessibilityLabel="App lock"
          trackColor={{ false: colors.surfaceMuted, true: colors.income }}
          thumbColor={colors.onAccent === '#FFFFFF' ? '#FFFFFF' : colors.text}
        />
      </View>

      {appLock && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
          <View style={[styles.divider, { backgroundColor: colors.divider, marginLeft: 56 }]} />
          <View style={{ padding: spacing.lg, gap: spacing.sm }}>
            <Text variant="caption" color="textMuted">
              Lock again after leaving the app
            </Text>
            <SegmentedControl<LockAfterPreference> options={LOCK_AFTER} value={lockAfter} onChange={setLockAfter} />
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
  divider: { height: StyleSheet.hairlineWidth },
});
