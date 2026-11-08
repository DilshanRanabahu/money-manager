import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = { icon: IconName; title: string; hint?: string };

export function EmptyState({ icon, title, hint }: Props) {
  const { colors, spacing } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(320)} style={[styles.root, { paddingVertical: spacing.xxxl }]}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceMuted }]}>
        <Icon name={icon} size={26} color="textMuted" />
      </View>
      <Text variant="headline" align="center" style={{ marginTop: spacing.lg }}>
        {title}
      </Text>
      {hint && (
        <Text variant="caption" color="textMuted" align="center" style={{ marginTop: spacing.xs }}>
          {hint}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center' },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
