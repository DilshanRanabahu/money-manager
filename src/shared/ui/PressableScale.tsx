import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '@/shared/lib/haptics';
import { spring } from '@/shared/motion/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Scale when pressed (default 0.97). */
  pressedScale?: number;
  haptic?: 'select' | 'light' | 'none';
};

/** Pressable that gently scales down while pressed. */
export function PressableScale({
  style,
  pressedScale = 0.97,
  haptic = 'none',
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        scale.set(withSpring(pressedScale, spring.snappy));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, spring.snappy));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic === 'select') haptics.select();
        if (haptic === 'light') haptics.light();
        onPress?.(e);
      }}
      style={[style, animatedStyle]}
    />
  );
}
