import type { IntentStatus } from './types';

/**
 * Human-friendly label for every `IntentStatus`. Kept out of the badge
 * component so string tests are trivially unit-testable.
 */
export function formatIntentStatus(status: IntentStatus): string {
  switch (status) {
    case 'awaiting_confirmation':
      return 'Awaiting confirmation';
    case 'previewed':
      return 'Previewed';
    case 'confirmed':
      return 'Confirming…';
    case 'scheduled_for_market_open':
      return 'Scheduled';
    case 'submitted':
      return 'Submitted';
    case 'filled':
      return 'Filled';
    case 'cancelled':
      return 'Cancelled';
    case 'failed':
      return 'Failed';
    case 'rejected':
      return 'Rejected';
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

/**
 * Render a `scheduled_for` ISO-8601 in the user's locale with a compact
 * "Mon 9:30 AM" form. Falls back to the raw string on invalid dates so we
 * never hide backend diagnostics behind a formatter crash.
 */
export function formatScheduledFor(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Absolute milliseconds remaining until `expiresAt`. Negative (or null input)
 * returns 0 so callers can treat "expired" and "never set" identically.
 */
export function countdownTo(expiresAt: string | null | undefined, now = Date.now()): number {
  if (!expiresAt) return 0;
  try {
    const t = new Date(expiresAt).getTime();
    if (Number.isNaN(t)) return 0;
    return Math.max(0, t - now);
  } catch {
    return 0;
  }
}

/** `mm:ss` from a millisecond duration. Caps at 99:59 for sanity. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.min(99 * 60 + 59, Math.max(0, Math.floor(ms / 1000)));
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * USD (or arbitrary ISO-currency) formatter that mirrors the rest of the app.
 * Falls back gracefully on missing codes — same defensive guard the
 * integrations card uses.
 */
export function formatMoney(
  amount: number | null | undefined,
  currency: string | null | undefined = 'USD',
): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  const code = (currency ?? 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: /^[A-Z]{3}$/.test(code) ? code : 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}
