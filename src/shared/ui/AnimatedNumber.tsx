import { useEffect } from 'react';
import { StyleSheet, TextInput, type TextStyle } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

import { formatAmount } from '@/shared/lib/money';
import { duration, easing, useReducedMotion } from '@/shared/motion/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { Palette, TypographyVariant } from '@/shared/theme/tokens';

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Props = {
  /** Value in minor units. */
  value: number;
  variant?: TypographyVariant;
  color?: Exclude<keyof Palette, 'category'>;
  signed?: boolean;
  bare?: boolean;
  style?: TextStyle;
  accessibilityLabel?: string;
};

/**
 * Money value that rolls smoothly from its previous value to the new one.
 * Runs on the UI thread by animating the `text` prop of a read-only TextInput.
 */
export function AnimatedNumber({ value, variant = 'body', color = 'text', signed, bare, style, accessibilityLabel }: Props) {
  const { colors, typography } = useTheme();
  const reduceMotion = useReducedMotion();
  const animated = useSharedValue(value);

  useEffect(() => {
    animated.set(reduceMotion ? value : withTiming(value, { duration: duration.number, easing: easing.out }));
  }, [value, reduceMotion, animated]);

  const animatedProps = useAnimatedProps(() => {
    const text = formatAmount(Math.round(animated.value), { signed, bare });
    return { text, defaultValue: text } as object;
  });

  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      pointerEvents="none"
      accessibilityLabel={accessibilityLabel}
      defaultValue={formatAmount(value, { signed, bare })}
      animatedProps={animatedProps}
      style={[
        typography[variant],
        styles.input,
        { color: colors[color], fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: { padding: 0, margin: 0, includeFontPadding: false },
});
