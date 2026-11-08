import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useTheme } from '@/shared/theme/ThemeProvider';
import type { Palette } from '@/shared/theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  name: IconName;
  size?: number;
  color?: Exclude<keyof Palette, 'category'>;
  /** Raw color; overrides `color`. */
  rawColor?: string;
};

/** The one icon set used in the app (Ionicons, outline style). */
export function Icon({ name, size = 22, color = 'text', rawColor }: Props) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={rawColor ?? colors[color]} />;
}
