import { StyleSheet, View } from 'react-native';

import { addMonths, daysInMonth, monthName, monthShortName, type MonthKey } from '@/shared/lib/dates';
import { formatAmount } from '@/shared/lib/money';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import type { Pace } from '../domain/insights';

type Props = {
  month: MonthKey;
  pace: Pace;
  /** Money available this month (income incl. carry-over). */
  available: number;
};

/** Daily spending average and, for the current month, where the month is heading. */
export function PaceCard({ month, pace, available }: Props) {
  const { colors, radius, spacing } = useTheme();
  const isCurrent = pace.projected !== null;

  let outlook: { text: string; tone: 'income' | 'expense' } | null = null;
  if (isCurrent && available > 0 && pace.projected !== null) {
    const left = available - pace.projected;
    outlook =
      left >= 0
        ? { text: `Leaves about ${formatAmount(left, { whole: true })} at month end`, tone: 'income' }
        : { text: `${formatAmount(-left, { whole: true })} more than you have this month`, tone: 'expense' };
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md }]}>
      <View style={styles.line}>
        <View style={styles.flex}>
          <Text variant="caption" color="textMuted">
            {isCurrent ? `Per day so far (${pace.daysElapsed} days)` : 'Average per day'}
          </Text>
          <Text variant="headline" tabular style={{ marginTop: 2 }}>
            {formatAmount(pace.perDay, { whole: true })}
          </Text>
        </View>
        <Icon name="speedometer-outline" size={22} color="textMuted" />
      </View>

      {pace.projected !== null && (
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
      )}

      {pace.projected !== null && (
        <View>
          <Text variant="caption" color="textMuted">
            {pace.basis === 'last-month'
              ? `If the rest of ${monthName(month)} goes like ${monthName(addMonths(month, -1))}`
              : 'At this pace'}
          </Text>
          <Text variant="headline" tabular style={{ marginTop: 2 }}>
            ~{formatAmount(pace.projected, { whole: true })} by {daysInMonth(month)} {monthShortName(month)}
          </Text>
          {outlook && (
            <View style={[styles.line, { marginTop: spacing.xs, gap: 4, justifyContent: 'flex-start' }]}>
              <Icon
                name={outlook.tone === 'income' ? 'checkmark-circle-outline' : 'warning-outline'}
                size={14}
                color={outlook.tone}
              />
              <Text variant="caption" color={outlook.tone}>
                {outlook.text}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth },
});
