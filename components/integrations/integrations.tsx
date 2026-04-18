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
// Exchange coming-soon row
// ---------------------------------------------------------------------------

function ExchangeComingSoonRow({ name, icon }: { name: string; icon: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 opacity-50">
      <View className="flex-row items-center gap-3">
        {icon}
        <Text className="text-sm font-medium text-slate-900">{name}</Text>
      </View>
      <View className="rounded-full bg-slate-100 px-2 py-0.5">
        <Text className="text-xs font-semibold text-slate-500">Coming soon</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Integrations settings panel
// ---------------------------------------------------------------------------

export function IntegrationsSettings() {
  const { bankAccounts, bankStatus, bankError, refreshBankAccounts } = useIntegrations();

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
        {bankAccounts.map((acct) => (
          <ConnectedBankRow key={acct.id} name={acct.institution_name} mask={acct.mask} />
        ))}
        <ConnectPlaidButton />
      </View>

      <Separator />

      {/* ── Exchange accounts ─────────────────────────────── */}
      <SettingsSectionHeader title="Exchange Accounts" />

      <View className="gap-2">
        <ExchangeComingSoonRow
          name="Coinbase"
          icon={
            <View className="h-9 w-9 items-center justify-center rounded-full bg-blue-50">
              <Ionicons name="logo-bitcoin" size={18} color="#2563eb" />
            </View>
          }
        />
        <ExchangeComingSoonRow
          name="Binance"
          icon={
            <View className="h-9 w-9 items-center justify-center rounded-full bg-yellow-50">
              <Ionicons name="swap-horizontal-outline" size={18} color="#d97706" />
            </View>
          }
        />
        <ExchangeComingSoonRow
          name="Kraken"
          icon={
            <View className="h-9 w-9 items-center justify-center rounded-full bg-purple-50">
              <Ionicons name="trending-up-outline" size={18} color="#7c3aed" />
            </View>
          }
        />
      </View>
    </RNScrollView>
  );
}
