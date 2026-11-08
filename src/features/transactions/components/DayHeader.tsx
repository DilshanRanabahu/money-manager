import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatDayLabel, type ISODate } from '@/shared/lib/dates';
import { formatAmount } from '@/shared/lib/money';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/ui/Text';

type Props = { date: ISODate; net: number; today: ISODate };

/** Plain text on purpose: a month can have 30+ headers, animated numbers here were costly. */
function DayHeaderBase({ date, net, today }: Props) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: spacing.lg, paddingBottom: spacing.xs }]}>
      <Text variant="micro" color="textMuted">
        {formatDayLabel(date, today)}
      </Text>
      <Text variant="micro" color="textMuted" tabular>
        {formatAmount(net, { signed: true, bare: true })}
      </Text>
    </View>
  );
}

export const DayHeader = memo(DayHeaderBase);

const styles = StyleSheet.create({
  root: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
