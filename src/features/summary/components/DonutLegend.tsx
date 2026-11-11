import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/ui/Text';
import type { DonutSlice } from '../domain/donut';

type Props = {
  slices: DonutSlice[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

/** "● Bills 25%" chips under the donut, so every colour has a name. Tap to select. */
export function DonutLegend({ slices, selectedId, onSelect }: Props) {
  const { colors, spacing, radius } = useTheme();
  if (slices.length === 0) return null;

  return (
    <View style={[styles.wrap, { gap: spacing.sm, marginTop: spacing.lg }]}>
      {slices.map((s) => {
        const selected = s.id === selectedId;
        const dimmed = selectedId !== null && !selected;
        const color = (colors.category[s.color] ?? colors.category.gray).fg;
        return (
          <Pressable
            key={s.id}
            onPress={() => onSelect(selected ? null : s.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${s.label}, ${Math.round(s.share * 100)} percent`}
            style={[
              styles.chip,
              {
                borderRadius: radius.full,
                backgroundColor: selected ? colors.surfaceMuted : colors.surface,
                opacity: dimmed ? 0.45 : 1,
              },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text variant="caption" numberOfLines={1} style={styles.label}>
              {s.label}
            </Text>
            <Text variant="caption" color="textMuted" tabular>
              {Math.round(s.share * 100)}%
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontWeight: '600', maxWidth: 140 },
});
