import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { formatAmount } from '@/shared/lib/money';
import { duration, easing, useReducedMotion } from '@/shared/motion/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/ui/Text';
import type { DonutSlice } from '../domain/donut';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 220;
const STROKE = 26;
const R = (SIZE - STROKE - 12) / 2;
const C = 2 * Math.PI * R;
/** Small gap between slices, in px along the ring. */
const GAP = 3;

type Props = {
  slices: DonutSlice[];
  /** Label + amount shown in the middle when nothing is selected. */
  centerLabel: string;
  total: number;
  /** Colour of the total in the middle. */
  tone: 'text' | 'income';
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

/**
 * Donut chart drawn with SVG arcs. Draws itself in on mount / data change.
 * Tap a slice to show its amount in the middle; tap again (or the middle) to go back.
 */
export function DonutChart({ slices, centerLabel, total, tone, selectedId, onSelect }: Props) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const dataKey = slices.map((s) => `${s.id}:${s.amount}`).join('|');

  useEffect(() => {
    if (reduceMotion) {
      progress.set(1);
      return;
    }
    progress.set(0);
    progress.set(withTiming(1, { duration: duration.slow + 380, easing: easing.out }));
  }, [dataKey, progress, reduceMotion]);

  const selected = slices.find((s) => s.id === selectedId) ?? null;

  // Find the slice under the finger from the angle around the centre.
  const onPress = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX - SIZE / 2;
    const y = e.nativeEvent.locationY - SIZE / 2;
    const dist = Math.hypot(x, y);
    if (dist < R - STROKE || dist > R + STROKE) {
      onSelect(null);
      return;
    }
    // 0 at 12 o'clock, clockwise, 0..1
    const turn = ((Math.atan2(y, x) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
    const hit = slices.find((s) => turn >= s.start && turn < s.start + s.share) ?? null;
    onSelect(hit && hit.id !== selectedId ? hit.id : null);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="image"
        accessibilityLabel={`${centerLabel} ${formatAmount(total)}. ${slices
          .map((s) => `${s.label} ${Math.round(s.share * 100)} percent`)
          .join(', ')}`}
      >
        <Svg width={SIZE} height={SIZE}>
          <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.surfaceMuted} strokeWidth={STROKE} fill="none" />
            {slices.map((s) => (
              <Arc
                key={s.id}
                slice={s}
                color={(colors.category[s.color] ?? colors.category.gray).fg}
                progress={progress}
                gap={slices.length > 1 ? GAP : 0}
                selected={selectedId === s.id}
                dimmed={selectedId !== null && selectedId !== s.id}
              />
            ))}
          </G>
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Text variant="caption" color="textMuted" numberOfLines={1} style={styles.centerText}>
            {selected ? selected.label : centerLabel}
          </Text>
          <Text variant="headline" tabular color={selected ? 'text' : tone} style={styles.amount} numberOfLines={1}>
            {formatAmount(selected ? selected.amount : total, { whole: true })}
          </Text>
          {selected && (
            <Text variant="caption" color="textMuted" tabular>
              {Math.round(selected.share * 100)}%
            </Text>
          )}
        </View>
      </Pressable>
    </View>
  );
}

function Arc({
  slice,
  color,
  progress,
  gap,
  selected,
  dimmed,
}: {
  slice: DonutSlice;
  color: string;
  progress: SharedValue<number>;
  gap: number;
  selected: boolean;
  dimmed: boolean;
}) {
  const startLen = slice.start * C;
  const fullLen = Math.max(slice.share * C - gap, 0.5);

  // Each arc grows as the shared progress sweeps past its start.
  const animatedProps = useAnimatedProps(() => {
    const drawn = Math.min(Math.max(progress.value * C - startLen, 0), fullLen);
    return { strokeDasharray: [drawn, C] };
  });

  return (
    <AnimatedCircle
      cx={SIZE / 2}
      cy={SIZE / 2}
      r={R}
      fill="none"
      stroke={color}
      strokeWidth={selected ? STROKE + 8 : STROKE}
      strokeOpacity={dimmed ? 0.35 : 1}
      strokeDashoffset={-startLen}
      animatedProps={animatedProps}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 44 },
  centerText: { textAlign: 'center' },
  amount: { marginTop: 2 },
});
