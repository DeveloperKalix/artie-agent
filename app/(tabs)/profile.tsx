import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';
import { useUserProfile } from '@/hooks/use-user-profile';

function ProfileScreen() {
  const router = useRouter();
  const { displayName, avatarUrl, email } = useUserProfile();

  const onSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="flex-1 px-6 pt-4">
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

        <View className="mt-10 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <TouchableOpacity
            className="flex-row items-center justify-between border-b border-slate-100 px-4 py-4"
            activeOpacity={0.7}
            onPress={() => router.push('/modal')}>
            <Text className="text-base text-slate-900">Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center justify-between px-4 py-4"
            activeOpacity={0.7}
            onPress={onSignOut}>
            <Text className="text-base text-red-600">Sign out</Text>
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
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
