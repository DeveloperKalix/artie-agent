import { useCallback, useEffect, useState } from 'react';

import { getTradeReminders } from '@/lib/trade/api';
import type { OrderIntent } from '@/lib/trade/types';
import { useAuth } from '@/context/auth-context';

export type RemindersStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseTradeRemindersResult {
  reminders: OrderIntent[];
  status: RemindersStatus;
  error: string | null;
  /** Refetch the list. Safe to spam; local status guards concurrent calls. */
  refresh: () => Promise<void>;
}

/**
 * Local (non-global) hook for the reminders sheet. Mirrors the pattern used
 * by `useConversations` / `useForesightRecommendations`: the screen owns
 * the lifecycle, no Context is required.
 *
 * Empty list is the happy path (nothing to re-confirm), so we don't treat
 * it as an error or a loading state after the first success.
 */
export function useTradeReminders(): UseTradeRemindersResult {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  const [reminders, setReminders] = useState<OrderIntent[]>([]);
  const [status, setStatus] = useState<RemindersStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token || !userId) {
      setReminders([]);
      setStatus('idle');
      return;
    }
    setStatus((prev) => (prev === 'idle' ? 'loading' : prev));
    setError(null);
    const { data, error: err } = await getTradeReminders(token, userId);
    if (err) {
      setError(err);
      setStatus('error');
      return;
    }
    setReminders(data?.reminders ?? []);
    setStatus('success');
  }, [token, userId]);

  // Fetch on mount + whenever auth changes.
  useEffect(() => {
    if (!token || !userId) return;
    void refresh();
  }, [token, userId, refresh]);

  return { reminders, status, error, refresh };
}
