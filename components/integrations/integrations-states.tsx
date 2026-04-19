import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { query } from '@/lib/api/query';
import {
  fetchSnapTradeAccounts,
  snapTradeAddBroker,
  snapTradeConnect,
} from '@/lib/snaptrade/api';
import type { SnapTradeAccount } from '@/lib/snaptrade/types';
import { useAuth } from '@/context/auth-context';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function listFromResponse<K extends string, T>(
  key: K,
  data: Partial<Record<K, T[] | null>> | null | undefined,
): T[] {
  if (data == null) return [];
  const raw = data[key];
  if (raw == null) return [];
  return Array.isArray(raw) ? raw : [];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BankAccount {
  id: string;
  institution_name: string;
  account_name: string;
  account_type: string;
  mask: string;
  balance_available: number | null;
  balance_current: number;
  currency: string;
}

/** Plaid/API may return nested `balances` + `account_id` / `name`; UI expects flat fields. */
function normalizeBankAccount(raw: Record<string, unknown>): BankAccount {
  const balances =
    raw.balances && typeof raw.balances === 'object'
      ? (raw.balances as Record<string, unknown>)
      : null;

  const pickNum = (...vals: unknown[]): number | null => {
    for (const v of vals) {
      if (typeof v === 'number' && !Number.isNaN(v)) return v;
      if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
      }
    }
    return null;
  };

  const balance_current = pickNum(raw.balance_current, balances?.current) ?? 0;
  const balance_available = pickNum(raw.balance_available, balances?.available);

  const currency =
    (typeof raw.currency === 'string' && raw.currency) ||
    (balances && typeof balances.iso_currency_code === 'string' && balances.iso_currency_code) ||
    (balances &&
      typeof balances.unofficial_currency_code === 'string' &&
      balances.unofficial_currency_code) ||
    'USD';

  return {
    id: String(raw.account_id ?? raw.id ?? ''),
    institution_name: String(raw.institution_name ?? ''),
    account_name: String(raw.name ?? raw.account_name ?? 'Account'),
    account_type: String(raw.type ?? raw.account_type ?? ''),
    mask: String(raw.mask ?? ''),
    balance_available,
    balance_current,
    currency,
  };
}

// Re-export so card / integrations components can import from one place.
export type { SnapTradeAccount };

export type IntegrationsLoadingState = 'idle' | 'loading' | 'success' | 'error';

interface IntegrationsState {
  // ── Bank (Plaid) ──────────────────────────────────────────────────────────
  bankAccounts: BankAccount[];
  bankStatus: IntegrationsLoadingState;
  bankError: string | null;
  refreshBankAccounts: () => Promise<void>;
  linkingBank: boolean;
  linkError: string | null;
  connectBank: () => Promise<void>;

  // ── Exchange (SnapTrade) ──────────────────────────────────────────────────
  exchangeAccounts: SnapTradeAccount[];
  exchangeStatus: IntegrationsLoadingState;
  exchangeError: string | null;
  refreshExchangeAccounts: () => Promise<void>;
  linkingExchange: boolean;
  exchangeLinkError: string | null;
  /** Open the SnapTrade connection portal to add the first or another brokerage. */
  connectSnapTrade: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const IntegrationsContext = createContext<IntegrationsState>({
  bankAccounts: [],
  bankStatus: 'idle',
  bankError: null,
  refreshBankAccounts: async () => {},
  linkingBank: false,
  linkError: null,
  connectBank: async () => {},

  exchangeAccounts: [],
  exchangeStatus: 'idle',
  exchangeError: null,
  refreshExchangeAccounts: async () => {},
  linkingExchange: false,
  exchangeLinkError: null,
  connectSnapTrade: async () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function IntegrationsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  // ── Bank state ─────────────────────────────────────────────────────────────
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankStatus, setBankStatus] = useState<IntegrationsLoadingState>('idle');
  const [bankError, setBankError] = useState<string | null>(null);
  const [linkingBank, setLinkingBank] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // ── Exchange state ─────────────────────────────────────────────────────────
  const [exchangeAccounts, setExchangeAccounts] = useState<SnapTradeAccount[]>([]);
  const [exchangeStatus, setExchangeStatus] = useState<IntegrationsLoadingState>('idle');
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [linkingExchange, setLinkingExchange] = useState(false);
  const [exchangeLinkError, setExchangeLinkError] = useState<string | null>(null);

  // ── Refresh — bank accounts ────────────────────────────────────────────────
  const refreshBankAccounts = useCallback(async () => {
    if (!userId) return;
    setBankStatus('loading');
    setBankError(null);
    const { data, error, status } = await query<{ accounts: Record<string, unknown>[] }>(
      `/api/v1/plaid/accounts?user_id=${encodeURIComponent(userId)}`,
      { token, headers: { 'X-User-Id': userId } },
    );
    if (error) {
      // 5xx means the user probably has no linked item yet — show empty, not error.
      if (status != null && status >= 500) {
        setBankAccounts([]);
        setBankStatus('success');
      } else {
        setBankError(error);
        setBankStatus('error');
      }
    } else {
      const rows = listFromResponse('accounts', data);
      setBankAccounts(rows.map(normalizeBankAccount));
      setBankStatus('success');
    }
  }, [token, userId]);

  // ── Refresh — exchange accounts (SnapTrade) ────────────────────────────────
  const refreshExchangeAccounts = useCallback(async () => {
    if (!userId || !token) return;
    setExchangeStatus('loading');
    setExchangeError(null);
    const { data, error, status } = await fetchSnapTradeAccounts(token, userId);
    if (error) {
      if (status != null && status >= 500) {
        setExchangeAccounts([]);
        setExchangeStatus('success');
      } else {
        setExchangeError(error);
        setExchangeStatus('error');
      }
    } else {
      setExchangeAccounts(listFromResponse('accounts', data));
      setExchangeStatus('success');
    }
  }, [token, userId]);

  // ── Sync on login / logout ─────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !userId) {
      setBankAccounts([]);
      setExchangeAccounts([]);
      setBankStatus('idle');
      setExchangeStatus('idle');
      setBankError(null);
      setExchangeError(null);
      return;
    }
    void refreshBankAccounts();
    void refreshExchangeAccounts();
  }, [token, userId, refreshBankAccounts, refreshExchangeAccounts]);

  // ── Plaid Hosted Link flow ─────────────────────────────────────────────────
  /**
   * 1. POST /api/v1/plaid/link_token → {link_token, hosted_link_url}
   *    (backend calls /link/token/create with hosted_link.completion_redirect_uri = completionUri)
   * 2. Open hosted_link_url in ASWebAuthenticationSession.
   * 3. After user finishes, POST /api/v1/plaid/complete_hosted_link → backend calls
   *    /link/token/get, exchanges public_token for access_token, persists to Supabase.
   * 4. Refresh bank accounts.
   *
   * Works in Expo Go (exp://…) and production builds (artie://…) because
   * Linking.createURL() emits the right scheme for each environment.
   */
  const connectBank = useCallback(async () => {
    if (!token || !userId) {
      setLinkError('You must be signed in to connect a bank account.');
      return;
    }

    setLinkingBank(true);
    setLinkError(null);

    const completionUri = Linking.createURL('plaid-complete');
    console.log('[Plaid] Hosted Link completion URI:', completionUri);

    try {
      const { data: linkData, error: linkErr } = await query<{
        link_token: string;
        hosted_link_url: string;
      }>('/api/v1/plaid/link_token', {
        method: 'POST',
        token,
        body: { user_id: userId, completion_redirect_uri: completionUri },
      });

      if (linkErr || !linkData?.hosted_link_url || !linkData?.link_token) {
        setLinkError(linkErr ?? 'Failed to get Plaid hosted link URL.');
        console.warn('[Plaid] link_token failed:', linkErr);
        return;
      }

      const { link_token, hosted_link_url } = linkData;
      console.log('[Plaid] hosted_link_url OK — opening ASWebAuthenticationSession');

      const result = await WebBrowser.openAuthSessionAsync(hosted_link_url, completionUri);
      console.log('[Plaid] auth session result:', result.type);

      const { data: doneData, error: doneErr } = await query<{
        success?: boolean;
        status?: string;
      }>('/api/v1/plaid/complete_hosted_link', {
        method: 'POST',
        token,
        body: { link_token, user_id: userId },
      });

      if (doneErr) {
        setLinkError(doneErr);
        console.warn('[Plaid] complete_hosted_link failed:', doneErr);
        return;
      }

      if (doneData?.success === false) {
        setLinkError('Plaid link did not complete. Please try again.');
        return;
      }

      console.log('[Plaid] link complete — refreshing accounts');
      await refreshBankAccounts();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unexpected error starting Plaid';
      setLinkError(msg);
      console.warn('[Plaid] connectBank error', e);
    } finally {
      setLinkingBank(false);
    }
  }, [token, userId, refreshBankAccounts]);

  // ── SnapTrade connection flow ──────────────────────────────────────────────
  /**
   * Opens the SnapTrade connection portal in ASWebAuthenticationSession.
   * Uses /connect for first-time users; subsequent calls go to /add-broker
   * (backend decides — both accept the same request shape).
   *
   * `custom_redirect` tells SnapTrade where to deep-link when the user taps
   * "Done", which closes the iOS sheet via the matched URL scheme.
   */
  const connectSnapTrade = useCallback(async () => {
    if (!token || !userId) {
      setExchangeLinkError('You must be signed in to connect an exchange.');
      return;
    }
    setLinkingExchange(true);
    setExchangeLinkError(null);

    const snapTradeCallback = Linking.createURL('snaptrade-complete');

    try {
      // If the user already has SnapTrade accounts, use add-broker so we don't re-register.
      const apiCall =
        exchangeAccounts.length > 0
          ? (t: string, b: Parameters<typeof snapTradeConnect>[1]) => snapTradeAddBroker(t, b)
          : (t: string, b: Parameters<typeof snapTradeConnect>[1]) => snapTradeConnect(t, b);

      const { data, error } = await apiCall(token, {
        user_id: userId,
        custom_redirect: snapTradeCallback,
        connection_type: 'read',
      });

      if (error) {
        setExchangeLinkError(error);
        return;
      }

      const openUrl = data?.redirect_uri ?? data?.url;
      if (!openUrl) {
        setExchangeLinkError('Server did not return a SnapTrade link URL.');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(openUrl, snapTradeCallback);
      console.log('[SnapTrade] auth session result:', result.type);

      // Refresh on both success and cancel: the user may have completed the flow
      // and then manually closed the sheet.
      if (result.type === 'success' || result.type === 'cancel') {
        await refreshExchangeAccounts();
      }
    } finally {
      setLinkingExchange(false);
    }
  }, [token, userId, exchangeAccounts, refreshExchangeAccounts]);

  return (
    <IntegrationsContext.Provider
      value={{
        bankAccounts,
        bankStatus,
        bankError,
        refreshBankAccounts,
        linkingBank,
        linkError,
        connectBank,

        exchangeAccounts,
        exchangeStatus,
        exchangeError,
        refreshExchangeAccounts,
        linkingExchange,
        exchangeLinkError,
        connectSnapTrade,
      }}>
      {children}
    </IntegrationsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useIntegrations() {
  return useContext(IntegrationsContext);
}
