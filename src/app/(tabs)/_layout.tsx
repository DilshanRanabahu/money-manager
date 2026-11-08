import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/shared/ui/TabBar';

export default function TabsLayout() {
  return (
    // freezeOnBlur: the hidden tab does not re-render when the month changes.
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, freezeOnBlur: true }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="breakdown" options={{ title: 'Breakdown' }} />
    </Tabs>
  );
}
