import { Link, Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { usePalette } from '../../lib/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const p = usePalette();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: p.accent,
        headerRight: () => (
          <Link href="/settings" asChild>
            <Pressable accessibilityLabel="Baby profile" hitSlop={12} style={{ marginRight: 16 }}>
              <Text style={{ fontSize: 22 }}>⚙️</Text>
            </Pressable>
          </Link>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Today', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Calendar', tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} /> }}
      />
    </Tabs>
  );
}
