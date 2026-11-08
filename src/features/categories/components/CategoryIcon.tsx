import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';
import type { Category } from '../domain/types';

type Props = { category: Pick<Category, 'icon' | 'color'>; size?: number };

/** Category icon inside a soft colored circle. */
export function CategoryIcon({ category, size = 40 }: Props) {
  const { colors } = useTheme();
  const hue = colors.category[category.color] ?? colors.category.gray;
  return (
    <View style={[styles.root, { width: size, height: size, borderRadius: size / 2, backgroundColor: hue.bg }]}>
      <Icon name={category.icon} size={size * 0.5} rawColor={hue.fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
});
