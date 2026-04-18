import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';

import { query } from '@/lib/api/query';
import { useAuth } from '@/context/auth-context';

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
  /** True while the Plaid Link flow (get token → open browser → exchange) is in progress. */
  linkingBank: boolean;
  /** Error message from the last Plaid connect attempt, or null. */
  linkError: string | null;
  /** Start the full Plaid Link → exchange flow. */
  connectBank: () => Promise<void>;
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
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function IntegrationsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [exchangeAccounts, setExchangeAccounts] = useState<ExchangeAccount[]>([]);
  const [bankStatus, setBankStatus] = useState<IntegrationsLoadingState>('idle');
  const [exchangeStatus, setExchangeStatus] = useState<IntegrationsLoadingState>('idle');
  const [bankError, setBankError] = useState<string | null>(null);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [linkingBank, setLinkingBank] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const refreshBankAccounts = useCallback(async () => {
    setBankStatus('loading');
    setBankError(null);
    const { data, error } = await query<BankAccount[]>('/plaid/accounts', { token });
    if (error) {
      setBankError(error);
      setBankStatus('error');
    } else {
      setBankAccounts(data ?? []);
      setBankStatus('success');
    }
  }, [token]);

  const refreshExchangeAccounts = useCallback(async () => {
    setExchangeStatus('loading');
    setExchangeError(null);
    const { data, error } = await query<ExchangeAccount[]>('/exchanges/accounts', { token });
    if (error) {
      setExchangeError(error);
      setExchangeStatus('error');
    } else {
      setExchangeAccounts(data ?? []);
      setExchangeStatus('success');
    }
  }, [token]);

  // Auto-fetch when a session token is available; reset to idle when signed out.
  useEffect(() => {
    if (token) {
      void refreshBankAccounts();
      void refreshExchangeAccounts();
    } else {
      setBankAccounts([]);
      setExchangeAccounts([]);
      setBankStatus('idle');
      setExchangeStatus('idle');
    }
  }, [token, refreshBankAccounts, refreshExchangeAccounts]);

  const connectBank = useCallback(async () => {
    if (!token || !session?.user?.id) {
      setLinkError('You must be signed in to connect a bank account.');
      return;
    }

    setLinkingBank(true);
    setLinkError(null);

    try {
      // Step 1 — ask the backend for a link_token
      const { data: linkData, error: linkErr } = await query<{ link_token: string }>(
        '/api/v1/plaid/link_token',
        {
          method: 'POST',
          token,
          body: { user_id: session.user.id },
        },
      );

      if (linkErr || !linkData?.link_token) {
        setLinkError(linkErr ?? 'Failed to get Plaid link token.');
        return;
      }

      // Step 2 — open Plaid's hosted Link UI
      // Plaid's OAuth redirect sends the public_token as a query param on the redirect URI.
      const plaidUrl = `https://cdn.plaid.com/link/v2/stable/link.html?token=${linkData.link_token}`;
      const redirectUri = 'artie://plaid-callback';

      const result = await WebBrowser.openAuthSessionAsync(plaidUrl, redirectUri);

      if (result.type !== 'success' || !result.url) {
        // User cancelled or browser closed without a callback — not an error.
        return;
      }

      // Step 3 — extract public_token from the redirect URL
      const url = new URL(result.url);
      const publicToken = url.searchParams.get('public_token');

      if (!publicToken) {
        setLinkError('Plaid did not return a public token. Please try again.');
        return;
      }

      // Step 4 — exchange public_token for a stored access_token
      const { error: exchangeErr } = await query('/api/v1/plaid/exchange', {
        method: 'POST',
        token,
        body: { public_token: publicToken, user_id: session.user.id },
      });

      if (exchangeErr) {
        setLinkError(exchangeErr);
        return;
      }

      // Step 5 — re-fetch accounts so the new bank appears immediately
      await refreshBankAccounts();
    } finally {
      setLinkingBank(false);
    }
  }, [token, session?.user?.id, refreshBankAccounts]);

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
