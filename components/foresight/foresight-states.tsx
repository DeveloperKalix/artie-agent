import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Recommendation } from '@/components/foresight/foresight-types';
import { RecommendationCard } from '@/components/foresight/recommendation-card';
import { tokens } from '@/styles/tokens';

type ForesightStatus = 'loading' | 'success' | 'error';

/** Replace the body with your API when ready */
export function useForesightRecommendations() {
  const [status, setStatus] = useState<ForesightStatus>('success');
  const [items, setItems] = useState<Recommendation[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refetch = useCallback(async () => {
    setRefreshing(true);
    setErrorMessage(null);
    try {
      // const data = await fetchForesightRecommendations();
      await new Promise((r) => setTimeout(r, 500));
      setItems([]);
      setStatus('success');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Something went wrong');
      setStatus('error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { items, status, errorMessage, refreshing, refetch, setItems };
}

export function ForesightLoadingState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size="large" color={tokens.color.brandTealDark} />
      <Text className="mt-4 text-sm text-slate-500">Loading recommendations…</Text>
    </View>
  );
}

export function ForesightErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="rounded-full bg-rose-50 p-4">
        <Ionicons name="cloud-offline-outline" size={40} color="#be123c" />
      </View>
      <Text className="mt-6 text-center text-base font-semibold text-slate-900">Could not load</Text>
      <Text className="mt-2 text-center text-sm leading-relaxed text-slate-500">{message}</Text>
      <Pressable
        onPress={onRetry}
        className="mt-8 rounded-xl bg-slate-900 px-6 py-3 active:opacity-90">
        <Text className="text-center text-sm font-semibold text-white">Try again</Text>
      </Pressable>
    </View>
  );
}

export function ForesightEmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View
        className="items-center justify-center rounded-3xl border border-slate-200 bg-white px-8 py-12 shadow-sm"
        style={{
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        }}>
        <View
          className="h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: tokens.color.brandTealLight }}>
          <Ionicons name="telescope-outline" size={34} color={tokens.color.brandTealDark} />
        </View>
        <Text className="mt-6 text-center text-lg font-semibold text-slate-900">No recommendations yet</Text>
        <Text className="mt-2 max-w-xs text-center text-sm leading-relaxed text-slate-500">
          When your agent spots opportunities aligned with your goals, they will show up here with clear buy, sell,
          or liquidate signals.
        </Text>
      </View>
    </View>
  );
}

interface ForesightListProps {
  data: Recommendation[];
  onRefresh: () => void;
  refreshing: boolean;
}

export function ForesightList({ data, onRefresh, refreshing }: ForesightListProps) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <RecommendationCard item={item} />}
      ItemSeparatorComponent={() => <View className="h-3" />}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.color.brandTealDark} />
      }
      showsVerticalScrollIndicator={false}
      contentContainerClassName="pb-10 pt-2"
    />
  );
}

/** Empty state with pull-to-refresh */
export function ForesightEmptyScrollable({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.color.brandTealDark} />
      }>
      <ForesightEmptyState />
    </ScrollView>
  );
}
