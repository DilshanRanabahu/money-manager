import { StyleSheet, View } from 'react-native';

import { addDays, formatDayLabel, todayISO, type ISODate } from '@/shared/lib/dates';
import { haptics } from '@/shared/lib/haptics';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Text } from '@/shared/ui/Text';

type Props = { value: ISODate; onChange: (date: ISODate) => void };

/** "‹ Today ›" — step the date one day at a time. Future dates are not allowed. */
export function DateStepper({ value, onChange }: Props) {
  const { colors, radius } = useTheme();
  const today = todayISO();
  const canGoForward = value < today;

  const step = (n: number) => {
    haptics.select();
    onChange(addDays(value, n));
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.surfaceMuted, borderRadius: radius.md }]}>
      <PressableScale onPress={() => step(-1)} accessibilityLabel="Previous day" style={styles.arrow}>
        <Icon name="chevron-back" size={18} color="textMuted" />
      </PressableScale>
      <PressableScale
        onPress={() => value !== today && (haptics.select(), onChange(today))}
        accessibilityLabel={`Date: ${formatDayLabel(value, today)}. Tap for today.`}
        style={styles.label}
      >
        <Icon name="calendar-outline" size={16} color="textMuted" />
        <Text variant="caption" style={styles.text}>
          {formatDayLabel(value, today)}
        </Text>
      </PressableScale>
      <PressableScale
        onPress={() => canGoForward && step(1)}
        disabled={!canGoForward}
        accessibilityLabel="Next day"
        style={[styles.arrow, !canGoForward && styles.disabled]}
      >
        <Icon name="chevron-forward" size={18} color="textMuted" />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', height: 44 },
  arrow: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44 },
  text: { fontWeight: '600' },
  disabled: { opacity: 0.3 },
});
