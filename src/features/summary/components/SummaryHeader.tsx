import { StyleSheet, View } from 'react-native';

import { amountForA11y } from '@/shared/lib/money';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { AnimatedNumber } from '@/shared/ui/AnimatedNumber';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import type { MonthSummary } from '../domain/computeSummary';

/** Balance as the hero number, income and expense underneath. */
export function SummaryHeader({ summary }: { summary: MonthSummary }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ paddingTop: spacing.lg, paddingBottom: spacing.md }}>
      <Text variant="caption" color="textMuted">
        Balance
      </Text>
      <AnimatedNumber
        value={summary.balance}
        variant="display"
        color={summary.balance < 0 ? 'expense' : 'text'}
        accessibilityLabel={`Balance ${summary.balance < 0 ? 'minus ' : ''}${amountForA11y(summary.balance)}`}
        style={{ marginTop: spacing.xs }}
      />
      <View style={[styles.row, { marginTop: spacing.lg, gap: spacing.sm }]}>
        <Stat label="Income" value={summary.income} icon="arrow-down" tone="income" bg={colors.incomeSoft} radius={radius.md} />
        <Stat label="Expense" value={summary.expense} icon="arrow-up" tone="expense" bg={colors.expenseSoft} radius={radius.md} />
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
  bg,
  radius,
}: {
  label: string;
  value: number;
  icon: 'arrow-down' | 'arrow-up';
  tone: 'income' | 'expense';
  bg: string;
  radius: number;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface, borderRadius: radius, padding: spacing.md }]}>
      <View style={styles.statLabel}>
        <View style={[styles.dot, { backgroundColor: bg }]}>
          <Icon name={icon} size={12} color={tone} />
        </View>
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
      </View>
      <AnimatedNumber value={value} variant="headline" bare style={{ marginTop: spacing.xs }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  stat: { flex: 1 },
  statLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
