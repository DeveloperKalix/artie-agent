import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BankAccount, ExchangeAccount, useIntegrations } from './integrations-states';

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

function formatCurrency(amount: number | null | undefined, currency = 'USD') {
  const n = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
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

function BankAccountRow({ account }: { account: BankAccount }) {
  return (
    <View className="flex-row items-center justify-between py-3">
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
    </View>
  );
}

// ---------------------------------------------------------------------------
// Exchange account row (placeholder for future integrations)
// ---------------------------------------------------------------------------

function ExchangeAccountRow({ account }: { account: ExchangeAccount }) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
          <Ionicons name="swap-horizontal-outline" size={20} color="#4f46e5" />
        </View>
        <View>
          <Text className="text-sm font-semibold text-slate-900">{account.label}</Text>
          <Text className="text-xs text-slate-400">{account.exchange_name}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
    </View>
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
  const { bankAccounts, bankStatus, bankError } = useIntegrations();

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
              <BankAccountRow account={acct} />
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
  const { exchangeAccounts, exchangeStatus, exchangeError } = useIntegrations();

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
              <ExchangeAccountRow account={acct} />
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
