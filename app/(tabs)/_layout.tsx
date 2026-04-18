import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { AgentTabButton } from '@/components/tab-bar/agent-tab-button';
import { ProfileTabIcon } from '@/components/tab-bar/profile-tab-icon';
import { Colors } from '@/constants/theme';
import { tabTransitionScreenOptions } from '@/styles/animations/transition';

/** Light tab bar only — keeps navbar distinct from content (matches home card: border + soft shadow). */
const light = Colors.light;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 14) + 10;
  const tabBarHeight = 52 + bottomPad + 8;

  return (
    <Tabs
      screenOptions={{
        ...tabTransitionScreenOptions,
        tabBarActiveTintColor: light.tint,
        tabBarInactiveTintColor: light.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: light.background,
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingTop: 8,
          paddingBottom: bottomPad,
          height: tabBarHeight,
          ...Platform.select({
            ios: {
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            },
            android: {
              elevation: 6,
            },
            default: {},
          }),
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="foresight"
        options={{
          title: 'Foresight',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'trending-up' : 'trending-up-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          title: 'Agent',
          tabBarIcon: () => null,
          tabBarLabel: () => null,
          tabBarButton: (props) => <AgentTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'reader' : 'reader-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <ProfileTabIcon focused={focused} />,
        }}
      />
    </Tabs>
  );
}
