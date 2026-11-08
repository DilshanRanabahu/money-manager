import { memo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { CategoryIcon } from '@/features/categories';
import { amountForA11y, formatAmount } from '@/shared/lib/money';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Text } from '@/shared/ui/Text';
import { signedAmount, type TransactionWithCategory } from '../domain/types';

type Props = {
  transaction: TransactionWithCategory;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
};

const ACTION_WIDTH = 88;

function TransactionRowBase({ transaction: t, onPress, onDelete }: Props) {
  const { colors, spacing } = useTheme();
  const swipeRef = useRef<SwipeableMethods>(null);
  const isIncome = t.type === 'income';

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={1.6}
      rightThreshold={ACTION_WIDTH * 0.6}
      overshootRight={false}
      renderRightActions={(progress) => <DeleteAction progress={progress} />}
      onSwipeableOpen={() => onDelete(t.id)}
    >
      <PressableScale
        onPress={() => onPress(t.id)}
        pressedScale={0.985}
        accessibilityRole="button"
        accessibilityLabel={`${isIncome ? 'Income' : 'Expense'}, ${amountForA11y(t.amount)}, ${t.category.name}${t.note ? `, ${t.note}` : ''}`}
        accessibilityHint="Opens the entry. Swipe left to delete."
        style={[styles.row, { backgroundColor: colors.bg, paddingVertical: spacing.sm + 2 }]}
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
      </PressableScale>
    </ReanimatedSwipeable>
  );
}

function DeleteAction({ progress }: { progress: SharedValue<number> }) {
  const { colors } = useTheme();
  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.6, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1], 'clamp') }],
  }));
  return (
    <View style={[styles.action, { backgroundColor: colors.expense }]}>
      <Animated.View style={iconStyle}>
        <Icon name="trash-outline" size={22} rawColor="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

export const TransactionRow = memo(TransactionRowBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  middle: { flex: 1, minWidth: 0 },
  name: { fontWeight: '500' },
  amount: { fontWeight: '600' },
  action: { width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
});
