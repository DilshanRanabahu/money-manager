import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { TransactionWithCategory } from '@/features/transactions';
import { formatDayLabel, type ISODate } from '@/shared/lib/dates';
import { amountForA11y, formatAmount } from '@/shared/lib/money';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/ui/Text';

type Props = {
  transaction: TransactionWithCategory;
  today: ISODate;
  /** Share of the category total, 0..1 */
  share: number;
  onPress: (id: string) => void;
};

/** One entry inside a category: note (or date) as the title, date and share underneath. */
function CategoryEntryRowBase({ transaction: t, today, share, onPress }: Props) {
  const { colors, spacing } = useTheme();
  const day = formatDayLabel(t.occurredOn, today);
  const isIncome = t.type === 'income';
  return (
    <Pressable
      onPress={() => onPress(t.id)}
      accessibilityRole="button"
      accessibilityLabel={`${t.note ?? 'No note'}, ${day}, ${amountForA11y(t.amount)}`}
      accessibilityHint="Opens the entry"
      style={({ pressed }) => [
        styles.row,
        { paddingVertical: spacing.md, backgroundColor: pressed ? colors.surface : 'transparent' },
      ]}
    >
      <View style={styles.middle}>
        <Text variant="body" numberOfLines={1} style={styles.title} color={t.note ? 'text' : 'textMuted'}>
          {t.note ?? 'No note'}
        </Text>
        <Text variant="caption" color="textMuted">
          {day} · {Math.round(share * 100)}%
        </Text>
      </View>
      <Text variant="body" tabular color={isIncome ? 'income' : 'text'} style={styles.amount}>
        {formatAmount(isIncome ? t.amount : -t.amount, { signed: true, bare: true })}
      </Text>
    </Pressable>
  );
}

export const CategoryEntryRow = memo(CategoryEntryRowBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12 },
  middle: { flex: 1, minWidth: 0 },
  title: { fontWeight: '500' },
  amount: { fontWeight: '600' },
});
