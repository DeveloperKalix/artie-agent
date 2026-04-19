import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { IntegrationsSettings } from '@/components/integrations/integrations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SettingsTab = 'general' | 'integrations';

const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: 'settings-outline' },
  { id: 'integrations', label: 'Integrations', icon: 'link-outline' },
];

// ---------------------------------------------------------------------------
// Tab bar — zero className props to avoid react-native-css-interop serializing
// the navigation context and throwing in its printUpgradeWarning debug path.
// ---------------------------------------------------------------------------

function TabBar({
  active,
  onChange,
}: {
  active: SettingsTab;
  onChange: (t: SettingsTab) => void;
}) {
  return (
    <View style={s.tabBar}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onChange(tab.id)}
            activeOpacity={0.8}
            style={[s.tabItem, isActive && s.tabItemActive]}>
            <Ionicons
              name={tab.icon as never}
              size={15}
              color={isActive ? '#0D7377' : '#94a3b8'}
            />
            <Text style={[s.tabLabel, isActive ? s.tabLabelActive : s.tabLabelInactive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// General tab
// ---------------------------------------------------------------------------

function GeneralSettings() {
  return (
    <View style={s.generalRoot}>
      <View style={s.generalIcon}>
        <Ionicons name="settings-outline" size={32} color="#475569" />
      </View>
      <Text style={s.generalText}>
        Configure your agent preferences and security settings here.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Modal screen
// ---------------------------------------------------------------------------

export default function ModalScreen() {
  const { tab } = useLocalSearchParams<{ tab?: SettingsTab }>();
  const initialTab = useRef<SettingsTab>(
    tab === 'integrations' ? 'integrations' : 'general',
  ).current;
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  return (
    <View style={s.root}>
      <TabBar active={activeTab} onChange={setActiveTab} />
      <View style={s.content}>
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'integrations' && <IntegrationsSettings />}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 24,
    marginTop: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#134e4a',
  },
  tabLabelInactive: {
    color: '#94a3b8',
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  generalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  generalIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#e2e8f0',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  generalText: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 14,
  },
});
