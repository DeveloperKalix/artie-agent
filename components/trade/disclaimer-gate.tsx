import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { tokens } from '@/styles/tokens';

interface DisclaimerGateProps {
  /** From `useTradeStatus`; controls whether we render the gate at all. */
  acknowledged: boolean;
  /** Hide the inline CTA — used inside compact sheet rows. */
  inline?: boolean;
}

/**
 * Banner shown above every trade-related card when the disclaimer hasn't been
 * acknowledged. Per phase-6 § 4.5, the entire trading UI must be disabled
 * until the user accepts. We route them to `/profile` which hosts the
 * acknowledgement button.
 *
 * Renders `null` when `acknowledged === true` so parents can drop this in
 * unconditionally.
 */
export function DisclaimerGate({ acknowledged, inline = false }: DisclaimerGateProps) {
  const router = useRouter();
  if (acknowledged) return null;

  return (
    <View style={[s.banner, inline && s.bannerInline]}>
      <View style={s.iconWrap}>
        <Ionicons name="shield-outline" size={18} color={tokens.color.brandTealDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>Acknowledge the trading disclaimer</Text>
        <Text style={s.body}>
          Before Artie can place orders we need you to confirm you understand
          the risks. This takes five seconds.
        </Text>
      </View>
      {inline ? null : (
        <TouchableOpacity
          style={s.cta}
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/profile')}>
          <Text style={s.ctaLabel}>Review</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99f6e4',
    backgroundColor: '#ecfeff',
  },
  bannerInline: {
    paddingVertical: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  body: {
    marginTop: 2,
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  cta: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: tokens.color.brandTealDark,
  },
  ctaLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});
