import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/features/categories';
import { amountForA11y, formatAmount } from '@/shared/lib/money';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/ui/Text';
import { carryCategory } from '../domain/computeSummary';

type Props = {
  /** Signed carry-over in minor units. */
  amount: number;
  /** e.g. "From October" */
  label: string;
};

/**
 * The carry-over shown as the first entry of the month. It is computed from earlier months,
 * so it cannot be edited or deleted; change the old entries instead.
 */
function CarryRowBase({ amount, label }: Props) {
  const { spacing } = useTheme();
  const positive = amount >= 0;
  const category = carryCategory(positive ? 'income' : 'expense', label);
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${positive ? 'left over' : 'overspent'} ${amountForA11y(amount)}. Calculated automatically.`}
      style={[styles.row, { paddingVertical: spacing.sm + 2 }]}
    >
      <CategoryIcon category={category} />
      <View style={styles.middle}>
        <Text variant="body" numberOfLines={1} style={styles.name}>
          {label}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {positive ? 'Left over · added automatically' : 'Overspent · added automatically'}
        </Text>
      </View>
      <Text variant="body" tabular color={positive ? 'income' : 'expense'} style={styles.amount}>
        {formatAmount(amount, { signed: true, bare: true })}
      </Text>
    </View>
  );
}

export const CarryRow = memo(CarryRowBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  middle: { flex: 1, minWidth: 0 },
  name: { fontWeight: '500' },
  amount: { fontWeight: '600' },
});
