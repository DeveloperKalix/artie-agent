import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { confirmRemoveConnection } from '@/lib/ui/confirm-remove-connection';
import { brokerageAuthorizationIdFromAccount } from '@/lib/snaptrade/types';

import type { SnapTradeAccount } from './integrations-states';
import { BankAccount, useIntegrations } from './integrations-states';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LinkedAccountsCardProps {
  /** Opens Settings → Integrations (e.g. `/modal?tab=integrations`). */
  onAddAccount?: () => void;
}

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

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <View className="mb-3 flex-row items-center gap-2">
      {icon}
      <Text className="text-sm font-semibold uppercase tracking-widest text-slate-400">{title}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Separator
// ---------------------------------------------------------------------------

function Separator() {
  return <View className="my-4 h-px bg-slate-100" />;
}

// ---------------------------------------------------------------------------
// Bank account row
// ---------------------------------------------------------------------------

function BankAccountRow({
  account,
  onRequestRemove,
  onPress,
}: {
  account: BankAccount;
  onRequestRemove: (account: BankAccount) => void;
  onPress: (account: BankAccount) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(account)}
      onLongPress={() =>
        confirmRemoveConnection(
          'Remove bank connection',
          'This disconnects your Plaid link for this institution. Plaid removes the entire bank login, so all accounts you linked under this institution will be removed.',
          'Remove connection',
          () => onRequestRemove(account),
        )
      }
      delayLongPress={400}
      className="flex-row items-center justify-between py-3 active:opacity-70">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-50">
          <Ionicons name="business-outline" size={20} color="#0D7377" />
        </View>
        <View>
          <Text className="text-sm font-semibold text-slate-900">{account.account_name}</Text>
          <Text className="text-xs text-slate-400">
            {account.institution_name} •••• {account.mask}
          </Text>
        </View>
      </View>
      <View className="items-end">
        <Text className="text-sm font-semibold text-slate-900">
          {formatCurrency(account.balance_current, account.currency)}
        </Text>
        {account.balance_available !== null && account.balance_available !== undefined && (
          <Text className="text-xs text-slate-400">
            {formatCurrency(account.balance_available, account.currency)} avail.
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Exchange account row — SnapTrade schema
// ---------------------------------------------------------------------------

function ExchangeAccountRow({
  account,
  onRequestRemove,
  onPress,
}: {
  account: SnapTradeAccount;
  onRequestRemove: (account: SnapTradeAccount) => void;
  onPress: (account: SnapTradeAccount) => void;
}) {
  const { refreshExchangeConnection } = useIntegrations();
  const [refreshing, setRefreshing] = useState(false);

  const isPaper = account.is_paper === true;
  const isActive = account.status?.toUpperCase() === 'ACTIVE';

  // Sync state drives the balance display.
  const syncComplete = account.sync?.holdings_initial_sync_completed === true;
  const isSyncing = account.balance_total == null && !syncComplete;
  const hasNoData = account.balance_total == null && syncComplete;
  const showCashLine =
    account.balance_cash != null && account.balance_cash !== account.balance_total;

  const authorizationId = brokerageAuthorizationIdFromAccount(account);

  const handleRefresh = async () => {
    if (!authorizationId || refreshing) return;
    setRefreshing(true);
    try {
      await refreshExchangeConnection(authorizationId);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Pressable
      onPress={() => onPress(account)}
      onLongPress={() =>
        confirmRemoveConnection(
          'Remove brokerage connection',
          'This disconnects the SnapTrade link for this brokerage. All accounts under this connection will be removed.',
          'Remove connection',
          () => onRequestRemove(account),
        )
      }
      delayLongPress={400}
      className="flex-row items-center justify-between py-3 active:opacity-70">
      <View className="flex-1 flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
          <Ionicons name="trending-up-outline" size={20} color="#4f46e5" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>
              {account.name ?? 'Brokerage account'}
            </Text>
            {isPaper && (
              <View className="rounded bg-amber-100 px-1 py-0.5">
                <Text className="text-[10px] font-semibold uppercase text-amber-700">Paper</Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-slate-400" numberOfLines={1}>
            {account.institution_name ?? '—'}
            {account.number ? ` ···${account.number.slice(-4)}` : ''}
          </Text>
        </View>
      </View>

      <View className="items-end">
        {isSyncing ? (
          <View className="flex-row items-center gap-1.5">
            <ActivityIndicator size="small" color="#64748b" />
            <Text className="text-xs font-medium text-slate-500">Syncing…</Text>
          </View>
        ) : hasNoData ? (
          <Text className="text-sm font-semibold text-slate-400">—</Text>
        ) : (
          <>
            <Text className="text-sm font-semibold text-slate-900">
              {formatCurrency(account.balance_total, account.balance_currency)}
            </Text>
            {showCashLine ? (
              <Text className="text-[11px] text-slate-400">
                Cash: {formatCurrency(account.balance_cash, account.balance_currency)}
              </Text>
            ) : null}
            <Text className={`text-xs ${isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
              {isActive ? 'Active' : account.status ?? ''}
            </Text>
          </>
        )}
      </View>

      {authorizationId ? (
        <TouchableOpacity
          onPress={handleRefresh}
          hitSlop={8}
          disabled={refreshing}
          accessibilityLabel="Refresh brokerage holdings"
          className="ml-2 h-8 w-8 items-center justify-center rounded-full">
          {refreshing ? (
            <ActivityIndicator size="small" color="#94a3b8" />
          ) : (
            <Ionicons name="refresh-outline" size={16} color="#94a3b8" />
          )}
        </TouchableOpacity>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptySlot({ label, onAdd }: { label: string; onAdd?: () => void }) {
  return (
    <View className="items-center gap-3 py-5">
      <Text className="text-sm text-slate-400">{label}</Text>
      {onAdd && (
        <TouchableOpacity
          onPress={onAdd}
          activeOpacity={0.8}
          className="flex-row items-center gap-1.5 rounded-full border border-teal-300 bg-teal-50 px-4 py-2">
          <Ionicons name="add-circle-outline" size={16} color="#0D7377" />
          <Text className="text-sm font-semibold text-teal-800">Connect an account</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Loading / error inline states
// ---------------------------------------------------------------------------

function InlineLoading() {
  return (
    <View className="items-center py-4">
      <ActivityIndicator size="small" color="#0D7377" />
    </View>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <View className="items-center py-4">
      <Text className="text-xs text-red-400">{message}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bank accounts section
// ---------------------------------------------------------------------------

function BankAccountsSection({ onAddAccount }: { onAddAccount?: () => void }) {
  const { bankAccounts, bankStatus, bankError, removeBankAccount } = useIntegrations();
  const router = useRouter();

  const openDetail = (acct: BankAccount) => {
    router.push({
      pathname: '/account-detail',
      params: { accountId: acct.id, type: 'bank' },
    });
  };

  return (
    <View>
      <SectionHeader
        title="Bank Accounts"
        icon={<Ionicons name="card-outline" size={16} color="#94a3b8" />}
      />
      {bankStatus === 'loading' && <InlineLoading />}
      {bankStatus === 'error' && (
        <>
          <InlineError message={bankError ?? 'Failed to load accounts'} />
          <EmptySlot label="No bank accounts linked yet" onAdd={onAddAccount} />
        </>
      )}
      {(bankStatus === 'success' || bankStatus === 'idle') &&
        (bankAccounts.length === 0 ? (
          <EmptySlot label="No bank accounts linked yet" onAdd={onAddAccount} />
        ) : (
          bankAccounts.map((acct, i) => (
            <View key={acct.id ?? `bank-${i}`}>
              <BankAccountRow
                account={acct}
                onPress={openDetail}
                onRequestRemove={(a) => {
                  void removeBankAccount(a);
                }}
              />
              {i < bankAccounts.length - 1 && <View className="h-px bg-slate-50" />}
            </View>
          ))
        ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Exchange accounts section
// ---------------------------------------------------------------------------

function ExchangeAccountsSection() {
  const { exchangeAccounts, exchangeStatus, exchangeError, removeExchangeAccount } =
    useIntegrations();
  const router = useRouter();

  const openDetail = (acct: SnapTradeAccount) => {
    router.push({
      pathname: '/account-detail',
      params: { accountId: acct.id, type: 'exchange' },
    });
  };

  return (
    <View>
      <SectionHeader
        title="Exchange Accounts"
        icon={<Ionicons name="trending-up-outline" size={16} color="#94a3b8" />}
      />
      {exchangeStatus === 'loading' && <InlineLoading />}
      {exchangeStatus === 'error' && (
        <InlineError message={exchangeError ?? 'Failed to load exchanges'} />
      )}
      {(exchangeStatus === 'success' || exchangeStatus === 'idle' || exchangeStatus === 'error') &&
        (exchangeAccounts.length === 0 ? (
          <EmptySlot label="No exchange accounts linked yet" />
        ) : (
          exchangeAccounts.map((acct, i) => (
            <View key={acct.id ?? `exchange-${i}`}>
              <ExchangeAccountRow
                account={acct}
                onPress={openDetail}
                onRequestRemove={(a) => {
                  void removeExchangeAccount(a);
                }}
              />
              {i < exchangeAccounts.length - 1 && <View className="h-px bg-slate-50" />}
            </View>
          ))
        ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Full linked accounts card (used on home screen)
// ---------------------------------------------------------------------------

export function LinkedAccountsCard({ onAddAccount }: LinkedAccountsCardProps) {
  const { refreshBankAccounts, refreshExchangeAccounts } = useIntegrations();

  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Card header */}
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-slate-900">Linked Accounts</Text>
        <TouchableOpacity
          onPress={() => {
            void refreshBankAccounts();
            void refreshExchangeAccounts();
          }}
          hitSlop={8}>
          <Ionicons name="refresh-outline" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <BankAccountsSection onAddAccount={onAddAccount} />
      <Separator />
      <ExchangeAccountsSection />

      {onAddAccount ? (
        <TouchableOpacity
          onPress={onAddAccount}
          activeOpacity={0.85}
          className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-3.5">
          <Ionicons name="add-circle-outline" size={22} color="#0D7377" />
          <Text className="text-sm font-semibold text-teal-900">Add a bank or exchange account</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
