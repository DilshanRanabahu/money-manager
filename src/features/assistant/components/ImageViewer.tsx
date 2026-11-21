import { Image, Modal, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { duration, useReducedMotion } from '@/shared/motion/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon } from '@/shared/ui/Icon';

/** Full-screen photo. Tap anywhere (or back) to close. */
export function ImageViewer({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  return (
    <Modal visible={uri !== null} transparent statusBarTranslucent onRequestClose={onClose}>
      {uri && (
        <Animated.View entering={FadeIn.duration(duration.fast)} style={[styles.fill, { backgroundColor: colors.photoBackdrop }]}>
          <Pressable onPress={onClose} accessibilityLabel="Close photo" style={styles.fill}>
            <Animated.View
              entering={reduced ? undefined : ZoomIn.duration(duration.base)}
              style={[styles.fill, { marginTop: insets.top + spacing.xxxl, marginBottom: insets.bottom + spacing.xl }]}
            >
              <Image source={{ uri }} style={styles.fill} resizeMode="contain" />
            </Animated.View>
            <Animated.View style={[styles.close, { top: insets.top + spacing.sm, right: spacing.lg }]}>
              <Icon name="close" size={26} color="onPhoto" />
            </Animated.View>
          </Pressable>
        </Animated.View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  close: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
