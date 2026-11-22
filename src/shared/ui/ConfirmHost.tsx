import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { duration, easing, useReducedMotion } from '@/shared/motion/tokens';
import { useUiStore, type ConfirmRequest } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * Renders the single global confirm dialog from uiStore. Mount once at the root.
 * Uses a Modal so it also shows above native form sheets.
 */
export function ConfirmHost() {
  const request = useUiStore((s) => s.confirm);
  const settle = useUiStore((s) => s.settleConfirm);
  const { colors, spacing, radius } = useTheme();
  const reduceMotion = useReducedMotion();

  // Keep the last dialog on screen while it fades out.
  const [shown, setShown] = useState<ConfirmRequest | null>(request);
  if (request && request !== shown) setShown(request);

  const progress = useSharedValue(0);
  useEffect(() => {
    if (request) {
      progress.set(withTiming(1, { duration: duration.base, easing: easing.out }));
    } else {
      progress.set(
        withTiming(0, { duration: duration.fast }, (done) => {
          if (done) scheduleOnRN(setShown, null);
        }),
      );
    }
  }, [request, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: reduceMotion
      ? []
      : [{ scale: 0.94 + 0.06 * progress.value }, { translateY: (1 - progress.value) * 12 }],
  }));

  if (!shown) return null;
  const cancel = () => settle(shown.id, false);
  const tone = shown.destructive ? 'expense' : 'text';

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={cancel}
    >
      <View style={[styles.center, { padding: spacing.xl }]} pointerEvents={request ? 'auto' : 'none'}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.backdrop }, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={cancel} accessibilityLabel="Close" />
        </Animated.View>

        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
            cardStyle,
          ]}
        >
          <View style={[styles.head, { gap: spacing.sm }]}>
            {shown.icon && (
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: shown.destructive ? colors.expenseSoft : colors.surfaceMuted, marginBottom: spacing.xs },
                ]}
              >
                <Icon name={shown.icon} size={24} color={tone} />
              </View>
            )}
            <Text variant="headline" align="center" accessibilityRole="header">
              {shown.title}
            </Text>
            {shown.message ? (
              <Text variant="body" color="textMuted" align="center">
                {shown.message}
              </Text>
            ) : null}
          </View>

          {shown.content}

          <View style={[styles.buttons, { gap: spacing.sm }]}>
            <Button label={shown.cancelLabel ?? 'Cancel'} variant="secondary" onPress={cancel} style={styles.fill} />
            <Button
              label={shown.confirmLabel}
              variant={shown.destructive ? 'danger' : 'primary'}
              onPress={() => settle(shown.id, true)}
              style={styles.fill}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  head: { alignItems: 'center' },
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  buttons: { flexDirection: 'row' },
});
