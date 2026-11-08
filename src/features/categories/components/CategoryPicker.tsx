import { useEffect, useRef, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptics } from '@/shared/lib/haptics';
import { duration, spring } from '@/shared/motion/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { PressableScale } from '@/shared/ui/PressableScale';
import type { Category } from '../domain/types';

type Props = {
  categories: Category[];
  value: string | null;
  onChange: (id: string) => void;
};

/** Horizontal row of category chips. The selected chip fills with its color. */
export function CategoryPicker({ categories, value, onChange }: Props) {
  const { spacing } = useTheme();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const positions = useRef<Record<string, number>>({});

  // Keep the selected chip in view (e.g. when editing or switching type).
  useEffect(() => {
    if (!value) return;
    const t = setTimeout(() => {
      const x = positions.current[value];
      if (x !== undefined) scrollRef.current?.scrollTo({ x: Math.max(0, x - spacing.xl), animated: true });
    }, 50);
    return () => clearTimeout(t);
  }, [value, categories, spacing.xl]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
      keyboardShouldPersistTaps="handled"
    >
      {categories.map((c) => (
        <View key={c.id} onLayout={(e) => (positions.current[c.id] = e.nativeEvent.layout.x)}>
          <Chip
            category={c}
            selected={c.id === value}
            onPress={() => {
              haptics.select();
              onChange(c.id);
            }}
          />
        </View>
      ))}
    </ScrollView>
  );
}

function Chip({ category, selected, onPress }: { category: Category; selected: boolean; onPress: () => void }) {
  const { colors, radius, typography } = useTheme();
  const hue = colors.category[category.color] ?? colors.category.gray;

  const progress = useDerivedValue(() => withTiming(selected ? 1 : 0, { duration: duration.fast }));
  const pop = useDerivedValue(() =>
    selected ? withSequence(withSpring(1.06, spring.bouncy), withSpring(1, spring.snappy)) : withSpring(1, spring.snappy),
  );

  const chipStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.surfaceMuted, hue.bg]),
    borderColor: interpolateColor(progress.value, [0, 1], [colors.surfaceMuted, hue.fg]),
    transform: [{ scale: pop.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.textMuted, hue.fg]),
  }));

  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.94}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={category.name}
    >
      <Animated.View style={[styles.chip, { borderRadius: radius.full }, chipStyle]}>
        <Icon name={category.icon} size={16} rawColor={selected ? hue.fg : colors.textMuted} />
        <Animated.Text style={[typography.caption, styles.label, labelStyle]}>{category.name}</Animated.Text>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderWidth: 1.5,
  },
  label: { fontWeight: '600' },
});
