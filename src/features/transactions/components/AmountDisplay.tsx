import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CURRENCY_SYMBOL } from '@/shared/lib/money';
import { duration, spring, useReducedMotion } from '@/shared/motion/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { TransactionType } from '../domain/types';
import { formatInput } from '../domain/amountInput';

type Props = {
  raw: string;
  type: TransactionType;
  /** Increment to play the "invalid key" shake. */
  shakeKey: number;
};

/** The big amount at the top of the form. Pops on each digit, shakes on invalid keys. */
export function AmountDisplay({ raw, type, shakeKey }: Props) {
  const { colors, typography } = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);
  const prevLength = useRef(raw.length);

  useEffect(() => {
    if (raw.length > prevLength.current && !reduceMotion) {
      scale.set(withSequence(withTiming(1.04, { duration: 60 }), withSpring(1, spring.bouncy)));
    }
    prevLength.current = raw.length;
  }, [raw, scale, reduceMotion]);

  useEffect(() => {
    if (shakeKey === 0 || reduceMotion) return;
    shake.set(withSequence(
      withTiming(-8, { duration: 40 }),
      withTiming(8, { duration: 60 }),
      withTiming(-5, { duration: 60 }),
      withTiming(0, { duration: 50 }),
    ));
  }, [shakeKey, shake, reduceMotion]);

  const tone = useDerivedValue(() => withTiming(type === 'income' ? 1 : 0, { duration: duration.base }));
  const empty = raw === '';

  const style = useAnimatedStyle(() => ({
    color: empty ? colors.textFaint : interpolateColor(tone.value, [0, 1], [colors.text, colors.income]),
    transform: [{ translateX: shake.value }, { scale: scale.value }],
  }));

  return (
    <Animated.Text
      accessibilityRole="text"
      accessibilityLabel={`Amount ${formatInput(raw)} rupees`}
      adjustsFontSizeToFit
      numberOfLines={1}
      style={[typography.display, styles.text, style]}
    >
      <Animated.Text style={[typography.title, styles.symbol]}>{CURRENCY_SYMBOL} </Animated.Text>
      {formatInput(raw)}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: { textAlign: 'center', fontVariant: ['tabular-nums'] },
  symbol: { fontWeight: '500' },
});
