import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useUserProfile } from '@/hooks/use-user-profile';
import { LinkedAccountsCard } from '@/components/integrations/integrations-card';

export default function HomeScreen() {
  const { displayName, avatarUrl } = useUserProfile();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-4 pb-10"
        showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-slate-900">Home</Text>
        <Text className="mt-1 text-slate-500">Your dashboard</Text>

        {/* User greeting card */}
        <View className="mt-6 flex-row items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
              transition={200}
              accessibilityLabel="Profile photo"
            />
          ) : (
            <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-200">
              <Ionicons name="person" size={36} color="#64748b" />
            </View>
          )}
          <View className="ml-4 flex-1">
            <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Signed in with Google
            </Text>
            <Text className="mt-1 text-lg font-semibold text-slate-900" numberOfLines={2}>
              {displayName}
            </Text>
          </View>
        </View>

        {/* Linked accounts */}
        <View className="mt-6">
          <LinkedAccountsCard
            onAddAccount={() => router.push('/modal?tab=integrations')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 64;

const styles = StyleSheet.create({
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
});
