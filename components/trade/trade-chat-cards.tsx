import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { IntentPreviewCard } from '@/components/trade/intent-preview-card';
import { useOrderIntent } from '@/components/trade/use-order-intent';
import { getOrderIntent } from '@/lib/trade/api';
import type { OrderIntent } from '@/lib/trade/types';
import { alertError } from '@/lib/api/error-alert';
import { useAuth } from '@/context/auth-context';
import { tokens } from '@/styles/tokens';

// ---------------------------------------------------------------------------
// Shared: small helper to hydrate an intent when the chat metadata only
// carries the id. The bubble re-mounts per message so we keep this local —
// no global store needed.
// ---------------------------------------------------------------------------

function useHydratedIntent(intentId: string): {
  initial: OrderIntent | null;
  loading: boolean;
  error: string | null;
} {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  const [initial, setInitial] = useState<OrderIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (!token || !userId) return;
    if (fetched.current) return;
    fetched.current = true;
    (async () => {
      const { data, error: err } = await getOrderIntent(token, userId, intentId);
      if (err || !data) {
        setError(err ?? 'Could not load order.');
        setLoading(false);
        return;
      }
      setInitial(data.intent);
      setLoading(false);
    })();
  }, [token, userId, intentId]);

  return { initial, loading, error };
}

// ---------------------------------------------------------------------------
// TradeProposalCard — LLM tool-call `propose_order`
// ---------------------------------------------------------------------------

export function TradeProposalCard({ intentId }: { intentId: string }) {
  const hydration = useHydratedIntent(intentId);
  const ctrl = useOrderIntent(intentId, hydration.initial ?? undefined);

  const onConfirm = useCallback(async () => {
    const next = await ctrl.confirm();
    if (!next && ctrl.lastError) {
      alertError('Confirm failed', ctrl.lastError.message);
    }
  }, [ctrl]);

  const onCancel = useCallback(async () => {
    const next = await ctrl.cancel();
    if (!next && ctrl.lastError) {
      alertError('Cancel failed', ctrl.lastError.message);
    }
  }, [ctrl]);

  const onRePreview = useCallback(async () => {
    const next = await ctrl.preview();
    if (!next && ctrl.lastError) {
      alertError('Re-preview failed', ctrl.lastError.message);
    }
  }, [ctrl]);

  return (
    <ChatCardShell>
      <ChatCardBody
        loading={hydration.loading && !ctrl.intent}
        error={hydration.error}
        intent={ctrl.intent}
        busy={ctrl.busy}
        rePreviewed={ctrl.rePreviewed}
        lastErrorMessage={ctrl.lastError?.message ?? null}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onRePreview={onRePreview}
      />
    </ChatCardShell>
  );
}

// ---------------------------------------------------------------------------
// TradeReminderCard — scheduler wake-up
// ---------------------------------------------------------------------------

export function TradeReminderCard({ intentId }: { intentId: string }) {
  const hydration = useHydratedIntent(intentId);
  const ctrl = useOrderIntent(intentId, hydration.initial ?? undefined);

  // Reminders fire `POST /acknowledge` after the user takes terminal action so
  // the reminder drops out of the pending queue.
  const acknowledgeIfTerminal = useCallback(
    async (next: OrderIntent | null) => {
      if (!next) return;
      const terminalish =
        next.status === 'submitted' ||
        next.status === 'cancelled' ||
        next.status === 'filled' ||
        next.status === 'failed' ||
        next.status === 'rejected' ||
        next.status === 'scheduled_for_market_open';
      if (terminalish) {
        // Fire-and-forget; this cleans the reminders queue but isn't
        // user-visible so we don't surface errors.
        await ctrl.acknowledge();
      }
    },
    [ctrl],
  );

  const onConfirm = useCallback(async () => {
    const next = await ctrl.confirm();
    if (!next && ctrl.lastError) {
      alertError('Confirm failed', ctrl.lastError.message);
      return;
    }
    // IMPORTANT: after a reminder-flow confirm, the backend almost always
    // auto-re-previews (the original `snaptrade_trade_id` is stale by
    // definition once market opens). In that case `ctrl.rePreviewed === true`
    // and `status === 'previewed'` — we DO NOT ack yet. Only ack once the
    // user confirms the refreshed preview (`status === 'submitted'` or
    // the user cancels).
    await acknowledgeIfTerminal(next);
  }, [ctrl, acknowledgeIfTerminal]);

  const onCancel = useCallback(async () => {
    const next = await ctrl.cancel();
    if (!next && ctrl.lastError) {
      alertError('Cancel failed', ctrl.lastError.message);
      return;
    }
    await acknowledgeIfTerminal(next);
  }, [ctrl, acknowledgeIfTerminal]);

  const onRePreview = useCallback(async () => {
    const next = await ctrl.preview();
    if (!next && ctrl.lastError) {
      alertError('Re-preview failed', ctrl.lastError.message);
    }
  }, [ctrl]);

  return (
    <ChatCardShell reminder>
      <ChatCardBody
        loading={hydration.loading && !ctrl.intent}
        error={hydration.error}
        intent={ctrl.intent}
        busy={ctrl.busy}
        rePreviewed={ctrl.rePreviewed}
        lastErrorMessage={ctrl.lastError?.message ?? null}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onRePreview={onRePreview}
        reminderHeader="Market just opened — re-confirm?"
      />
    </ChatCardShell>
  );
}

// ---------------------------------------------------------------------------
// Shared shell / body
// ---------------------------------------------------------------------------

function ChatCardShell({
  children,
  reminder = false,
}: {
  children: React.ReactNode;
  reminder?: boolean;
}) {
  return (
    <View style={s.wrap}>
      {reminder ? (
        <View style={s.reminderFlag}>
          <Text style={s.reminderFlagText}>Reminder</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

function ChatCardBody({
  loading,
  error,
  intent,
  busy,
  rePreviewed,
  lastErrorMessage,
  onConfirm,
  onCancel,
  onRePreview,
  reminderHeader,
}: {
  loading: boolean;
  error: string | null;
  intent: OrderIntent | null;
  busy: ReturnType<typeof useOrderIntent>['busy'];
  rePreviewed: boolean;
  lastErrorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  onRePreview: () => void;
  reminderHeader?: string;
}) {
  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={tokens.color.brandTealDark} />
        <Text style={s.loadingText}>Loading order…</Text>
      </View>
    );
  }

  if (error || !intent) {
    return (
      <View style={s.errorCard}>
        <Text style={s.errorText}>{error ?? 'This order is no longer available.'}</Text>
      </View>
    );
  }

  return (
    <View>
      {reminderHeader ? <Text style={s.reminderHeader}>{reminderHeader}</Text> : null}
      <IntentPreviewCard
        intent={intent}
        busy={busy}
        rePreviewed={rePreviewed}
        errorMessage={lastErrorMessage}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onRePreview={onRePreview}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginBottom: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  reminderFlag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  reminderFlagText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#92400e',
  },
  reminderHeader: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  loadingText: { fontSize: 13, color: '#64748b' },
  errorCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  errorText: { fontSize: 13, color: '#b91c1c' },
});
