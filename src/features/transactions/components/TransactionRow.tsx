import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture, type PanGestureActiveEvent } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { CategoryIcon } from '@/features/categories';
import { amountForA11y, formatAmount } from '@/shared/lib/money';
import { spring } from '@/shared/motion/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import { signedAmount, type TransactionWithCategory } from '../domain/types';

type Props = {
  transaction: TransactionWithCategory;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
};

/** Drag further than this (or fling faster than VELOCITY) to delete. */
const THRESHOLD = 110;
const VELOCITY = 900;

/**
 * One list row, kept deliberately light so long lists scroll smoothly:
 * one pan gesture, one shared value, one animated style. No per-row press animation.
 * Swipe left to delete: the row slides out, then onDelete runs.
 */
function TransactionRowBase({ transaction: t, onPress, onDelete }: Props) {
  const { colors, spacing } = useTheme();
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const isIncome = t.type === 'income';
  const id = t.id;

  const remove = useCallback(() => onDelete(id), [onDelete, id]);

  const pan = usePanGesture(
    useMemo(
      () => ({
        // Horizontal drags only; any vertical movement hands the touch to the list scroll.
        activeOffsetX: [-14, 14] as [number, number],
        failOffsetY: [-10, 10] as [number, number],
        onUpdate: (e: PanGestureActiveEvent) => {
          'worklet';
          x.set(Math.min(0, e.translationX));
        },
        onDeactivate: (e: PanGestureActiveEvent) => {
          'worklet';
          if (x.get() < -THRESHOLD || e.velocityX < -VELOCITY) {
            x.set(withTiming(-width, { duration: 180 }, (done) => {
              if (done) scheduleOnRN(remove);
            }));
          } else {
            x.set(withSpring(0, spring.snappy));
          }
        },
      }),
      [width, remove, x],
    ),
  );

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View>
      {/* Static red area behind the row; only visible where the row has slid away. */}
      <View style={[StyleSheet.absoluteFill, styles.behind, { backgroundColor: colors.expense }]}>
        <Icon name="trash-outline" size={22} rawColor="#FFFFFF" />
      </View>
      <GestureDetector gesture={pan} touchAction="pan-y">
        <Animated.View style={slide}>
          <Pressable
            onPress={() => onPress(id)}
            accessibilityRole="button"
            accessibilityLabel={`${isIncome ? 'Income' : 'Expense'}, ${amountForA11y(t.amount)}, ${t.category.name}${t.note ? `, ${t.note}` : ''}`}
            accessibilityHint="Opens the entry. Swipe left to delete."
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: pressed ? colors.surface : colors.bg, paddingVertical: spacing.sm + 2 },
            ]}
          >
            <CategoryIcon category={t.category} />
            <View style={styles.middle}>
              <Text variant="body" numberOfLines={1} style={styles.name}>
                {t.category.name}
              </Text>
              {t.note ? (
                <Text variant="caption" color="textMuted" numberOfLines={1}>
                  {t.note}
                </Text>
              ) : null}
            </View>
            <Text variant="body" tabular color={isIncome ? 'income' : 'text'} style={styles.amount}>
              {formatAmount(signedAmount(t), { signed: true, bare: true })}
            </Text>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export const TransactionRow = memo(TransactionRowBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  middle: { flex: 1, minWidth: 0 },
  name: { fontWeight: '500' },
  amount: { fontWeight: '600' },
  behind: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: 32, borderRadius: 12 },
});
