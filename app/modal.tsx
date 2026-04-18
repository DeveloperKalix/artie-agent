import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

import { IntegrationsSettings } from '@/components/integrations/integrations';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type SettingsTab = 'general' | 'integrations';

const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: 'settings-outline' },
  { id: 'integrations', label: 'Integrations', icon: 'link-outline' },
];

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------

function TabBar({
  active,
  onChange,
}: {
  active: SettingsTab;
  onChange: (t: SettingsTab) => void;
}) {
  return (
    <View className="mx-6 mt-4 flex-row rounded-xl bg-slate-100 p-1">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onChange(tab.id)}
            activeOpacity={0.8}
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2 ${
              isActive ? 'bg-white shadow-sm' : ''
            }`}>
            <Ionicons
              name={tab.icon as never}
              size={15}
              color={isActive ? '#0D7377' : '#94a3b8'}
            />
            <Text
              className={`text-sm font-semibold ${isActive ? 'text-teal-800' : 'text-slate-400'}`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// General tab content — no navigation hooks; the Stack header provides back.
// ---------------------------------------------------------------------------

function GeneralSettings() {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <View className="w-16 h-16 bg-slate-200 rounded-full items-center justify-center mb-6">
        <Ionicons name="settings-outline" size={32} color="#475569" />
      </View>
      <Text className="text-slate-500 text-center">
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
  const initialTab = useRef<SettingsTab>(tab === 'integrations' ? 'integrations' : 'general').current;
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  return (
    <View className="flex-1 bg-slate-50">
      <TabBar active={activeTab} onChange={setActiveTab} />

      <View style={{ flex: 1, marginTop: 16 }}>
        {/*
          Render only the active tab. The previous attempts used display:'none'
          (web-only) or kept both mounted — neither solved the crash because
          GeneralSettings was calling useRouter() which reaches into the
          navigation context. That hook is now gone: the Stack header already
          provides a back button, so no navigation hook is needed here at all.
        */}
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'integrations' && <IntegrationsSettings />}
      </View>
    </View>
  );
}
