import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Single place to call haptics, so they can be turned off or no-op on web.
 * Turned OFF: the owner does not want the phone to vibrate on touch.
 * Set HAPTICS_ON to true to bring vibration back everywhere.
 */
const HAPTICS_ON = false;
let enabled = HAPTICS_ON && Platform.OS !== 'web';

export function setHapticsEnabled(value: boolean) {
  enabled = value && Platform.OS !== 'web';
}

const safe = (fn: () => Promise<void>) => {
  if (!enabled) return;
  fn().catch(() => {});
};

export const haptics = {
  select: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  impact: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
};
