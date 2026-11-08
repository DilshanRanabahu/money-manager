import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/shared/lib/haptics';
import { duration, spring } from '@/shared/motion/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

const ICONS: Record<string, { on: IconName; off: IconName }> = {
  index: { on: 'home', off: 'home-outline' },
  breakdown: { on: 'pie-chart', off: 'pie-chart-outline' },
};

/** Minimal tab bar: two tabs with the add button in the middle. */
export function TabBar({ state, navigateToTab, descriptors }: BottomTabBarProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const tabs = state.routes.map((route, index) => {
    const focused = state.index === index;
    const label = descriptors[route.key]?.options.title ?? route.name;
    return (
      <TabItem
        key={route.key}
        label={label}
        icon={ICONS[route.name] ?? { on: 'ellipse', off: 'ellipse-outline' }}
        focused={focused}
        onPress={() => {
          if (!focused) {
            haptics.select();
            navigateToTab(route.key);
          }
        }}
      />
    );
  });

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.bg,
          borderTopColor: colors.divider,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
      ]}
    >
      {tabs[0]}
      <AddButton />
      {tabs.slice(1)}
    </View>
  );
}

function TabItem({
  label,
  icon,
  focused,
  onPress,
}: {
  label: string;
  icon: { on: IconName; off: IconName };
  focused: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const dot = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0, { duration: duration.fast }),
    transform: [{ scale: withSpring(focused ? 1 : 0.2, spring.snappy) }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(focused ? -2 : 0, spring.snappy) }],
  }));

  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.9}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={styles.tab}
    >
      <Animated.View style={iconStyle}>
        <Icon name={focused ? icon.on : icon.off} size={22} color={focused ? 'text' : 'textFaint'} />
      </Animated.View>
      <Text variant="micro" color={focused ? 'text' : 'textFaint'} style={styles.label}>
        {label}
      </Text>
      <Animated.View style={[styles.dot, { backgroundColor: colors.text }, dot]} />
    </PressableScale>
  );
}

function AddButton() {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={() => {
        haptics.light();
        router.push('/transaction/new');
      }}
      pressedScale={0.9}
      accessibilityRole="button"
      accessibilityLabel="Add entry"
      style={[styles.add, { backgroundColor: colors.accent }]}
    >
      <Icon name="add" size={30} color="onAccent" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 52 },
  label: { marginTop: 2, textTransform: 'none', letterSpacing: 0.2 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  add: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
