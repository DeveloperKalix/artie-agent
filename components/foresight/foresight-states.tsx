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
import {
  getRecommendationStatus,
  listRecommendations,
  markRecommendationViewed,
  postRecommendations,
} from '@/lib/recommendations/api';
import { useAuth } from '@/context/auth-context';
import { tokens } from '@/styles/tokens';

type ForesightStatus = 'idle' | 'loading' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Backs the Foresight tab. Two buckets:
 *
 *  - `newItems`    — unviewed foresights (from `GET /recommendations`.new)
 *  - `viewedItems` — previously-viewed foresights (cap 50 on server)
 *
 * On focus we call the cheap `GET` + `GET /status` — no LLM, no cursor
 * advance. The explicit `generate()` function is the only caller of
 * `POST /recommendations`; the Foresight screen exposes it behind a
 * "Refresh" CTA that only appears when `pendingNewsCount > 0` (or the
 * user pulls to refresh with intent).
 */
export function useForesightRecommendations() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  const [status, setStatus] = useState<ForesightStatus>('idle');
  const [newItems, setNewItems] = useState<Recommendation[]>([]);
  const [viewedItems, setViewedItems] = useState<Recommendation[]>([]);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingNewsCount, setPendingNewsCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Tracks whether we ever got a successful list — used to decide between
  // "error takeover" and "keep last successful list" on transient failures.
  const hasLoadedRef = useRef(false);

  // Cheap list fetch — populates both buckets. Safe to call on every focus.
  const refetch = useCallback(async () => {
    if (!token || !userId) {
      setNewItems([]);
      setViewedItems([]);
      setDisclaimer(null);
      setStatus('idle');
      return;
    }
    setRefreshing(true);
    setStatus((prev) => (prev === 'idle' ? 'loading' : prev));
    setErrorMessage(null);

    const [listRes, statusRes] = await Promise.all([
      listRecommendations(token, userId),
      getRecommendationStatus(token, userId),
    ]);

    if (listRes.error) {
      setErrorMessage(listRes.error);
      setStatus(hasLoadedRef.current ? 'success' : 'error');
      setRefreshing(false);
      return;
    }

    const now = new Date().toISOString();
    const nextNew = (listRes.data?.new ?? []).map((r) => toUiRecommendation(r, now));
    const nextViewed = (listRes.data?.viewed ?? []).map((r) => toUiRecommendation(r, now));
    setNewItems(nextNew);
    setViewedItems(nextViewed);
    hasLoadedRef.current = true;
    setStatus('success');

    if (!statusRes.error && statusRes.data) {
      setPendingNewsCount(statusRes.data.pending_news_count ?? 0);
    }

    setRefreshing(false);
  }, [token, userId]);

  // Trigger an LLM-backed generation. Only call on explicit user intent.
  const generate = useCallback(async () => {
    if (!token || !userId) return;
    setGenerating(true);
    setErrorMessage(null);
    const { data, error } = await postRecommendations(token, userId);
    setGenerating(false);

    if (error) {
      // Keep existing list; surface a toast-level error instead of wiping the screen.
      setErrorMessage(error);
      return;
    }

    const now = new Date().toISOString();
    const nextNew = (data?.recommendations ?? []).map((r) => toUiRecommendation(r, now));
    setNewItems(nextNew);
    setDisclaimer(data?.disclaimer ?? null);
    hasLoadedRef.current = true;
    setStatus('success');

    const inserted = data?.new_count ?? 0;
    if (inserted > 0) {
      setToast(`+${inserted} new foresight${inserted === 1 ? '' : 's'}`);
    } else if (nextNew.length === 0) {
      setToast('Nothing new since your last check');
    }

    // Refresh status so pending_news_count reflects the new cursor position.
    const statusRes = await getRecommendationStatus(token, userId);
    if (!statusRes.error && statusRes.data) {
      setPendingNewsCount(statusRes.data.pending_news_count ?? 0);
    }
  }, [token, userId]);

  // Optimistically move a card from new -> viewed and fire the POST.
  const markViewed = useCallback(
    async (id: string) => {
      if (!token || !userId) return;

      let moved: Recommendation | null = null;
      setNewItems((prev) => {
        const idx = prev.findIndex((x) => x.id === id);
        if (idx === -1) return prev;
        moved = { ...prev[idx], viewed: true, viewedAt: new Date().toISOString() };
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
      if (moved) {
        setViewedItems((prev) => [moved as Recommendation, ...prev]);
      }

      const { error, status: httpStatus } = await markRecommendationViewed(token, userId, id);
      if (error && httpStatus !== 404) {
        // 404 is a no-op (stale id). Any other error — roll back and let the
        // next refetch reconcile.
        // We intentionally don't roll back aggressively to avoid flicker; the
        // next focus effect / pull-to-refresh will reload the list.
      }
    },
    [token, userId],
  );

  const dismissToast = useCallback(() => setToast(null), []);

  return {
    // Data
    newItems,
    viewedItems,
    disclaimer,
    pendingNewsCount,
    // Status
    status,
    errorMessage,
    refreshing,
    generating,
    toast,
    // Actions
    refetch,
    generate,
    markViewed,
    dismissToast,
  };
}

// ---------------------------------------------------------------------------
// Presentational pieces
// ---------------------------------------------------------------------------

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

/** Pinned top banner shown when fresh news is available and the user could Refresh. */
export function ForesightRefreshBanner({
  pendingNewsCount,
  onRefresh,
  generating,
}: {
  pendingNewsCount: number;
  onRefresh: () => void;
  generating: boolean;
}) {
  if (pendingNewsCount <= 0) return null;
  return (
    <Pressable
      onPress={onRefresh}
      disabled={generating}
      className="mx-1 mb-3 flex-row items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 active:opacity-80">
      <View className="flex-1 flex-row items-center gap-2">
        <Ionicons name="sparkles-outline" size={18} color={tokens.color.brandTealDark} />
        <Text className="flex-1 text-sm font-medium text-teal-900">
          {pendingNewsCount} new article{pendingNewsCount === 1 ? '' : 's'} since your last check
        </Text>
      </View>
      {generating ? (
        <ActivityIndicator size="small" color={tokens.color.brandTealDark} />
      ) : (
        <Text className="text-sm font-semibold text-teal-900">Refresh</Text>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// List renderers
// ---------------------------------------------------------------------------

type FlatRow =
  | { kind: 'header'; title: string; key: string }
  | { kind: 'item'; item: Recommendation };

function buildRows(newItems: Recommendation[], viewedItems: Recommendation[]): FlatRow[] {
  const rows: FlatRow[] = [];
  if (newItems.length > 0) {
    rows.push({ kind: 'header', title: 'New', key: 'header-new' });
    for (const r of newItems) rows.push({ kind: 'item', item: r });
  }
  if (viewedItems.length > 0) {
    rows.push({ kind: 'header', title: 'Previously viewed', key: 'header-viewed' });
    for (const r of viewedItems) rows.push({ kind: 'item', item: r });
  }
  return rows;
}

interface ForesightListProps {
  newItems: Recommendation[];
  viewedItems: Recommendation[];
  onRefresh: () => void;
  refreshing: boolean;
  disclaimer?: string | null;
  onViewItem?: (id: string) => void;
  headerBanner?: React.ReactNode;
}

export function ForesightList({
  newItems,
  viewedItems,
  onRefresh,
  refreshing,
  disclaimer,
  onViewItem,
  headerBanner,
}: ForesightListProps) {
  const rows = buildRows(newItems, viewedItems);

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => (row.kind === 'header' ? row.key : row.item.id)}
      renderItem={({ item: row }) => {
        if (row.kind === 'header') {
          return (
            <Text className="mb-2 mt-4 px-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
              {row.title}
            </Text>
          );
        }
        return <RecommendationCard item={row.item} onViewed={onViewItem} />;
      }}
      ItemSeparatorComponent={({ leadingItem }: { leadingItem: FlatRow }) =>
        leadingItem.kind === 'header' ? null : <View className="h-3" />
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.color.brandTealDark} />
      }
      showsVerticalScrollIndicator={false}
      contentContainerClassName="pb-10 pt-2"
      ListHeaderComponent={headerBanner ? <View className="mt-1">{headerBanner}</View> : null}
      ListFooterComponent={disclaimer ? <ForesightDisclaimer text={disclaimer} /> : null}
    />
  );
}

/** Empty state with pull-to-refresh */
export function ForesightEmptyScrollable({
  onRefresh,
  refreshing,
  disclaimer,
  headerBanner,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  disclaimer?: string | null;
  headerBanner?: React.ReactNode;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow pt-2"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.color.brandTealDark} />
      }>
      {headerBanner ? <View className="mt-1">{headerBanner}</View> : null}
      <ForesightEmptyState />
      {disclaimer ? <ForesightDisclaimer text={disclaimer} /> : null}
    </ScrollView>
  );
}
