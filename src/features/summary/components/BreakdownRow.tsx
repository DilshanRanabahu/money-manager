import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { CategoryIcon } from '@/features/categories';
import { formatAmount } from '@/shared/lib/money';
import { duration, easing, useReducedMotion } from '@/shared/motion/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/ui/Text';
import type { BreakdownRow as Row } from '../domain/computeSummary';

const STAGGER_MS = 30;

/** Category · amount · percent, with a bar that grows into place. */
export function BreakdownRow({ row, index }: { row: Row; index: number }) {
  const { colors, spacing } = useTheme();
  const reduceMotion = useReducedMotion();
  const hue = colors.category[row.category.color] ?? colors.category.gray;
  const width = useSharedValue(0);

  useEffect(() => {
    width.set(reduceMotion
      ? row.share
      : withDelay(index * STAGGER_MS, withTiming(row.share, { duration: duration.slow + 180, easing: easing.out })));
  }, [row.share, index, width, reduceMotion]);

  const barStyle = useAnimatedStyle(() => ({ width: `${Math.max(width.value * 100, 1.5)}%` }));
  const percent = Math.round(row.share * 100);

  return (
    <View
      style={[styles.root, { paddingVertical: spacing.sm + 2, gap: spacing.md }]}
      accessible
      accessibilityLabel={`${row.category.name}, ${formatAmount(row.amount)}, ${percent} percent`}
    >
      <CategoryIcon category={row.category} />
      <View style={styles.middle}>
        <View style={styles.line}>
          <Text variant="body" style={styles.name} numberOfLines={1}>
            {row.category.name}
          </Text>
          <Text variant="body" tabular style={styles.amount}>
            {formatAmount(row.amount, { bare: true })}
          </Text>
        </View>
        <View style={[styles.line, { marginTop: 6, gap: spacing.sm }]}>
          <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
            <Animated.View style={[styles.bar, { backgroundColor: hue.fg }, barStyle]} />
          </View>
          <Text variant="caption" color="textMuted" tabular style={styles.percent}>
            {percent}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center' },
  middle: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { flex: 1, fontWeight: '500' },
  amount: { fontWeight: '600' },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  percent: { width: 36, textAlign: 'right' },
});
