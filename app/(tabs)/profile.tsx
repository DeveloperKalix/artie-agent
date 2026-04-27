import React, { Component, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { ExperienceLevelSegmented, TradingSection } from '@/components/profile';

// ---------------------------------------------------------------------------
// Lightweight error boundary — catches render errors inside TradingSection
// so a bad API response can never black out the whole Profile screen.
// ---------------------------------------------------------------------------
class SectionErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={boundaryStyles.box}>
          <Ionicons name="warning-outline" size={18} color="#dc2626" />
          <Text style={boundaryStyles.text}>
            Trading settings could not be loaded.
          </Text>
          <TouchableOpacity
            style={boundaryStyles.btn}
            onPress={() => this.setState({ error: null })}>
            <Text style={boundaryStyles.btnLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const boundaryStyles = StyleSheet.create({
  box: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  text: { fontSize: 13, color: '#dc2626', textAlign: 'center' },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#dc2626',
  },
  btnLabel: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
});

function ProfileScreen() {
  const router = useRouter();
  const { displayName, avatarUrl, email } = useUserProfile();

  const onSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-slate-900">Profile</Text>

        <View className="mt-8 items-center">
          {avatarUrl ? (
            <View className="rounded-full border-4 border-white shadow-md">
              <Image
                source={{ uri: avatarUrl }}
                style={styles.profileAvatar}
                contentFit="cover"
                transition={200}
                accessibilityLabel="Profile photo"
              />
            </View>
          ) : (
            <View className="h-24 w-24 items-center justify-center rounded-full bg-slate-200">
              <Ionicons name="person" size={48} color="#64748b" />
            </View>
          )}
          <Text className="mt-4 text-xl font-semibold text-slate-900">{displayName}</Text>
          {email ? <Text className="mt-1 text-slate-500">{email}</Text> : null}
        </View>

        <View className="mt-8">
          <ExperienceLevelSegmented />
        </View>

        <View className="mt-6">
          <SectionErrorBoundary>
            <TradingSection />
          </SectionErrorBoundary>
        </View>

        <View className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <TouchableOpacity
            className="flex-row items-center justify-between border-b border-slate-100 px-4 py-4"
            activeOpacity={0.7}
            onPress={() => router.push('/memory')}>
            <View className="flex-row items-center gap-3">
              <Ionicons name="bookmark-outline" size={20} color="#475569" />
              <Text className="text-base text-slate-900">Memory</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center justify-between border-b border-slate-100 px-4 py-4"
            activeOpacity={0.7}
            onPress={() => router.push('/modal')}>
            <View className="flex-row items-center gap-3">
              <Ionicons name="settings-outline" size={20} color="#475569" />
              <Text className="text-base text-slate-900">Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center justify-between px-4 py-4"
            activeOpacity={0.7}
            onPress={onSignOut}>
            <View className="flex-row items-center gap-3">
              <Ionicons name="log-out-outline" size={20} color="#dc2626" />
              <Text className="text-base text-red-600">Sign out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const PROFILE_AVATAR = 96;

const styles = StyleSheet.create({
  profileAvatar: {
    width: PROFILE_AVATAR,
    height: PROFILE_AVATAR,
    borderRadius: PROFILE_AVATAR / 2,
  },
});

export default ProfileScreen;
