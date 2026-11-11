import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { addDays, addMonths, formatMonth, monthGrid, monthOf, type ISODate } from '@/shared/lib/dates';
import { haptics } from '@/shared/lib/haptics';
import { useUiStore } from '@/shared/store/uiStore';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Text } from '@/shared/ui/Text';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type Props = { value: ISODate; onPick: (date: ISODate) => void };

/** Small month calendar for picking an entry's date. Opens on the selected date's month. */
export function MiniCalendar({ value, onPick }: Props) {
  const { colors, spacing, radius } = useTheme();
  const today = useUiStore((s) => s.today);
  const [month, setMonth] = useState(monthOf(value));
  const canGoNext = month < monthOf(today);

  const pick = (date: ISODate) => {
    haptics.select();
    onPick(date);
  };

  return (
    <Animated.View entering={FadeIn.duration(160)} style={{ gap: spacing.sm }}>
      <View style={[styles.quick, { gap: spacing.sm }]}>
        {[
          { label: 'Today', date: today },
          { label: 'Yesterday', date: addDays(today, -1) },
        ].map((q) => (
          <PressableScale
            key={q.label}
            onPress={() => pick(q.date)}
            style={[
              styles.quickBtn,
              { borderRadius: radius.full, backgroundColor: value === q.date ? colors.accent : colors.surfaceMuted },
            ]}
          >
            <Text variant="caption" color={value === q.date ? 'onAccent' : 'text'} style={styles.bold}>
              {q.label}
            </Text>
          </PressableScale>
        ))}
      </View>

      <View style={styles.header}>
        <PressableScale onPress={() => setMonth(addMonths(month, -1))} accessibilityLabel="Previous month" style={styles.arrow}>
          <Icon name="chevron-back" size={18} color="textMuted" />
        </PressableScale>
        <Text variant="body" style={styles.bold}>
          {formatMonth(month)}
        </Text>
        <PressableScale
          onPress={() => canGoNext && setMonth(addMonths(month, 1))}
          disabled={!canGoNext}
          accessibilityLabel="Next month"
          style={[styles.arrow, !canGoNext && styles.faded]}
        >
          <Icon name="chevron-forward" size={18} color="textMuted" />
        </PressableScale>
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} variant="micro" color="textFaint" style={styles.cellText}>
            {d}
          </Text>
        ))}
      </View>

      {monthGrid(month).map((week, wi) => (
        <View key={wi} style={styles.week}>
          {week.map((date, di) => {
            if (!date) return <View key={di} style={styles.cell} />;
            const future = date > today;
            const selected = date === value;
            const isToday = date === today;
            return (
              <Pressable
                key={di}
                onPress={() => !future && pick(date)}
                disabled={future}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: future }}
                accessibilityLabel={date}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.day,
                    { borderRadius: radius.full },
                    selected && { backgroundColor: colors.accent },
                    !selected && isToday && { borderWidth: 1.5, borderColor: colors.textMuted },
                  ]}
                >
                  <Text
                    variant="body"
                    tabular
                    color={selected ? 'onAccent' : future ? 'textFaint' : 'text'}
                    style={selected || isToday ? styles.bold : undefined}
                  >
                    {Number(date.slice(8))}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  quick: { flexDirection: 'row', justifyContent: 'center' },
  quickBtn: { paddingHorizontal: 18, paddingVertical: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
  faded: { opacity: 0.3 },
  week: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40 },
  cellText: { flex: 1, textAlign: 'center' },
  day: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  bold: { fontWeight: '600' },
});
