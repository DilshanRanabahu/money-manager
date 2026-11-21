import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Text } from '@/shared/ui/Text';

/** Back button + title, matching the chat header. */
export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
      <PressableScale onPress={() => router.back()} accessibilityLabel="Back" style={styles.icon} pressedScale={0.88}>
        <Icon name="chevron-back" size={24} />
      </PressableScale>
      <View style={styles.fill}>
        <Text variant="title" numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: -10, minHeight: 52 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
