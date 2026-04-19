import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/auth-context';
import { useIntegrations } from '@/components/integrations/integrations-states';
import { fetchSnapTradePositions } from '@/lib/snaptrade/api';
import type { SnapTradePosition } from '@/lib/snaptrade/types';
import { tokens } from '@/styles/tokens';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number | null | undefined, currency?: string | null) {
  const n = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
  const safeCode =
    typeof currency === 'string' && /^[A-Z]{3}$/.test(currency.trim().toUpperCase())
      ? currency.trim().toUpperCase()
      : 'USD';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: safeCode }).format(n);
}

function formatRelativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const then = new Date(iso).getTime();
    const diffMs = Date.now() - then;
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Bank detail
// ---------------------------------------------------------------------------

function BankDetail({ accountId }: { accountId: string }) {
  const { bankAccounts } = useIntegrations();
  const account = bankAccounts.find((a) => a.id === accountId);

  if (!account) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="alert-circle-outline" size={32} color="#94a3b8" />
        <Text className="mt-3 text-center text-sm text-slate-500">
          Account not found. It may have been disconnected.
        </Text>
      </View>
    );
  }

  const availableLabel =
    account.balance_available != null
      ? formatCurrency(account.balance_available, account.currency)
      : null;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-6 pb-10 pt-4"
      showsVerticalScrollIndicator={false}>
      {/* Header card */}
      <View className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Text className="text-xs font-medium uppercase tracking-widest text-slate-400">
          {account.institution_name}
        </Text>
        <Text className="mt-1 text-lg font-semibold text-slate-900">{account.account_name}</Text>
        <Text className="mt-0.5 text-xs text-slate-400">
          •••• {account.mask} · {account.account_type}
        </Text>

        <View className="mt-5">
          <Text className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Current balance
          </Text>
          <Text className="mt-1 text-3xl font-bold text-slate-900">
            {formatCurrency(account.balance_current, account.currency)}
          </Text>
          {availableLabel ? (
            <Text className="mt-1 text-sm text-slate-500">Available: {availableLabel}</Text>
          ) : null}
        </View>
      </View>

      {/* Meta */}
      <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Details
        </Text>
        <DetailRow label="Type" value={account.account_type} />
        <DetailRow label="Currency" value={account.currency} />
        <DetailRow label="Mask" value={`•••• ${account.mask}`} />
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Exchange detail
// ---------------------------------------------------------------------------

function ExchangeDetail({ accountId }: { accountId: string }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;
  const { exchangeAccounts } = useIntegrations();

  const account = exchangeAccounts.find((a) => a.id === accountId);

  const [positions, setPositions] = useState<SnapTradePosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadPositions = useCallback(async () => {
    if (!token || !userId) return;
    setError(null);
    const { data, error: err } = await fetchSnapTradePositions(token, userId);
    if (err) {
      setError(err);
      return;
    }
    const all = data?.positions ?? [];
    setPositions(all.filter((p) => p.account_id === accountId));
  }, [token, userId, accountId]);

  useEffect(() => {
    setLoading(true);
    void loadPositions().finally(() => setLoading(false));
  }, [loadPositions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPositions();
    setRefreshing(false);
  }, [loadPositions]);

  const totalMarketValue = useMemo(
    () => positions.reduce((sum, p) => sum + (p.market_value ?? 0), 0),
    [positions],
  );

  if (!account) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="alert-circle-outline" size={32} color="#94a3b8" />
        <Text className="mt-3 text-center text-sm text-slate-500">
          Account not found. It may have been disconnected.
        </Text>
      </View>
    );
  }

  const syncComplete = account.sync?.holdings_initial_sync_completed === true;
  const isSyncing = account.balance_total == null && !syncComplete;
  const lastSynced = formatRelativeTime(account.sync?.holdings_last_successful_sync);

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-6 pb-10 pt-4"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={tokens.color.brandTealDark}
        />
      }>
      {/* Header card */}
      <View className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Text className="text-xs font-medium uppercase tracking-widest text-slate-400">
          {account.institution_name ?? 'Brokerage'}
        </Text>
        <View className="mt-1 flex-row items-center gap-2">
          <Text className="flex-1 text-lg font-semibold text-slate-900" numberOfLines={1}>
            {account.name ?? 'Brokerage account'}
          </Text>
          {account.is_paper ? (
            <View className="rounded bg-amber-100 px-2 py-0.5">
              <Text className="text-[10px] font-semibold uppercase text-amber-700">Paper</Text>
            </View>
          ) : null}
        </View>
        {account.number ? (
          <Text className="mt-0.5 text-xs text-slate-400">···{account.number.slice(-4)}</Text>
        ) : null}

        <View className="mt-5">
          <Text className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Total value
          </Text>
          {isSyncing ? (
            <View className="mt-1 flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#64748b" />
              <Text className="text-base font-medium text-slate-500">
                Syncing holdings from {account.institution_name ?? 'your brokerage'}…
              </Text>
            </View>
          ) : (
            <Text className="mt-1 text-3xl font-bold text-slate-900">
              {formatCurrency(account.balance_total, account.balance_currency)}
            </Text>
          )}
          {account.balance_cash != null ? (
            <Text className="mt-1 text-sm text-slate-500">
              Cash: {formatCurrency(account.balance_cash, account.balance_currency)}
            </Text>
          ) : null}
          {lastSynced ? (
            <Text className="mt-2 text-[11px] text-slate-400">Last synced {lastSynced}</Text>
          ) : null}
        </View>
      </View>

      {/* Holdings */}
      <View className="mt-5 flex-row items-baseline justify-between">
        <Text className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Holdings
        </Text>
        {positions.length > 0 ? (
          <Text className="text-xs text-slate-400">
            {formatCurrency(totalMarketValue, account.balance_currency)}
          </Text>
        ) : null}
      </View>

      <View className="mt-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading && positions.length === 0 ? (
          <View className="items-center py-10">
            <ActivityIndicator size="small" color={tokens.color.brandTealDark} />
            <Text className="mt-2 text-xs text-slate-400">Loading holdings…</Text>
          </View>
        ) : error ? (
          <View className="items-center px-6 py-10">
            <Text className="text-center text-sm text-rose-500">{error}</Text>
          </View>
        ) : positions.length === 0 ? (
          <View className="items-center px-6 py-10">
            <Ionicons name="pie-chart-outline" size={32} color="#94a3b8" />
            <Text className="mt-3 text-center text-sm text-slate-500">
              {isSyncing
                ? 'Holdings will appear once the initial sync finishes.'
                : 'No holdings in this account yet.'}
            </Text>
          </View>
        ) : (
          positions.map((p, idx) => (
            <View key={`${p.symbol}-${idx}`}>
              <PositionRow position={p} />
              {idx < positions.length - 1 ? <View className="mx-4 h-px bg-slate-100" /> : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function PositionRow({ position }: { position: SnapTradePosition }) {
  const gain = position.unrealized_gain ?? 0;
  const gainColor = gain >= 0 ? 'text-emerald-600' : 'text-rose-500';
  const gainPrefix = gain > 0 ? '+' : '';

  return (
    <View className="flex-row items-center justify-between px-4 py-3.5">
      <View className="flex-1 pr-3">
        <Text className="text-sm font-semibold text-slate-900">{position.symbol}</Text>
        {position.description ? (
          <Text className="mt-0.5 text-xs text-slate-400" numberOfLines={1}>
            {position.description}
          </Text>
        ) : null}
        <Text className="mt-1 text-xs text-slate-500">
          {position.quantity} @ {formatCurrency(position.current_price, position.currency)}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-sm font-semibold text-slate-900">
          {formatCurrency(position.market_value, position.currency)}
        </Text>
        <Text className={`text-xs ${gainColor}`}>
          {gainPrefix}
          {formatCurrency(gain, position.currency)}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-xs text-slate-400">{label}</Text>
      <Text className="text-sm text-slate-700">{value ?? '—'}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function AccountDetailScreen() {
  const { accountId, type } = useLocalSearchParams<{ accountId?: string; type?: string }>();

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom']}>
      {accountId && type === 'exchange' ? (
        <ExchangeDetail accountId={accountId} />
      ) : accountId && type === 'bank' ? (
        <BankDetail accountId={accountId} />
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={32} color="#94a3b8" />
          <Text className="mt-3 text-center text-sm text-slate-500">Missing account information.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
