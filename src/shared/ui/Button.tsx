import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { duration } from '@/shared/motion/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { touchTarget } from '@/shared/theme/tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
};

export function Button({ label, onPress, variant = 'primary', disabled, style, accessibilityHint }: Props) {
  const { colors, radius, spacing } = useTheme();

  const bg =
    variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.surfaceMuted : 'transparent';
  const fg = variant === 'primary' ? 'onAccent' : 'text';

  const fade = useAnimatedStyle(() => ({
    opacity: withTiming(disabled ? 0.35 : 1, { duration: duration.fast }),
  }));

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      style={[styles.base, { backgroundColor: bg, borderRadius: radius.md, paddingHorizontal: spacing.xl }, style]}
    >
      <Animated.View style={fade}>
        <Text variant="headline" color={fg}>
          {label}
        </Text>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
