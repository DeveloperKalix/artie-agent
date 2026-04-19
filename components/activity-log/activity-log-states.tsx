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

import type { ActivityLogEntry } from '@/components/activity-log/activity-log-types';
import { tokens } from '@/styles/tokens';

type LogStatus = 'loading' | 'success' | 'error';

export function useActivityLog() {
  const [status, setStatus] = useState<LogStatus>('success');
  const [items, setItems] = useState<ActivityLogEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refetch = useCallback(async () => {
    setRefreshing(true);
    setErrorMessage(null);
    try {
      // const data = await fetchActivityLog();
      await new Promise((r) => setTimeout(r, 450));
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

export function ActivityLogLoadingState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size="large" color={tokens.color.brandTealDark} />
      <Text className="mt-4 text-sm text-slate-500">Loading activity…</Text>
    </View>
  );
}

export function ActivityLogErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="rounded-full bg-rose-50 p-4">
        <Ionicons name="alert-circle-outline" size={40} color="#be123c" />
      </View>
      <Text className="mt-6 text-center text-base font-semibold text-slate-900">Could not load activity</Text>
      <Text className="mt-2 text-center text-sm leading-relaxed text-slate-500">{message}</Text>
      <Pressable
        onPress={onRetry}
        className="mt-8 rounded-xl bg-slate-900 px-6 py-3 active:opacity-90">
        <Text className="text-center text-sm font-semibold text-white">Try again</Text>
      </Pressable>
    </View>
  );
}

export function ActivityLogEmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-6 py-10">
      <View
        className="w-full max-w-sm items-center rounded-3xl border border-dashed border-slate-200 bg-white/80 px-6 py-14"
        style={{
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.04,
          shadowRadius: 20,
        }}>
        <View
          className="h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: tokens.color.brandTealLight }}>
          <Ionicons name="reader-outline" size={42} color={tokens.color.brandTealDark} />
        </View>
        <Text className="mt-8 text-center text-xl font-semibold text-slate-900">No activity yet</Text>
        <Text className="mt-3 text-center text-base leading-relaxed text-slate-500">
          Trades, agent actions, and account events will appear here in chronological order.
        </Text>
      </View>
    </View>
  );
}

function formatLogTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function LogRow({ item }: { item: ActivityLogEntry }) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Text className="text-base font-semibold text-slate-900">{item.title}</Text>
      {item.detail ? <Text className="mt-1 text-sm text-slate-600">{item.detail}</Text> : null}
      <Text className="mt-2 text-xs text-slate-400">{formatLogTime(item.timestamp)}</Text>
    </View>
  );
}

interface ActivityLogListProps {
  data: ActivityLogEntry[];
  onRefresh: () => void;
  refreshing: boolean;
}

export function ActivityLogList({ data, onRefresh, refreshing }: ActivityLogListProps) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <LogRow item={item} />}
      ItemSeparatorComponent={() => <View className="h-3" />}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.color.brandTealDark} />
      }
      showsVerticalScrollIndicator={false}
      contentContainerClassName="pb-10 pt-2"
    />
  );
}

export function ActivityLogEmptyScrollable({
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
      <ActivityLogEmptyState />
    </ScrollView>
  );
}
