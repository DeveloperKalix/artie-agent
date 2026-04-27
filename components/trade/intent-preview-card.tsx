import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { IntentStatusBadge } from '@/components/trade/intent-status-badge';
import { PreviewCountdown, usePreviewCountdown } from '@/components/trade/preview-countdown';
import { formatMoney, formatScheduledFor } from '@/lib/trade/format';
import type { IntentStatus, OrderIntent } from '@/lib/trade/types';
import { tokens } from '@/styles/tokens';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface IntentPreviewCardProps {
  intent: OrderIntent;
  /** Fired when the user taps Confirm. Parent handles the async + result. */
  onConfirm?: () => void;
  /** Fired when the user taps Cancel. */
  onCancel?: () => void;
  /** Fired when the user taps "Re-preview" after the countdown hits 00:00. */
  onRePreview?: () => void;
  /** Parent-driven spinner state. Disables buttons while set. */
  busy?: 'preview' | 'confirm' | 'cancel' | 'ack' | null;
  /**
   * True when `useOrderIntent.confirm()` detected a backend auto-re-preview
   * (stale `snaptrade_trade_id` -> server re-ran preview and returned
   * `status === "previewed"` with newer impact numbers). Drives the
   * "prices changed" banner + the flash animation on the impact rows.
   */
  rePreviewed?: boolean;
  /** Compact mode for sheet rows — strips action buttons, keeps summary. */
  compact?: boolean;
  /** Optional inline error message (e.g. from risk-check 422). */
  errorMessage?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTIVE_CTA_STATES: readonly IntentStatus[] = [
  'awaiting_confirmation',
  'previewed',
] as const;

function canConfirm(status: IntentStatus): boolean {
  return (ACTIVE_CTA_STATES as readonly IntentStatus[]).includes(status);
}

function canCancel(status: IntentStatus): boolean {
  // Pre-submit and open orders are cancellable per phase-6 § 3.4.
  return (
    status === 'awaiting_confirmation' ||
    status === 'previewed' ||
    status === 'confirmed' ||
    status === 'scheduled_for_market_open' ||
    status === 'submitted'
  );
}

// ---------------------------------------------------------------------------
// Flash animation for refreshed impact numbers
// ---------------------------------------------------------------------------

function useRePreviewFlash(active: boolean) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    Animated.sequence([
      Animated.timing(value, { toValue: 1, duration: 180, useNativeDriver: false }),
      Animated.timing(value, { toValue: 0, duration: 1200, useNativeDriver: false }),
    ]).start();
  }, [active, value]);
  // Interpolate between transparent and a soft yellow to attract attention
  // without making the card feel like an error state.
  return value.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(251, 191, 36, 0)', 'rgba(251, 191, 36, 0.35)'],
  });
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function IntentPreviewCard({
  intent,
  onConfirm,
  onCancel,
  onRePreview,
  busy = null,
  rePreviewed = false,
  compact = false,
  errorMessage = null,
}: IntentPreviewCardProps) {
  const { status, symbol, action, asset_class, impact, scheduled_for } = intent;
  const { expired } = usePreviewCountdown(impact?.expires_at ?? null);
  const flashBg = useRePreviewFlash(rePreviewed);

  const actionTone = action === 'buy' ? s.actionBuy : s.actionSell;

  // ── Terminal-ish state overlays ──────────────────────────────────────────
  const isScheduled = status === 'scheduled_for_market_open';
  const isSubmitted = status === 'submitted' || status === 'confirmed';
  const isFilled = status === 'filled';
  const isCancelled = status === 'cancelled';
  const isFailed = status === 'failed' || status === 'rejected';

  return (
    <View style={[s.card, compact && s.cardCompact]}>
      {/* Header — action pill + ticker + badge */}
      <View style={s.header}>
        <View style={[s.actionPill, actionTone]}>
          <Ionicons
            name={action === 'buy' ? 'arrow-up' : 'arrow-down'}
            size={14}
            color="#ffffff"
          />
          <Text style={s.actionLabel}>{action.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.symbol} numberOfLines={1}>
            {symbol}
          </Text>
          <Text style={s.assetClass}>{asset_class === 'crypto' ? 'Crypto' : 'Equity'}</Text>
        </View>
        <IntentStatusBadge status={status} compact={compact} />
      </View>

      {/* Re-previewed banner — shown only when the backend silently refreshed. */}
      {rePreviewed ? (
        <View style={s.rePreviewBanner}>
          <Ionicons name="sparkles" size={14} color="#92400e" />
          <Text style={s.rePreviewText}>
            Prices changed while you were away. Review the refreshed numbers and
            confirm again.
          </Text>
        </View>
      ) : null}

      {/* Error banner (e.g. 422 risk-check) */}
      {errorMessage ? (
        <View style={s.errorBanner}>
          <Ionicons name="warning" size={14} color="#b91c1c" />
          <Text style={s.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Scheduled-for-market-open banner */}
      {isScheduled && scheduled_for ? (
        <View style={s.scheduledBanner}>
          <Ionicons name="calendar-outline" size={16} color="#15803d" />
          <Text style={s.scheduledText}>
            Markets closed — we'll re-surface this for you {formatScheduledFor(scheduled_for)}.
          </Text>
        </View>
      ) : null}

      {/* Impact rows — animated BG flashes on re-preview */}
      <Animated.View style={[s.impactBlock, { backgroundColor: flashBg }]}>
        <ImpactRow label="Estimated value" value={formatMoney(impact?.estimated_value, impact?.currency ?? null)} />
        {impact?.commission != null ? (
          <ImpactRow
            label="Commission"
            value={formatMoney(impact.commission, impact.currency ?? null)}
          />
        ) : null}
        {impact?.remaining_buying_power != null ? (
          <ImpactRow
            label="Remaining buying power"
            value={formatMoney(impact.remaining_buying_power, impact.currency ?? null)}
          />
        ) : null}
        {impact?.units != null ? (
          <ImpactRow label="Units" value={String(impact.units)} />
        ) : null}
      </Animated.View>

      {/* Warnings */}
      {impact?.warnings && impact.warnings.length > 0 ? (
        <View style={s.warningBox}>
          {impact.warnings.map((w, i) => (
            <View key={i} style={s.warningRow}>
              <Ionicons name="alert-circle-outline" size={14} color="#b45309" />
              <Text style={s.warningText}>{w}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Countdown + actions */}
      {!compact ? (
        <View style={s.footer}>
          <PreviewCountdown expiresAt={impact?.expires_at ?? null} />
          <View style={{ flex: 1 }} />
          {renderActions({
            status,
            expired,
            busy,
            onConfirm,
            onCancel,
            onRePreview,
            isScheduled,
            isSubmitted,
            isFilled,
            isCancelled,
            isFailed,
          })}
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Action button row — extracted so the polling overlay states stay readable.
// ---------------------------------------------------------------------------

function renderActions(args: {
  status: IntentStatus;
  expired: boolean;
  busy: IntentPreviewCardProps['busy'];
  onConfirm?: () => void;
  onCancel?: () => void;
  onRePreview?: () => void;
  isScheduled: boolean;
  isSubmitted: boolean;
  isFilled: boolean;
  isCancelled: boolean;
  isFailed: boolean;
}) {
  const {
    status,
    expired,
    busy,
    onConfirm,
    onCancel,
    onRePreview,
    isScheduled,
    isSubmitted,
    isFilled,
    isCancelled,
    isFailed,
  } = args;

  // Submitted / polling: small spinner inline instead of buttons so the user
  // knows we're waiting on the broker.
  if (isSubmitted) {
    return (
      <View style={s.submittedRow}>
        <ActivityIndicator size="small" color={tokens.color.brandTealDark} />
        <Text style={s.submittedLabel}>Polling broker…</Text>
      </View>
    );
  }

  if (isFilled) {
    return (
      <View style={s.submittedRow}>
        <Ionicons name="checkmark-circle" size={18} color="#15803d" />
        <Text style={[s.submittedLabel, { color: '#15803d' }]}>Order filled</Text>
      </View>
    );
  }

  if (isCancelled) {
    return (
      <View style={s.submittedRow}>
        <Ionicons name="close-circle-outline" size={18} color="#475569" />
        <Text style={[s.submittedLabel, { color: '#475569' }]}>Order cancelled</Text>
      </View>
    );
  }

  if (isFailed) {
    // Parent card has already shown the error banner; offer retry via re-preview.
    return (
      <TouchableOpacity
        style={[s.btn, s.btnGhost]}
        activeOpacity={0.85}
        onPress={onRePreview}
        disabled={busy !== null}>
        <Text style={s.btnGhostLabel}>Try again</Text>
      </TouchableOpacity>
    );
  }

  if (isScheduled) {
    // Give users a way to cancel a scheduled order without going to the sheet.
    return (
      <TouchableOpacity
        style={[s.btn, s.btnGhost]}
        activeOpacity={0.85}
        onPress={onCancel}
        disabled={busy !== null}>
        <Text style={s.btnGhostLabel}>
          {busy === 'cancel' ? 'Cancelling…' : 'Cancel order'}
        </Text>
      </TouchableOpacity>
    );
  }

  // Default: preview/awaiting_confirmation — show Cancel + Confirm (or Re-preview).
  const confirmLabel = expired ? 'Re-preview' : 'Confirm';
  const onConfirmTap = expired ? onRePreview : onConfirm;

  return (
    <View style={s.actionsRow}>
      <TouchableOpacity
        style={[s.btn, s.btnGhost, busy !== null && { opacity: 0.5 }]}
        activeOpacity={0.85}
        onPress={onCancel}
        disabled={busy !== null}>
        <Text style={s.btnGhostLabel}>
          {busy === 'cancel' ? 'Cancelling…' : 'Cancel'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          s.btn,
          s.btnPrimary,
          (busy !== null || !canConfirm(status)) && { opacity: 0.5 },
        ]}
        activeOpacity={0.85}
        onPress={onConfirmTap}
        disabled={busy !== null || !canConfirm(status)}>
        {busy === 'confirm' || busy === 'preview' ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={s.btnPrimaryLabel}>{confirmLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Impact row
// ---------------------------------------------------------------------------

function ImpactRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.impactRow}>
      <Text style={s.impactLabel}>{label}</Text>
      <Text style={s.impactValue}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

// Suppress unused locals so reviewers don't need to wonder why certain helpers
// are kept in the file — they're intentionally exported-adjacent shape guards.
void canCancel;

const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardCompact: {
    padding: 12,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  actionBuy: { backgroundColor: '#15803d' },
  actionSell: { backgroundColor: '#b91c1c' },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  symbol: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  assetClass: { marginTop: 1, fontSize: 11, color: '#64748b' },

  rePreviewBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fef3c7',
    padding: 10,
  },
  rePreviewText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: '#92400e',
    fontWeight: '500',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    padding: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: '#b91c1c',
  },

  scheduledBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    padding: 10,
  },
  scheduledText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: '#15803d',
  },

  impactBlock: {
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  impactLabel: { fontSize: 13, color: '#64748b' },
  impactValue: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontVariant: ['tabular-nums'] },

  warningBox: {
    gap: 4,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#b45309',
    lineHeight: 16,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: tokens.color.brandTealDark,
  },
  btnPrimaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  btnGhost: {
    backgroundColor: '#f1f5f9',
  },
  btnGhostLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },

  submittedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submittedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.color.brandTealDark,
  },
});
