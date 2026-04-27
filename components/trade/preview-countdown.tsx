import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { countdownTo, formatCountdown } from '@/lib/trade/format';

// ---------------------------------------------------------------------------
// Hook — exposed so the parent card can branch on `expired` without rendering
// the view.
// ---------------------------------------------------------------------------

export interface UsePreviewCountdownResult {
  remainingMs: number;
  expired: boolean;
  /** `mm:ss` — 00:00 once expired. */
  label: string;
}

/**
 * Tick once per second. We intentionally don't use `requestAnimationFrame`
 * here; sub-second precision is wasted for a `mm:ss` display and a setInterval
 * is cheaper on React Native.
 */
export function usePreviewCountdown(expiresAt: string | null | undefined): UsePreviewCountdownResult {
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    if (countdownTo(expiresAt) <= 0) return;
    timerRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [expiresAt]);

  const remainingMs = countdownTo(expiresAt ?? null, now);
  return {
    remainingMs,
    expired: !expiresAt || remainingMs <= 0,
    label: formatCountdown(remainingMs),
  };
}

// ---------------------------------------------------------------------------
// View — tiny chip you can drop near the impact numbers.
// ---------------------------------------------------------------------------

interface PreviewCountdownProps {
  expiresAt: string | null | undefined;
  /** Hide when there's nothing to show. Defaults to false so the layout stays stable. */
  hideWhenExpired?: boolean;
}

export function PreviewCountdown({ expiresAt, hideWhenExpired = false }: PreviewCountdownProps) {
  const { remainingMs, expired, label } = usePreviewCountdown(expiresAt);

  if (expired && hideWhenExpired) return null;
  if (!expiresAt) return null;

  const iconColor = expired ? '#b91c1c' : '#475569';
  const textColor = expired ? '#b91c1c' : '#334155';

  return (
    <View
      style={[
        s.wrap,
        {
          backgroundColor: expired ? '#fee2e2' : '#f1f5f9',
          borderColor: expired ? '#fecaca' : '#e2e8f0',
        },
      ]}>
      <Ionicons name={expired ? 'alert-circle' : 'time-outline'} size={14} color={iconColor} />
      <Text style={[s.label, { color: textColor }]}>
        {expired ? 'Expired' : label}
        {expired ? null : remainingMs < 30_000 ? ' · expiring soon' : ''}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
