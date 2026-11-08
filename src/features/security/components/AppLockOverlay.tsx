import { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useSettingsStore } from '@/shared/store/settingsStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import { useUnlock } from '../hooks/useAppLock';
import { useLockStore } from '../store/lockStore';

/**
 * Full-screen layer above the whole app. Mount once at the root, after the navigator.
 * - Locked: the lock screen; asks for the fingerprint right away.
 * - Covered (app in background): a blank screen so recent apps show no amounts.
 */
export function AppLockOverlay() {
  const appLock = useSettingsStore((s) => s.appLock);
  const locked = useLockStore((s) => s.locked);
  const covered = useLockStore((s) => s.covered);

  if (!appLock) return null;
  if (locked) return <LockScreen />;
  if (covered) return <Cover />;
  return null;
}

function Cover() {
  const { colors } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.bg }]} pointerEvents="none">
      <Icon name="lock-closed" size={32} color="textFaint" />
    </View>
  );
}

function LockScreen() {
  const { colors, spacing } = useTheme();
  const unlock = useUnlock();
  const message = useLockStore((s) => s.message);
  const tryUnlock = () => void unlock();

  // Ask right away when the lock screen appears.
  useEffect(() => {
    void unlock();
  }, [unlock]);

  // Android back button must not reveal the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(120)}
      exiting={FadeOut.duration(180)}
      style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.bg, padding: spacing.xl }]}
      accessibilityViewIsModal
    >
      <View style={[styles.badge, { backgroundColor: colors.surface }]}>
        <Icon name="finger-print" size={40} color="text" />
      </View>
      <Text variant="title" align="center" style={{ marginTop: spacing.xl }}>
        Money is locked
      </Text>
      <Text variant="body" color="textMuted" align="center" style={{ marginTop: spacing.sm }}>
        Use your fingerprint or phone screen lock to open.
      </Text>
      {message && (
        <Text variant="caption" color="expense" align="center" style={{ marginTop: spacing.md }}>
          {message}
        </Text>
      )}
      <Button label="Unlock" onPress={tryUnlock} style={{ marginTop: spacing.xxl, alignSelf: 'stretch' }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', zIndex: 1000, elevation: 1000 },
  badge: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
});
