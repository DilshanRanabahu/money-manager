import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOutDown, LinearTransition, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spring } from '@/shared/motion/tokens';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

const AUTO_HIDE_MS = 5000;

/** Renders the single global toast from uiStore. Mount once at the root. */
export function ToastHost() {
  const toast = useUiStore((s) => s.toast);
  const hideToast = useUiStore((s) => s.hideToast);
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => hideToast(toast.id), AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [toast, hideToast]);

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.wrap, { paddingBottom: insets.bottom + 72 }]}>
      {toast && (
        <Animated.View
          key={toast.id}
          entering={SlideInDown.springify().damping(spring.gentle.damping).stiffness(spring.gentle.stiffness)}
          exiting={FadeOutDown.duration(180)}
          layout={LinearTransition}
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            { backgroundColor: colors.accent, borderRadius: radius.md, marginHorizontal: spacing.lg },
          ]}
        >
          <Text variant="body" color="onAccent" style={styles.message} numberOfLines={2}>
            {toast.message}
          </Text>
          {toast.actionLabel && (
            <PressableScale
              haptic="light"
              accessibilityRole="button"
              onPress={() => {
                toast.onAction?.();
                hideToast(toast.id);
              }}
              style={styles.action}
            >
              <Text variant="headline" color="onAccent">
                {toast.actionLabel}
              </Text>
            </PressableScale>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'flex-end' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 6,
    minHeight: 52,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  message: { flex: 1, paddingVertical: 12 },
  action: { paddingHorizontal: 14, paddingVertical: 12 },
});
