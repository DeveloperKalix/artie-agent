import { StyleSheet, Text, View } from 'react-native';

import { formatIntentStatus } from '@/lib/trade/format';
import type { IntentStatus } from '@/lib/trade/types';
import { tokens } from '@/styles/tokens';

interface IntentStatusBadgeProps {
  status: IntentStatus;
  /** Smaller type for dense sheet rows. */
  compact?: boolean;
}

/**
 * Pill showing the current `IntentStatus` with semantic colouring. Used by the
 * preview card header, the orders-history rows, and the reminders sheet.
 */
export function IntentStatusBadge({ status, compact = false }: IntentStatusBadgeProps) {
  const palette = paletteFor(status);
  return (
    <View
      style={[
        s.pill,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          paddingHorizontal: compact ? 8 : 10,
          paddingVertical: compact ? 2 : 3,
        },
      ]}>
      <Text
        style={[
          s.label,
          { color: palette.text, fontSize: compact ? 11 : 12 },
        ]}>
        {formatIntentStatus(status)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

interface BadgePalette {
  bg: string;
  border: string;
  text: string;
}

function paletteFor(status: IntentStatus): BadgePalette {
  switch (status) {
    case 'awaiting_confirmation':
    case 'previewed':
      return {
        bg: tokens.color.brandTealLight,
        border: '#99f6e4',
        text: tokens.color.brandTealDark,
      };
    case 'confirmed':
    case 'submitted':
      return { bg: '#dbeafe', border: '#bfdbfe', text: '#1d4ed8' };
    case 'scheduled_for_market_open':
      return { bg: '#fef3c7', border: '#fde68a', text: '#b45309' };
    case 'filled':
      return { bg: '#dcfce7', border: '#bbf7d0', text: '#15803d' };
    case 'cancelled':
      return { bg: '#f1f5f9', border: '#e2e8f0', text: '#475569' };
    case 'failed':
    case 'rejected':
      return { bg: '#fee2e2', border: '#fecaca', text: '#b91c1c' };
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

const s = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
