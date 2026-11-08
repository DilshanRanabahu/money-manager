import type { TextStyle } from 'react-native';

export type ColorScheme = 'light' | 'dark';

export const categoryHues = ['orange', 'blue', 'green', 'purple', 'pink', 'teal', 'yellow', 'gray'] as const;
export type CategoryHue = (typeof categoryHues)[number];

type CategoryColor = { bg: string; fg: string };

export type Palette = {
  bg: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  textFaint: string;
  divider: string;
  accent: string;
  onAccent: string;
  income: string;
  expense: string;
  incomeSoft: string;
  expenseSoft: string;
  backdrop: string;
  category: Record<CategoryHue, CategoryColor>;
};

const light: Palette = {
  bg: '#F7F7F5',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEFEC',
  text: '#111113',
  textMuted: '#6B6B70',
  textFaint: '#A3A3A8',
  divider: '#E6E6E2',
  accent: '#111113',
  onAccent: '#FFFFFF',
  income: '#16A34A',
  expense: '#E5484D',
  incomeSoft: '#E3F5E9',
  expenseSoft: '#FCE8E8',
  backdrop: 'rgba(0,0,0,0.3)',
  category: {
    orange: { bg: '#FDEBDD', fg: '#C2581C' },
    blue: { bg: '#E1ECFD', fg: '#2B63C8' },
    green: { bg: '#E0F3E6', fg: '#1F7A43' },
    purple: { bg: '#EDE6FB', fg: '#6741C4' },
    pink: { bg: '#FBE4EF', fg: '#B83A78' },
    teal: { bg: '#DDF2F1', fg: '#16797A' },
    yellow: { bg: '#FBF1D3', fg: '#93690B' },
    gray: { bg: '#ECECEA', fg: '#5B5B60' },
  },
};

const dark: Palette = {
  bg: '#0E0E10',
  surface: '#18181B',
  surfaceMuted: '#232327',
  text: '#F4F4F5',
  textMuted: '#A1A1AA',
  textFaint: '#5E5E66',
  divider: '#2A2A2F',
  accent: '#F4F4F5',
  onAccent: '#0E0E10',
  income: '#4ADE80',
  expense: '#FF6B6F',
  incomeSoft: '#13291B',
  expenseSoft: '#33181A',
  backdrop: 'rgba(0,0,0,0.6)',
  category: {
    orange: { bg: '#3A2416', fg: '#F7A26B' },
    blue: { bg: '#172438', fg: '#7FAEF5' },
    green: { bg: '#15291C', fg: '#6FD394' },
    purple: { bg: '#251C3A', fg: '#B49BF4' },
    pink: { bg: '#36192A', fg: '#F28BBE' },
    teal: { bg: '#142C2C', fg: '#62CFCC' },
    yellow: { bg: '#332A12', fg: '#E8C25A' },
    gray: { bg: '#262629', fg: '#B4B4BA' },
  },
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 20, full: 999 } as const;

export const typography = {
  display: { fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -1 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.3 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export const touchTarget = 44;
