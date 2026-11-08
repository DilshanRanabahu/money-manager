import { StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';

import { currentMonth, formatMonth } from '@/shared/lib/dates';
import { haptics } from '@/shared/lib/haptics';
import { useUiStore } from '@/shared/store/uiStore';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/** "‹ November 2026 ›" bound to the shared selected month. Tap the title to jump to now. */
export function MonthSwitcher() {
  const month = useUiStore((s) => s.month);
  const direction = useUiStore((s) => s.monthDirection);
  const shiftMonth = useUiStore((s) => s.shiftMonth);
  const goToCurrentMonth = useUiStore((s) => s.goToCurrentMonth);
  const isCurrent = month === currentMonth();

  const shift = (n: 1 | -1) => {
    haptics.select();
    shiftMonth(n);
  };

  return (
    <View style={styles.root}>
      <PressableScale onPress={() => shift(-1)} accessibilityLabel="Previous month" style={styles.arrow} pressedScale={0.88}>
        <Icon name="chevron-back" size={20} color="textMuted" />
      </PressableScale>
      <PressableScale
        onPress={() => !isCurrent && (haptics.select(), goToCurrentMonth())}
        accessibilityLabel={`${formatMonth(month)}${isCurrent ? '' : '. Tap to go to this month.'}`}
        style={styles.title}
      >
        <Animated.View key={month} entering={(direction > 0 ? FadeInRight : FadeInLeft).duration(220)}>
          <Text variant="headline">{formatMonth(month)}</Text>
        </Animated.View>
      </PressableScale>
      <PressableScale onPress={() => shift(1)} accessibilityLabel="Next month" style={styles.arrow} pressedScale={0.88}>
        <Icon name="chevron-forward" size={20} color="textMuted" />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center' },
  arrow: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { minWidth: 150, height: 44, alignItems: 'center', justifyContent: 'center' },
});
