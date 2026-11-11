import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { CategoryIcon, type TransactionType } from '@/features/categories';
import { formatAmount } from '@/shared/lib/money';
import { duration, easing, useReducedMotion } from '@/shared/motion/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import type { BreakdownRow as Row } from '../domain/computeSummary';
import type { Change } from '../domain/insights';
import { ChangeTag } from './ChangeTag';

const STAGGER_MS = 30;

type Props = {
  row: Row;
  index: number;
  type: TransactionType;
  /** Change vs last month; null hides it. */
  change?: Change | null;
  /** Open the category's entries. Omit for rows that can't be opened (carry-over). */
  onPress?: () => void;
  /** Highlighted because its slice is selected in the donut. */
  highlighted?: boolean;
};

/** Category · change vs last month · amount · percent, with a bar that grows into place. */
export function BreakdownRow({ row, index, type, change, onPress, highlighted }: Props) {
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
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${row.category.name}, ${formatAmount(row.amount)}, ${percent} percent`}
      accessibilityHint={onPress ? 'Shows the entries in this category' : undefined}
      style={({ pressed }) => [
        styles.root,
        { paddingVertical: spacing.sm + 2, gap: spacing.md, backgroundColor: pressed || highlighted ? colors.surface : 'transparent' },
      ]}
    >
      <CategoryIcon category={row.category} />
      <View style={styles.middle}>
        <View style={styles.line}>
          <View style={[styles.nameWrap, { gap: spacing.sm }]}>
            <Text variant="body" style={styles.name} numberOfLines={1}>
              {row.category.name}
            </Text>
            {change ? <ChangeTag change={change} type={type} /> : null}
          </View>
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
      {onPress ? <Icon name="chevron-forward" size={16} color="textFaint" /> : <View style={styles.chevronSpace} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', borderRadius: 12 },
  middle: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0, marginRight: 8 },
  name: { flexShrink: 1, fontWeight: '500' },
  amount: { fontWeight: '600' },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  percent: { width: 36, textAlign: 'right' },
  chevronSpace: { width: 16 },
});
