import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import type { Palette, TypographyVariant } from '@/shared/theme/tokens';

type ColorToken = Exclude<keyof Palette, 'category'>;

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: ColorToken;
  /** Use tabular digits so numbers do not jump. */
  tabular?: boolean;
  align?: TextStyle['textAlign'];
};

export function Text({ variant = 'body', color = 'text', tabular, align, style, ...rest }: TextProps) {
  const { colors, typography } = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        typography[variant],
        { color: colors[color], textAlign: align },
        tabular && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
