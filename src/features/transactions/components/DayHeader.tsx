import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatDayLabel, type ISODate } from '@/shared/lib/dates';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { AnimatedNumber } from '@/shared/ui/AnimatedNumber';
import { Text } from '@/shared/ui/Text';

type Props = { date: ISODate; net: number; today: ISODate };

function DayHeaderBase({ date, net, today }: Props) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: spacing.lg, paddingBottom: spacing.xs }]}>
      <Text variant="micro" color="textMuted">
        {formatDayLabel(date, today)}
      </Text>
      <AnimatedNumber value={net} variant="micro" color="textMuted" signed bare />
    </View>
  );
}

export const DayHeader = memo(DayHeaderBase);

const styles = StyleSheet.create({
  root: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
