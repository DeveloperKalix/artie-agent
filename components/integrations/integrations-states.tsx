import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { query } from '@/lib/api/query';
import { useAuth } from '@/context/auth-context';

/**
 * Normalize `{ accounts: ... }` from GET /plaid/accounts (and similar).
 * - `data` null/undefined → []
 * - `accounts` missing, null, or undefined → [] (not linked vs empty list both become [])
 * - `accounts: []` → [] (zero accounts — valid)
 * - non-array → [] (defensive)
 */
function accountsFromResponse<T>(data: { accounts?: T[] | null } | null | undefined): T[] {
  if (data == null) return [];
  const raw = data.accounts;
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  return [];
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

export interface ExchangeAccount {
  id: string;
  exchange_name: string;
  label: string;
  connected_at: string;
}

export type IntegrationsLoadingState = 'idle' | 'loading' | 'success' | 'error';

interface IntegrationsState {
  bankAccounts: BankAccount[];
  exchangeAccounts: ExchangeAccount[];
  bankStatus: IntegrationsLoadingState;
  exchangeStatus: IntegrationsLoadingState;
  bankError: string | null;
  exchangeError: string | null;
  refreshBankAccounts: () => Promise<void>;
  refreshExchangeAccounts: () => Promise<void>;
  /** True while the Plaid Link flow (hosted link → exchange) is in progress. */
  linkingBank: boolean;
  /** Error message from the last Plaid connect attempt, or null. */
  linkError: string | null;
  /** Start the full Plaid Hosted Link → exchange flow. */
  connectBank: () => Promise<void>;
  /** SnapTrade connection in progress. */
  linkingExchange: boolean;
  exchangeLinkError: string | null;
  /** POST SnapTrade link endpoint and open returned URL in browser. */
  connectSnapTrade: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const IntegrationsContext = createContext<IntegrationsState>({
  bankAccounts: [],
  exchangeAccounts: [],
  bankStatus: 'idle',
  exchangeStatus: 'idle',
  bankError: null,
  exchangeError: null,
  refreshBankAccounts: async () => {},
  refreshExchangeAccounts: async () => {},
  linkingBank: false,
  linkError: null,
  connectBank: async () => {},
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

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [exchangeAccounts, setExchangeAccounts] = useState<ExchangeAccount[]>([]);
  const [bankStatus, setBankStatus] = useState<IntegrationsLoadingState>('idle');
  const [exchangeStatus, setExchangeStatus] = useState<IntegrationsLoadingState>('idle');
  const [bankError, setBankError] = useState<string | null>(null);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [linkingBank, setLinkingBank] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkingExchange, setLinkingExchange] = useState(false);
  const [exchangeLinkError, setExchangeLinkError] = useState<string | null>(null);

  const refreshBankAccounts = useCallback(async () => {
    if (!userId) return;
    setBankStatus('loading');
    setBankError(null);
    const { data, error, status } = await query<{ accounts: BankAccount[] }>(
      `/api/v1/plaid/accounts?user_id=${encodeURIComponent(userId)}`,
      { token, headers: { 'X-User-Id': userId } },
    );
    if (error) {
      if (status != null && status >= 500) {
        setBankAccounts([]);
        setBankStatus('success');
        setBankError(null);
      } else {
        setBankError(error);
        setBankStatus('error');
      }
    } else {
      setBankAccounts(accountsFromResponse<BankAccount>(data));
      setBankStatus('success');
    }
  }, [token, userId]);

  const refreshExchangeAccounts = useCallback(async () => {
    if (!userId) return;
    setExchangeStatus('loading');
    setExchangeError(null);
    const { data, error, status } = await query<{ accounts: ExchangeAccount[] }>(
      `/api/v1/exchanges/accounts?user_id=${encodeURIComponent(userId)}`,
      { token, headers: { 'X-User-Id': userId } },
    );
    if (error) {
      if (status != null && status >= 500) {
        setExchangeAccounts([]);
        setExchangeStatus('success');
        setExchangeError(null);
      } else {
        setExchangeError(error);
        setExchangeStatus('error');
      }
    } else {
      setExchangeAccounts(accountsFromResponse<ExchangeAccount>(data));
      setExchangeStatus('success');
    }
  }, [token, userId]);

  // Pre-fetch when session is ready; clear state when signed out.
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

  /**
   * Plaid Hosted Link flow.
   *
   * 1. Ask backend for a hosted_link_url + link_token. Backend must call Plaid's
   *    /link/token/create with `hosted_link.completion_redirect_uri = <this app's scheme URL>`
   *    and `is_mobile_app: true`.
   * 2. Open `hosted_link_url` in ASWebAuthenticationSession (iOS) / Custom Tab (Android)
   *    via `WebBrowser.openAuthSessionAsync(hostedUrl, completionUri)`.
   * 3. User finishes Plaid inside Plaid's hosted page. Plaid redirects to `completionUri`,
   *    which closes the auth session because it matches our scheme.
   * 4. Call `POST /api/v1/plaid/complete_hosted_link` with the link_token we kept around.
   *    Backend calls Plaid `/link/token/get` to fetch the public_token, then
   *    `/item/public_token/exchange` to get the access_token, and stores it.
   * 5. Refresh accounts.
   *
   * This pattern works in Expo Go because `Linking.createURL()` produces an `exp://...`
   * URL at dev time (which Expo Go handles) and `artie://...` in production builds.
   */
  const connectBank = useCallback(async () => {
    if (!token || !userId) {
      setLinkError('You must be signed in to connect a bank account.');
      return;
    }

    setLinkingBank(true);
    setLinkError(null);

    // Expo Go: exp://192.168.x.x:8081/--/plaid-complete
    // Dev client / prod: artie://plaid-complete
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
        console.warn('[Plaid] link_token failed:', linkErr ?? 'missing hosted_link_url / link_token');
        return;
      }

      const { link_token, hosted_link_url } = linkData;
      console.log('[Plaid] hosted_link_url OK — opening ASWebAuthenticationSession');

      const result = await WebBrowser.openAuthSessionAsync(hosted_link_url, completionUri);
      console.log('[Plaid] auth session result:', result.type);

      if (result.type !== 'success') {
        // User cancelled, dismissed the sheet, or the session was closed without completion.
        // Don't treat as an error unless Plaid told us so. `/link/token/get` is still the
        // source of truth — call it anyway so we catch cases where the user completed and
        // then manually dismissed.
      }

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

  const connectSnapTrade = useCallback(async () => {
    if (!token || !userId) {
      setExchangeLinkError('You must be signed in to connect an exchange.');
      return;
    }
    setLinkingExchange(true);
    setExchangeLinkError(null);
    try {
      const { data, error } = await query<{
        redirect_url?: string;
        url?: string;
        link_url?: string;
      }>('/api/v1/snaptrade/link', {
        method: 'POST',
        token,
        body: { user_id: userId },
      });
      if (error) {
        setExchangeLinkError(error);
        return;
      }
      const openUrl = data?.redirect_url ?? data?.url ?? data?.link_url;
      if (openUrl) {
        const result = await WebBrowser.openAuthSessionAsync(
          openUrl,
          Linking.createURL('snaptrade-complete'),
        );
        if (result.type === 'success') {
          await refreshExchangeAccounts();
        }
      } else {
        setExchangeLinkError('Server did not return a SnapTrade link URL.');
      }
    } finally {
      setLinkingExchange(false);
    }
  }, [token, userId, refreshExchangeAccounts]);

  return (
    <IntegrationsContext.Provider
      value={{
        bankAccounts,
        exchangeAccounts,
        bankStatus,
        exchangeStatus,
        bankError,
        exchangeError,
        refreshBankAccounts,
        refreshExchangeAccounts,
        linkingBank,
        linkError,
        connectBank,
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
