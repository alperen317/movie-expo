import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';

import { FloatingTabBar } from '../../../components/navigation/FloatingTabBar';

export default function TabsLayout() {
  return (
    <Tabs className="flex-1">
      <TabSlot />
      <FloatingTabBar />
      <TabList style={{ display: 'none' }}>
        <TabTrigger name="index" href="/" />
        <TabTrigger name="search" href="/search" />
        <TabTrigger name="favorites" href="/favorites" />
        <TabTrigger name="profile" href="/profile" />
      </TabList>
    </Tabs>
  );
}
