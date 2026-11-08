import { Easing, type WithSpringConfig } from 'react-native-reanimated';

export const duration = {
  instant: 100,
  fast: 150,
  base: 220,
  slow: 320,
  number: 450,
} as const;

export const spring = {
  /** buttons, chips, small UI */
  snappy: { damping: 20, stiffness: 300, mass: 0.8 },
  /** sheets, cards, list items */
  gentle: { damping: 22, stiffness: 180, mass: 1 },
  /** controlled bounce for success moments */
  bouncy: { damping: 14, stiffness: 220, mass: 0.9 },
} satisfies Record<string, WithSpringConfig>;

export const easing = {
  out: Easing.bezier(0.2, 0.8, 0.2, 1),
  inOut: Easing.bezier(0.4, 0, 0.2, 1),
};

export { useReducedMotion } from 'react-native-reanimated';
