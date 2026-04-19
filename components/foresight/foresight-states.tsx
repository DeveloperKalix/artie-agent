import { useCallback, useRef, useState } from 'react';
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
import { toUiRecommendation } from '@/components/foresight/foresight-types';
import { RecommendationCard } from '@/components/foresight/recommendation-card';
import { postRecommendations } from '@/lib/recommendations/api';
import { useAuth } from '@/context/auth-context';
import { tokens } from '@/styles/tokens';

type ForesightStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Fetches recommendations from `POST /api/v1/recommendations` and keeps the
 * last successful list around on errors (per integration guide § 5).
 */
export function useForesightRecommendations() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  const [status, setStatus] = useState<ForesightStatus>('idle');
  const [items, setItems] = useState<Recommendation[]>([]);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Track whether we have a previous successful list without making it a dep
  // of refetch (which would cause useFocusEffect to re-subscribe on every fetch).
  const hasItemsRef = useRef(false);

  const refetch = useCallback(async () => {
    if (!token || !userId) {
      setItems([]);
      setDisclaimer(null);
      setStatus('idle');
      return;
    }
    setRefreshing(true);
    setStatus((prev) => (prev === 'idle' ? 'loading' : prev));
    setErrorMessage(null);
    const { data, error } = await postRecommendations(token, userId);
    if (error) {
      // Keep the last successful list — don't wipe the screen on transient failures.
      setErrorMessage(error);
      setStatus(hasItemsRef.current ? 'success' : 'error');
      setRefreshing(false);
      return;
    }
    const generatedAt = data?.generated_at ?? new Date().toISOString();
    const nextItems = (data?.recommendations ?? []).map((r) => toUiRecommendation(r, generatedAt));
    setItems(nextItems);
    hasItemsRef.current = nextItems.length > 0;
    setDisclaimer(data?.disclaimer ?? null);
    setStatus('success');
    setRefreshing(false);
  }, [token, userId]);

  return { items, status, errorMessage, disclaimer, refreshing, refetch, setItems };
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
        <Text className="mt-6 text-center text-lg font-semibold text-slate-900">
          Nothing actionable since your last check
        </Text>
        <Text className="mt-2 max-w-xs text-center text-sm leading-relaxed text-slate-500">
          When your agent spots opportunities aligned with your goals, they will show up here with clear buy, sell,
          or liquidate signals. Pull down to refresh.
        </Text>
      </View>
    </View>
  );
}

export function ForesightDisclaimer({ text }: { text: string }) {
  return (
    <Text className="mt-6 px-2 text-center text-[11px] leading-relaxed text-slate-400">
      {text}
    </Text>
  );
}

interface ForesightListProps {
  data: Recommendation[];
  onRefresh: () => void;
  refreshing: boolean;
  disclaimer?: string | null;
}

export function ForesightList({ data, onRefresh, refreshing, disclaimer }: ForesightListProps) {
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
      ListFooterComponent={disclaimer ? <ForesightDisclaimer text={disclaimer} /> : null}
    />
  );
}

/** Empty state with pull-to-refresh */
export function ForesightEmptyScrollable({
  onRefresh,
  refreshing,
  disclaimer,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  disclaimer?: string | null;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.color.brandTealDark} />
      }>
      <ForesightEmptyState />
      {disclaimer ? <ForesightDisclaimer text={disclaimer} /> : null}
    </ScrollView>
  );
}
