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

/**
 * Discrete view a Foresight screen should render. See `pickForesightView()`.
 *
 * Note: we intentionally deviate from phase-5 § 2.5's "all caught up" and
 * "refresh ready" empty-state variants. Once the user has any viewed
 * foresights, we keep rendering the list (so the history stays visible) —
 * the in-list `ForesightRefreshBanner` already covers the "new news
 * available" affordance.
 */
export type ForesightView =
  | 'loading'         // first-load spinner
  | 'error'           // first-load failed and we have no cached list
  | 'auto-generating' // fresh user, news pending — waiting on auto-gen
  | 'dormant'         // truly empty (no new, no viewed, no pending)
  | 'list';           // we have content — render the list

export interface PickForesightViewInput {
  status: ForesightStatus;
  errorMessage: string | null;
  newCount: number;
  viewedCount: number;
  pendingNewsCount: number;
  isFirstLoad: boolean;
  refreshing: boolean;
}

/**
 * Pure classifier that collapses the Foresight screen's possible states into
 * one of five renderable views. Kept outside the screen so the decision
 * table is trivially unit-testable and the JSX stays skimmable.
 *
 * Priority order:
 *   1. Hard error with nothing cached → `'error'`
 *   2. Still waiting on the very first response → `'loading'`
 *   3. Have any cards (new OR viewed) → `'list'` — viewed history stays
 *      visible even after the user has cleared the `new` bucket.
 *   4. Completely empty but news is pending → `'auto-generating'` (backend
 *      is spinning up the LLM on the next GET).
 *   5. Truly empty → `'dormant'`.
 */
export function pickForesightView({
  status,
  errorMessage,
  newCount,
  viewedCount,
  pendingNewsCount,
  isFirstLoad,
  refreshing,
}: PickForesightViewInput): ForesightView {
  if (status === 'error' && errorMessage && newCount === 0 && viewedCount === 0) {
    return 'error';
  }
  if (isFirstLoad && (status === 'loading' || status === 'idle' || refreshing)) {
    return 'loading';
  }

  // Once there's ANY content (new or viewed), always render the list. The
  // in-list refresh banner handles the "news pending" affordance; we never
  // hide the user's history behind a full-screen empty state.
  if (newCount > 0 || viewedCount > 0) return 'list';

  // No content at all.
  if (pendingNewsCount > 0) return 'auto-generating';
  return 'dormant';
}

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
  // `true` until the first successful list fetch resolves. The screen uses
  // this to distinguish "show a full-screen spinner because we have nothing
  // yet" from "keep the stale list visible while a refetch is in flight".
  const [isFirstLoad, setIsFirstLoad] = useState(true);

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
    // Defensive: filter out any row that blows up during mapping so one bad
    // payload can't wipe out the entire list. (`toUiRecommendation` itself
    // already guards against missing fields; this is belt-and-suspenders.)
    const safeMap = (rows: unknown[] | undefined): Recommendation[] => {
      if (!Array.isArray(rows)) return [];
      const out: Recommendation[] = [];
      for (const r of rows) {
        try {
          out.push(toUiRecommendation(r as never, now));
        } catch (err) {
          if (__DEV__) {
            console.warn('[foresight] skipped malformed recommendation', err, r);
          }
        }
      }
      return out;
    };

    const nextNew = safeMap(listRes.data?.new);
    const nextViewed = safeMap(listRes.data?.viewed);
    setNewItems(nextNew);
    setViewedItems(nextViewed);
    hasLoadedRef.current = true;
    setIsFirstLoad(false);
    setStatus('success');

    if (!statusRes.error && statusRes.data) {
      setPendingNewsCount(statusRes.data.pending_news_count ?? 0);

      // Diagnostic: surface when /status and /recommendations disagree. This
      // usually means the backend wrote the notification-count row but the
      // list query is filtering them out (e.g. stale viewed_at clock skew).
      if (__DEV__) {
        const statusNewCount = statusRes.data.new_count ?? 0;
        if (statusNewCount !== nextNew.length) {
          console.warn(
            '[foresight] mismatch: /status new_count=%d but /recommendations.new=%d',
            statusNewCount,
            nextNew.length,
          );
        }
      }
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
    setIsFirstLoad(false);
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
    isFirstLoad,
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

export function ForesightLoadingState({ message }: { message?: string } = {}) {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size="large" color={tokens.color.brandTealDark} />
      <Text className="mt-4 text-sm text-slate-500">{message ?? 'Loading recommendations…'}</Text>
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

// ---------------------------------------------------------------------------
// Empty-state scaffolding — four variants keyed off the (new, viewed, pending)
// tuple per § 2.5 of frontend-phase5-integration.md.
// ---------------------------------------------------------------------------

/** Shared card chrome used by every empty-state variant. */
function ForesightEmptyCard({
  icon,
  title,
  body,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
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
          <Ionicons name={icon} size={34} color={tokens.color.brandTealDark} />
        </View>
        <Text className="mt-6 text-center text-lg font-semibold text-slate-900">{title}</Text>
        <Text className="mt-2 max-w-xs text-center text-sm leading-relaxed text-slate-500">
          {body}
        </Text>
        {children}
      </View>
    </View>
  );
}

/** `new=0, viewed=0, pending=0` — brand new user or totally quiet. */
export function ForesightDormantState() {
  return (
    <ForesightEmptyCard
      icon="telescope-outline"
      title="Nothing yet — check back later"
      body="When your agent spots opportunities aligned with your goals, they will show up here with clear buy, sell, or liquidate signals. Pull down to refresh."
    />
  );
}

/** `new=0, viewed>0, pending=0` — user has history and nothing new to show. */
export function ForesightAllCaughtUpState() {
  return (
    <ForesightEmptyCard
      icon="checkmark-done-outline"
      title="All caught up"
      body="You've seen every foresight your agent has generated. New analyses will arrive as relevant news breaks."
    />
  );
}

/**
 * `new=0, viewed>0, pending>0` — new news has landed; promote the refresh
 * CTA to a full-screen primary action instead of the subtle banner.
 */
export function ForesightRefreshReadyState({
  pendingNewsCount,
  onRefresh,
  generating,
}: {
  pendingNewsCount: number;
  onRefresh: () => void;
  generating: boolean;
}) {
  return (
    <ForesightEmptyCard
      icon="sparkles-outline"
      title="New analysis ready"
      body={`${pendingNewsCount} new article${
        pendingNewsCount === 1 ? '' : 's'
      } since your last check. Tap below to have your agent take a fresh look at your portfolio.`}>
      <Pressable
        onPress={onRefresh}
        disabled={generating}
        className="mt-8 flex-row items-center gap-2 rounded-xl px-6 py-3 active:opacity-90"
        style={{ backgroundColor: tokens.color.brandTealDark, opacity: generating ? 0.6 : 1 }}>
        {generating ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Ionicons name="refresh" size={18} color="#ffffff" />
        )}
        <Text className="text-sm font-semibold text-white">
          {generating ? 'Analyzing…' : 'Generate now'}
        </Text>
      </Pressable>
    </ForesightEmptyCard>
  );
}

/**
 * `new=0, viewed=0, pending>0` — auto-gen is running inside GET. The GET
 * itself will block for 5–15 s so this is mostly for the case where we've
 * already had one successful fetch and are polling on re-focus.
 */
export function ForesightAutoGeneratingState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size="large" color={tokens.color.brandTealDark} />
      <Text className="mt-4 text-sm font-semibold text-slate-700">Analyzing your portfolio…</Text>
      <Text className="mt-1 max-w-xs text-center text-xs text-slate-500">
        Your agent is reading the latest news and drafting foresights. This usually takes 5–15 seconds.
      </Text>
    </View>
  );
}

/**
 * Back-compat alias. Older callers imported `ForesightEmptyState`; the phase-5
 * refactor splits empties into four distinct variants, with the "brand new user"
 * case inheriting the old copy under the `ForesightDormantState` name.
 *
 * @deprecated prefer `ForesightDormantState` / `pickForesightView`.
 */
export const ForesightEmptyState = ForesightDormantState;

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

/**
 * Pull-to-refresh scaffolding for any empty-state variant. The screen passes
 * the concrete empty component (dormant / all-caught-up / refresh-ready /
 * auto-generating) as children so the user can still swipe down to retry.
 */
export function ForesightEmptyScrollable({
  onRefresh,
  refreshing,
  disclaimer,
  headerBanner,
  children,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  disclaimer?: string | null;
  headerBanner?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow pt-2"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.color.brandTealDark} />
      }>
      {headerBanner ? <View className="mt-1">{headerBanner}</View> : null}
      {children ?? <ForesightDormantState />}
      {disclaimer ? <ForesightDisclaimer text={disclaimer} /> : null}
    </ScrollView>
  );
}
