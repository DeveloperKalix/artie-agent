import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getTradeStatus } from '@/lib/trade/api';
import type { TradeStatusResponse } from '@/lib/trade/types';
import { useAuth } from '@/context/auth-context';

export interface UseTradeStatusResult {
  status: TradeStatusResponse | null;
  /** Short-hand for the bell-badge gate; safe to read before first fetch. */
  pendingReminderCount: number;
  /** `trading.disclaimer_acknowledged_at != null` on the profile. */
  disclaimerAcknowledged: boolean;
  tradingEnabled: boolean;
  marketOpen: boolean;
  refresh: () => Promise<void>;
}

/**
 * Mirror of `useRecommendationNotifications`'s read loop, but exposed as a
 * hook that returns the latest `/trade/status` payload for UI gating.
 *
 * Poll cadence: on mount + every AppState 'active' transition. No interval —
 * this endpoint is cheap, and we let the user's natural tab-switches drive
 * freshness.
 */
export function useTradeStatus(): UseTradeStatusResult {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  const [status, setStatus] = useState<TradeStatusResponse | null>(null);
  // Prevent parallel calls if two foreground events fire back-to-back.
  const checking = useRef(false);

  const refresh = useCallback(async () => {
    if (!token || !userId || checking.current) return;
    checking.current = true;
    try {
      const { data } = await getTradeStatus(token, userId);
      if (data) setStatus(data);
    } catch {
      // Silent — badge is best-effort.
    } finally {
      checking.current = false;
    }
  }, [token, userId]);

  useEffect(() => {
    if (!token || !userId) {
      setStatus(null);
      return;
    }
    void refresh();
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void refresh();
    });
    return () => sub.remove();
  }, [token, userId, refresh]);

  return {
    status,
    pendingReminderCount: status?.pending_reminder_count ?? 0,
    disclaimerAcknowledged: status?.disclaimer_acknowledged ?? false,
    tradingEnabled: status?.trading_enabled ?? false,
    marketOpen: status?.market_open ?? false,
    refresh,
  };
}
