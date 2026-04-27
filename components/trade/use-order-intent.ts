import { useCallback, useEffect, useRef, useState } from 'react';

import {
  acknowledgeOrderIntent,
  cancelOrderIntent,
  confirmOrderIntent,
  getOrderIntent,
  previewOrderIntent,
} from '@/lib/trade/api';
import { handleTradeError, type TradeErrorResolution } from '@/lib/trade/errors';
import {
  isPollableStatus,
  isTerminalStatus,
  type OrderIntent,
} from '@/lib/trade/types';
import { useAuth } from '@/context/auth-context';

// ---------------------------------------------------------------------------
// Polling constants
// ---------------------------------------------------------------------------

/** How often we poll detail while status is pollable (submitted/confirmed). */
const POLL_INTERVAL_MS = 3_000;
/** Hard ceiling per phase-6 § 5 so we never spin forever. */
const POLL_MAX_DURATION_MS = 2 * 60 * 1000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrderIntentBusy = 'preview' | 'confirm' | 'cancel' | 'ack' | null;

export interface UseOrderIntentResult {
  intent: OrderIntent | null;
  busy: OrderIntentBusy;
  /** Last resolution from `handleTradeError` — null while happy. */
  lastError: TradeErrorResolution | null;
  /**
   * True after a `confirm()` call that came back with `status === "previewed"`
   * (i.e. the backend auto-re-previewed because the old `snaptrade_trade_id`
   * expired). The IntentPreviewCard uses this to show a "prices changed"
   * banner and flash the impact rows.
   */
  rePreviewed: boolean;
  /** Clears `rePreviewed` once the UI has flashed the refreshed numbers. */
  dismissRePreviewed: () => void;

  refresh: () => Promise<OrderIntent | null>;
  preview: () => Promise<OrderIntent | null>;
  confirm: () => Promise<OrderIntent | null>;
  cancel: () => Promise<OrderIntent | null>;
  acknowledge: () => Promise<OrderIntent | null>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Per-intent state machine. One mount per card/row — so the chat proposal
 * card, the reminder sheet row, and the orders-history detail row all share
 * the same surface area without any global context.
 *
 * Critical behaviours:
 *   - **Auto-re-preview on confirm**: when the backend detects a stale
 *     `snaptrade_trade_id` it re-runs preview server-side and returns the
 *     intent with `status === "previewed"` instead of `submitted`. We
 *     surface this via `rePreviewed === true` so the UI can flash the new
 *     numbers rather than assume the confirm went through.
 *   - **Terminal polling**: once the user confirms and status is pollable
 *     (submitted/confirmed), we GET detail every 3 s until status is
 *     terminal or 2 minutes elapses. Hard cap prevents runaway polling if
 *     the broker loses the order id.
 *   - **Errors**: every call returns `intent | null`; on failure, `lastError`
 *     holds a user-facing resolution from `handleTradeError`. Callers
 *     choose whether to toast, alert, or route.
 */
export function useOrderIntent(
  intentId: string,
  initial?: OrderIntent,
): UseOrderIntentResult {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  const [intent, setIntent] = useState<OrderIntent | null>(initial ?? null);
  const [busy, setBusy] = useState<OrderIntentBusy>(null);
  const [lastError, setLastError] = useState<TradeErrorResolution | null>(null);
  const [rePreviewed, setRePreviewed] = useState(false);

  // Track previous `impact.previewed_at` / `impact_expires_at` across the
  // confirm call so we can detect "backend re-previewed" vs the original
  // preview being returned unchanged. Keyed on intent id so switching
  // between cards doesn't leak state.
  const preConfirmExpiresRef = useRef<string | null>(null);

  // Polling cleanup id kept in a ref to survive re-renders + unmount.
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current != null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // ── Raw detail fetch (used by refresh + poll) ────────────────────────────
  const fetchDetail = useCallback(async (): Promise<OrderIntent | null> => {
    if (!token || !userId) return null;
    const { data, error, status } = await getOrderIntent(token, userId, intentId);
    if (error || !data) {
      setLastError(handleTradeError(status, error));
      return null;
    }
    setIntent(data.intent);
    setLastError(null);
    return data.intent;
  }, [token, userId, intentId]);

  const refresh = useCallback(async () => fetchDetail(), [fetchDetail]);

  // ── Preview ──────────────────────────────────────────────────────────────
  const preview = useCallback(async (): Promise<OrderIntent | null> => {
    if (!token || !userId) return null;
    setBusy('preview');
    setLastError(null);
    const { data, error, status } = await previewOrderIntent(token, userId, intentId);
    setBusy(null);
    if (error || !data) {
      setLastError(handleTradeError(status, error));
      return null;
    }
    setIntent(data.intent);
    setRePreviewed(false);
    return data.intent;
  }, [token, userId, intentId]);

  // ── Confirm — with auto-re-preview detection ─────────────────────────────
  const confirm = useCallback(async (): Promise<OrderIntent | null> => {
    if (!token || !userId) return null;

    // Capture the pre-confirm preview anchor so we can detect the
    // server-side auto-re-preview path. If the response comes back with the
    // same `impact_expires_at`, the confirm landed on the original preview;
    // a NEWER timestamp means the backend refreshed it for us.
    preConfirmExpiresRef.current = intent?.impact_expires_at ?? null;

    setBusy('confirm');
    setLastError(null);
    const { data, error, status } = await confirmOrderIntent(token, userId, intentId);
    setBusy(null);

    if (error || !data) {
      setLastError(handleTradeError(status, error));
      return null;
    }

    setIntent(data.intent);

    // Detect the auto-re-preview path. Two signals we care about:
    //   1. `status === "previewed"` after the confirm call → definitely a re-preview.
    //   2. `impact_expires_at` moved forward → the server issued a new preview
    //      even if the status is technically the same. We surface both.
    const newExpires = data.intent.impact_expires_at ?? null;
    const movedForward =
      !!newExpires &&
      (!preConfirmExpiresRef.current ||
        new Date(newExpires).getTime() >
          new Date(preConfirmExpiresRef.current).getTime());

    const wasRePreviewed = data.intent.status === 'previewed' && movedForward;
    setRePreviewed(wasRePreviewed);

    return data.intent;
  }, [token, userId, intentId, intent?.impact_expires_at]);

  const dismissRePreviewed = useCallback(() => setRePreviewed(false), []);

  // ── Cancel ───────────────────────────────────────────────────────────────
  const cancel = useCallback(async (): Promise<OrderIntent | null> => {
    if (!token || !userId) return null;
    setBusy('cancel');
    setLastError(null);
    const { data, error, status } = await cancelOrderIntent(token, userId, intentId);
    setBusy(null);
    if (error || !data) {
      setLastError(handleTradeError(status, error));
      return null;
    }
    setIntent(data.intent);
    return data.intent;
  }, [token, userId, intentId]);

  // ── Acknowledge (used after reminder action) ─────────────────────────────
  const acknowledge = useCallback(async (): Promise<OrderIntent | null> => {
    if (!token || !userId) return null;
    setBusy('ack');
    const { data, error, status } = await acknowledgeOrderIntent(token, userId, intentId);
    setBusy(null);
    if (error || !data) {
      setLastError(handleTradeError(status, error));
      return null;
    }
    setIntent(data.intent);
    return data.intent;
  }, [token, userId, intentId]);

  // ── Terminal-status polling ──────────────────────────────────────────────
  // Start polling whenever status becomes pollable. Stop on terminal status
  // or after the 2-minute cap so we never leak timers. The effect intentionally
  // re-runs on `intent?.status` changes — this replaces a manual state machine.
  useEffect(() => {
    const currentStatus = intent?.status;
    if (!currentStatus || !token || !userId) return;

    if (!isPollableStatus(currentStatus)) {
      // Not pollable → make sure we aren't running a stale timer from
      // a previous status transition.
      stopPolling();
      return;
    }

    // Starting fresh — reset the clock.
    if (pollTimerRef.current == null) {
      pollStartRef.current = Date.now();
    }

    // Kick off (or keep) the interval.
    if (pollTimerRef.current == null) {
      pollTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - pollStartRef.current;
        if (elapsed > POLL_MAX_DURATION_MS) {
          stopPolling();
          return;
        }
        void fetchDetail().then((next) => {
          if (next && isTerminalStatus(next.status)) {
            stopPolling();
          }
        });
      }, POLL_INTERVAL_MS);
    }

    return () => {
      // We don't tear down on every render — only on unmount or when the
      // effect key changes. Keep the interval alive across intent mutations
      // by letting the inner check decide.
    };
  }, [intent?.status, token, userId, fetchDetail, stopPolling]);

  // Final unmount cleanup.
  useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    intent,
    busy,
    lastError,
    rePreviewed,
    dismissRePreviewed,
    refresh,
    preview,
    confirm,
    cancel,
    acknowledge,
  };
}
