import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { haptics } from '@/shared/lib/haptics';
import { spring } from '@/shared/motion/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

const PAD = 3;

/** Toggle with an indicator that slides between options. */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors, radius } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segment = width > 0 ? (width - PAD * 2) / options.length : 0;

  const indicator = useAnimatedStyle(() => ({
    width: segment,
    transform: [{ translateX: withSpring(index * segment, spring.snappy) }],
  }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      accessibilityRole="tablist"
      style={[styles.root, { backgroundColor: colors.surfaceMuted, borderRadius: radius.md }]}
    >
      {segment > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            { backgroundColor: colors.surface, borderRadius: radius.md - 2 },
            indicator,
          ]}
        />
      )}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            pressedScale={0.95}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) {
                haptics.select();
                onChange(o.value);
              }
            }}
            style={styles.option}
          >
            <Text variant="caption" color={selected ? 'text' : 'textMuted'} style={styles.label}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', padding: PAD },
  indicator: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  option: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '600' },
});
