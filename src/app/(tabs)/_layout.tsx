import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/shared/ui/TabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="breakdown" options={{ title: 'Breakdown' }} />
    </Tabs>
  );
}
