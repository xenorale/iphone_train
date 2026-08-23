import { Tabs } from 'expo-router';

import { TabBar } from '@/components/tab-bar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="program" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
