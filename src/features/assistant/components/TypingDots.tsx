import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { duration, easing, useReducedMotion } from '@/shared/motion/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/ui/Text';

/** "• • •" while Claude is working, with what it is doing when known. */
export function TypingDots({ label }: { label?: string }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={[styles.row, { gap: spacing.sm }]} accessibilityLabel={label || 'Thinking'}>
      <View style={[styles.bubble, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
        {[0, 1, 2].map((i) => (
          <Dot key={i} index={i} color={colors.textMuted} />
        ))}
      </View>
      {label ? (
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

function Dot({ index, color }: { index: number; color: string }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    t.set(
      withDelay(
        index * duration.fast,
        withRepeat(
          withSequence(
            withTiming(1, { duration: duration.slow, easing: easing.inOut }),
            withTiming(0, { duration: duration.slow, easing: easing.inOut }),
          ),
          -1,
        ),
      ),
    );
  }, [index, reduced, t]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + t.get() * 0.65,
    transform: [{ translateY: -3 * t.get() }],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  bubble: { flexDirection: 'row', gap: 5, paddingHorizontal: 14, paddingVertical: 14 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
