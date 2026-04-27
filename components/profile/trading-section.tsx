import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { alertError } from '@/lib/api/error-alert';
import {
  getTradingConfig,
  patchTradingConfig,
  postTradingDisclaimer,
} from '@/lib/profile/api';
import type {
  PatchTradingConfigRequest,
  TradingConfig,
} from '@/lib/trade/types';
import { useAuth } from '@/context/auth-context';
import { tokens } from '@/styles/tokens';

// ---------------------------------------------------------------------------
// Constants — simple, user-facing clamps for the numeric inputs.
// ---------------------------------------------------------------------------

const MIN_CAP_USD = 0;
const MAX_CAP_USD = 1_000_000;
const DEBOUNCE_MS = 500;

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

/**
 * Trading settings card.
 *
 * Phase-6 rules we enforce inline:
 *   - Until `disclaimer_acknowledged_at != null`, only the disclaimer CTA is
 *     visible. Toggles + inputs are hidden (and the entire trade UI is gated
 *     server-side anyway).
 *   - Toggle PATCHes fire immediately (cheap, debouncable elsewhere).
 *   - Numeric caps debounce by 500 ms so the user can type without hammering
 *     the backend.
 */
export function TradingSection() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  const [config, setConfig] = useState<TradingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ackBusy, setAckBusy] = useState(false);
  const [numericSaving, setNumericSaving] = useState(false);

  // Editable mirrors for the numeric inputs so the TextInput stays controlled
  // without flashing between user typing and server responses.
  const [maxOrderInput, setMaxOrderInput] = useState<string>('');
  const [maxDailyInput, setMaxDailyInput] = useState<string>('');

  // Stable debounce timers (one per field).
  const maxOrderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDailyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initial load ─────────────────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    if (!token || !userId) {
      setConfig(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const { data, error } = await getTradingConfig(token, userId);
    if (error || !data) {
      setLoadError(error ?? 'Could not load trading settings');
      setLoading(false);
      return;
    }
    setConfig(data);
    setMaxOrderInput(String(data.max_order_usd ?? ''));
    setMaxDailyInput(String(data.max_daily_usd ?? ''));
    setLoading(false);
  }, [token, userId]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  // ── Shared patch helper ──────────────────────────────────────────────────
  const patch = useCallback(
    async (body: PatchTradingConfigRequest, onError?: () => void) => {
      if (!token || !userId) return;
      const { data, error } = await patchTradingConfig(token, userId, body);
      if (error || !data) {
        onError?.();
        alertError('Could not update trading settings', error ?? 'Unknown error');
        return;
      }
      setConfig(data);
    },
    [token, userId],
  );

  // ── Disclaimer acknowledgement ───────────────────────────────────────────
  const onAcknowledge = useCallback(async () => {
    if (!token || !userId || ackBusy) return;
    setAckBusy(true);
    const { data, error, status } = await postTradingDisclaimer(token, userId);
    setAckBusy(false);

    if (error || !data) {
      alertError(
        'Could not acknowledge disclaimer',
        error ?? `Server returned ${status ?? 'no response'}`,
      );
      return;
    }

    setConfig(data);
    if (data.max_order_usd != null) setMaxOrderInput(String(data.max_order_usd));
    if (data.max_daily_usd != null) setMaxDailyInput(String(data.max_daily_usd));
  }, [token, userId, ackBusy]);

  // ── Toggles ──────────────────────────────────────────────────────────────
  const onToggleEnabled = useCallback(
    (next: boolean) => {
      if (!config) return;
      setConfig((c) => c ? { ...c, enabled: next } : c);
      void patch({ enabled: next }, () =>
        setConfig((c) => c ? { ...c, enabled: !next } : c),
      );
    },
    [config, patch],
  );

  const onToggleLlmProposals = useCallback(
    (next: boolean) => {
      if (!config) return;
      setConfig((c) => c ? { ...c, llm_proposals_enabled: next } : c);
      void patch({ llm_proposals_enabled: next }, () =>
        setConfig((c) => c ? { ...c, llm_proposals_enabled: !next } : c),
      );
    },
    [config, patch],
  );

  // ── Debounced numeric field writers ──────────────────────────────────────
  const queueNumericPatch = useCallback(
    (
      field: 'max_order_usd' | 'max_daily_usd',
      raw: string,
      timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    ) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const parsed = Number.parseFloat(raw);
        if (!Number.isFinite(parsed)) return;
        const clamped = Math.min(MAX_CAP_USD, Math.max(MIN_CAP_USD, parsed));
        setNumericSaving(true);
        void patch({ [field]: clamped } as PatchTradingConfigRequest).then(() =>
          setNumericSaving(false),
        );
      }, DEBOUNCE_MS);
    },
    [patch],
  );

  const onChangeMaxOrder = useCallback(
    (text: string) => {
      setMaxOrderInput(text);
      queueNumericPatch('max_order_usd', text, maxOrderTimerRef);
    },
    [queueNumericPatch],
  );

  const onChangeMaxDaily = useCallback(
    (text: string) => {
      setMaxDailyInput(text);
      queueNumericPatch('max_daily_usd', text, maxDailyTimerRef);
    },
    [queueNumericPatch],
  );

  // Cleanup timers on unmount.
  useEffect(
    () => () => {
      if (maxOrderTimerRef.current) clearTimeout(maxOrderTimerRef.current);
      if (maxDailyTimerRef.current) clearTimeout(maxDailyTimerRef.current);
    },
    [],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  const acknowledged = useMemo(
    () => !!config?.disclaimer_acknowledged_at,
    [config?.disclaimer_acknowledged_at],
  );


  return (
    <View style={s.card}>
      <View style={s.header}>
        <Text style={s.title}>Trading</Text>
        <Text style={s.subtitle}>
          Artie can place orders on your connected brokerage. Keep the caps
          conservative — every order is confirmed here first.
        </Text>
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={tokens.color.brandTealDark} />
        </View>
      ) : loadError ? (
        <View style={s.errorBox}>
          <Ionicons name="warning-outline" size={20} color="#dc2626" />
          <Text style={s.errorText}>{loadError}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => void loadConfig()}>
            <Text style={s.retryLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !config ? null : !acknowledged ? (
        <View style={s.disclaimerBox}>
          <View style={s.disclaimerIcon}>
            <Ionicons
              name={ackBusy ? 'time-outline' : 'shield-checkmark-outline'}
              size={22}
              color={tokens.color.brandTealDark}
            />
          </View>
          <Text style={s.disclaimerTitle}>Acknowledge the trading disclaimer</Text>
          <Text style={s.disclaimerBody}>
            Artie is not a financial advisor. Orders you confirm here are
            placed with your brokerage at market prices, which may differ from
            the preview. Nothing Artie says is investment advice. You are
            responsible for every order you confirm.
          </Text>
          <TouchableOpacity
            style={[s.cta, ackBusy && s.ctaBusy]}
            activeOpacity={0.85}
            onPress={onAcknowledge}
            disabled={ackBusy}>
            {ackBusy
              ? <ActivityIndicator size="small" color="#ffffff" />
              : <Text style={s.ctaLabel}>I understand</Text>
            }
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.fields}>
          {/* Confirmed banner */}
          <View style={s.acknowledgedBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
            <Text style={s.acknowledgedText}>Disclaimer acknowledged</Text>
          </View>

          <ToggleRow
            label="Enable trading"
            description="Master switch. Off = Artie never places orders."
            value={config.enabled}
            onChange={onToggleEnabled}
          />
          <ToggleRow
            label="Let Artie suggest orders during chat"
            description="When off, Artie answers questions but never proposes trades."
            value={config.llm_proposals_enabled}
            onChange={onToggleLlmProposals}
            disabled={!config.enabled}
          />

          <NumericRow
            label="Per-order cap"
            hint="Max USD per confirm. Risk-check rejects anything larger."
            value={maxOrderInput}
            onChangeText={onChangeMaxOrder}
            disabled={!config.enabled || numericSaving}
          />
          <NumericRow
            label="Daily cap"
            hint="Max USD of confirmed orders per day."
            value={maxDailyInput}
            onChangeText={onChangeMaxDaily}
            disabled={!config.enabled || numericSaving}
          />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Row helpers
// ---------------------------------------------------------------------------

function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowHint}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: '#e2e8f0', true: tokens.color.brandTeal }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

function NumericRow({
  label,
  hint,
  value,
  onChangeText,
  disabled,
}: {
  label: string;
  hint: string;
  value: string;
  onChangeText: (t: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowHint}>{hint}</Text>
      </View>
      <View style={[s.numericField, disabled && { opacity: 0.5 }]}>
        <Text style={s.numericPrefix}>$</Text>
        <TextInput
          style={s.numericInput}
          value={value}
          editable={!disabled}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          maxLength={10}
          returnKeyType="done"
          placeholder="0"
          placeholderTextColor="#94a3b8"
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  header: { marginBottom: 16 },
  title: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  subtitle: { marginTop: 2, fontSize: 13, color: '#64748b', lineHeight: 18 },

  loading: { paddingVertical: 24, alignItems: 'center' },

  errorBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#dc2626',
  },
  retryLabel: { fontSize: 13, fontWeight: '600', color: '#ffffff' },

  disclaimerBox: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  disclaimerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  disclaimerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  disclaimerBody: {
    fontSize: 13,
    color: '#0f172a',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 14,
  },
  cta: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: tokens.color.brandTealDark,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBusy: {
    opacity: 0.75,
  },
  ctaLabel: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

  acknowledgedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignSelf: 'flex-start',
  },
  acknowledgedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },

  fields: { gap: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  rowHint: { marginTop: 2, fontSize: 12, color: '#64748b', lineHeight: 16 },

  numericField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    minWidth: 110,
    justifyContent: 'flex-end',
  },
  numericPrefix: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  numericInput: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 60,
    textAlign: 'right',
    padding: 0,
  },
});
