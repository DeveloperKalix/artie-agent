import React from 'react';
import { ActivityIndicator, ScrollView as RNScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useIntegrations } from './integrations-states';

// ---------------------------------------------------------------------------
// Section header (settings style)
// ---------------------------------------------------------------------------

function SettingsSectionHeader({ title }: { title: string }) {
  return (
    <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
      {title}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Separator
// ---------------------------------------------------------------------------

function Separator() {
  return <View className="my-5 h-px bg-slate-100" />;
}

// ---------------------------------------------------------------------------
// Connected bank row
// ---------------------------------------------------------------------------

function ConnectedBankRow({ name, mask }: { name: string; mask: string }) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-teal-50">
          <Ionicons name="business-outline" size={18} color="#0D7377" />
        </View>
        <Text className="text-sm font-medium text-slate-900">
          {name} •••• {mask}
        </Text>
      </View>
      <View className="rounded-full bg-emerald-50 px-2 py-0.5">
        <Text className="text-xs font-semibold text-emerald-600">Connected</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Connect Plaid button
// ---------------------------------------------------------------------------

function ConnectPlaidButton() {
  const { connectBank, linkingBank, linkError } = useIntegrations();

  return (
    <View className="gap-2">
      <TouchableOpacity
        onPress={() => void connectBank()}
        disabled={linkingBank}
        activeOpacity={0.8}
        className="flex-row items-center justify-between rounded-xl border border-dashed border-teal-300 bg-teal-50 px-4 py-3">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-teal-100">
            {linkingBank ? (
              <ActivityIndicator size="small" color="#0D7377" />
            ) : (
              <Ionicons name="add" size={20} color="#0D7377" />
            )}
          </View>
          <View>
            <Text className="text-sm font-semibold text-teal-800">
              {linkingBank ? 'Connecting…' : 'Connect Bank Account'}
            </Text>
            <Text className="text-xs text-teal-600">Via Plaid — secure & read-only</Text>
          </View>
        </View>
        {!linkingBank && <Ionicons name="chevron-forward" size={18} color="#0D7377" />}
      </TouchableOpacity>

      {linkError ? (
        <View className="flex-row items-center gap-2 rounded-xl bg-red-50 px-3 py-2">
          <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
          <Text className="flex-1 text-xs text-red-600">{linkError}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Connected exchange row (SnapTrade-backed)
// ---------------------------------------------------------------------------

function ConnectedExchangeRow({ label, exchangeName }: { label: string; exchangeName: string }) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-indigo-50">
          <Ionicons name="trending-up-outline" size={18} color="#4f46e5" />
        </View>
        <View>
          <Text className="text-sm font-medium text-slate-900">{label}</Text>
          <Text className="text-xs text-slate-400">{exchangeName}</Text>
        </View>
      </View>
      <View className="rounded-full bg-emerald-50 px-2 py-0.5">
        <Text className="text-xs font-semibold text-emerald-600">Connected</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Connect SnapTrade (exchanges)
// ---------------------------------------------------------------------------

function ConnectSnapTradeButton() {
  const { connectSnapTrade, linkingExchange, exchangeLinkError } = useIntegrations();

  return (
    <View className="gap-2">
      <TouchableOpacity
        onPress={() => void connectSnapTrade()}
        disabled={linkingExchange}
        activeOpacity={0.8}
        className="flex-row items-center justify-between rounded-xl border border-dashed border-indigo-300 bg-indigo-50 px-4 py-3">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-indigo-100">
            {linkingExchange ? (
              <ActivityIndicator size="small" color="#4f46e5" />
            ) : (
              <Ionicons name="link-outline" size={20} color="#4f46e5" />
            )}
          </View>
          <View>
            <Text className="text-sm font-semibold text-indigo-900">
              {linkingExchange ? 'Opening SnapTrade…' : 'Connect Exchange Accounts'}
            </Text>
            <Text className="text-xs text-indigo-600">Via SnapTrade — link brokerages securely</Text>
          </View>
        </View>
        {!linkingExchange && <Ionicons name="chevron-forward" size={18} color="#4f46e5" />}
      </TouchableOpacity>
      {exchangeLinkError ? (
        <View className="flex-row items-center gap-2 rounded-xl bg-red-50 px-3 py-2">
          <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
          <Text className="flex-1 text-xs text-red-600">{exchangeLinkError}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Integrations settings panel
// ---------------------------------------------------------------------------

export function IntegrationsSettings() {
  const {
    bankAccounts,
    bankStatus,
    bankError,
    refreshBankAccounts,
    exchangeAccounts,
    exchangeStatus,
    exchangeError,
    refreshExchangeAccounts,
  } = useIntegrations();

  return (
    <RNScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 8 }}
      showsVerticalScrollIndicator={false}>
      {/* ── Bank accounts ─────────────────────────────────── */}
      <SettingsSectionHeader title="Bank Accounts" />

      {bankStatus === 'error' && (
        <View className="mb-3 flex-row items-center gap-2 rounded-xl bg-red-50 px-4 py-3">
          <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
          <Text className="flex-1 text-xs text-red-600">{bankError}</Text>
          <TouchableOpacity onPress={() => void refreshBankAccounts()}>
            <Text className="text-xs font-semibold text-red-600">Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="gap-2">
        {bankAccounts.map((acct, i) => (
          <ConnectedBankRow
            key={acct.id ?? `bank-${acct.mask}-${i}`}
            name={acct.institution_name}
            mask={acct.mask}
          />
        ))}
        <ConnectPlaidButton />
      </View>

      <Separator />

      {/* ── Exchange accounts (SnapTrade) ─────────────────── */}
      <SettingsSectionHeader title="Exchange Accounts" />

      {exchangeStatus === 'error' && (
        <View className="mb-3 flex-row items-center gap-2 rounded-xl bg-red-50 px-4 py-3">
          <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
          <Text className="flex-1 text-xs text-red-600">{exchangeError}</Text>
          <TouchableOpacity onPress={() => void refreshExchangeAccounts()}>
            <Text className="text-xs font-semibold text-red-600">Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="gap-2">
        {exchangeAccounts.map((acct, i) => (
          <ConnectedExchangeRow
            key={acct.id ?? `exchange-${acct.label}-${i}`}
            label={acct.label}
            exchangeName={acct.exchange_name}
          />
        ))}
        <ConnectSnapTradeButton />
      </View>
    </RNScrollView>
  );
}
