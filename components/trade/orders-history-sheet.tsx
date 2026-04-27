import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { IntentPreviewCard } from '@/components/trade/intent-preview-card';
import { IntentStatusBadge } from '@/components/trade/intent-status-badge';
import { listOrderIntents } from '@/lib/trade/api';
import { formatMoney } from '@/lib/trade/format';
import type { IntentStatus, OrderIntent } from '@/lib/trade/types';
import { useAuth } from '@/context/auth-context';
import { tokens } from '@/styles/tokens';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type TabKey = 'active' | 'filled' | 'cancelled';

interface TabConfig {
  key: TabKey;
  label: string;
  statuses: IntentStatus[];
}

const TABS: readonly TabConfig[] = [
  {
    key: 'active',
    label: 'Active',
    statuses: [
      'awaiting_confirmation',
      'previewed',
      'confirmed',
      'scheduled_for_market_open',
      'submitted',
    ],
  },
  { key: 'filled', label: 'Filled', statuses: ['filled'] },
  {
    key: 'cancelled',
    label: 'Cancelled',
    statuses: ['cancelled', 'failed', 'rejected'],
  },
] as const;

// ---------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------

interface OrdersHistorySheetProps {
  visible: boolean;
  onClose: () => void;
}

export function OrdersHistorySheet({ visible, onClose }: OrdersHistorySheetProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [intents, setIntents] = useState<OrderIntent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  const currentTab = useMemo(
    () => TABS.find((t) => t.key === activeTab) ?? TABS[0],
    [activeTab],
  );

  const fetchOrders = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await listOrderIntents(token, userId, {
      status: currentTab.statuses,
      limit: 50,
    });
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setIntents(data?.intents ?? []);
  }, [token, userId, currentTab.statuses]);

  // Refresh on open or tab change.
  useEffect(() => {
    if (!visible) return;
    setExpandedId(null);
    void fetchOrders();
  }, [visible, activeTab, fetchOrders]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <Text style={s.title}>Orders</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close" activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Tab strip */}
        <View style={s.tabStrip}>
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[s.tabBtn, active && s.tabBtnActive]}
                activeOpacity={0.85}
                onPress={() => setActiveTab(t.key)}>
                <Text style={[s.tabLabel, active && s.tabLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error ? (
          <View style={s.errorBanner}>
            <Ionicons name="warning-outline" size={14} color="#b91c1c" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <FlatList
          data={intents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void fetchOrders()}
              tintColor={tokens.color.brandTealDark}
            />
          }
          renderItem={({ item }) => (
            <OrderRow
              intent={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
            />
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          ListEmptyComponent={
            !loading ? (
              <View style={s.empty}>
                <View style={s.emptyIcon}>
                  <Ionicons name="receipt-outline" size={28} color="#94a3b8" />
                </View>
                <Text style={s.emptyTitle}>
                  No {currentTab.label.toLowerCase()} orders
                </Text>
                <Text style={s.emptyBody}>
                  {activeTab === 'active'
                    ? 'Open an order from chat to see it here.'
                    : 'Completed orders will appear here.'}
                </Text>
              </View>
            ) : (
              <View style={s.loading}>
                <ActivityIndicator color={tokens.color.brandTealDark} />
              </View>
            )
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function OrderRow({
  intent,
  expanded,
  onToggle,
}: {
  intent: OrderIntent;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View>
      <TouchableOpacity style={s.row} activeOpacity={0.85} onPress={onToggle}>
        <View style={[s.sideBar, intent.action === 'buy' ? s.sideBarBuy : s.sideBarSell]} />
        <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12 }}>
          <View style={s.rowHeader}>
            <Text style={s.rowSymbol} numberOfLines={1}>
              {intent.action.toUpperCase()} {intent.symbol}
            </Text>
            <IntentStatusBadge status={intent.status} compact />
          </View>
          <Text style={s.rowMeta} numberOfLines={1}>
            {formatMoney(
              intent.estimated_value ?? intent.impact?.estimated_value ?? null,
              intent.impact?.currency ?? null,
            )}
            {intent.units != null ? ` · ${intent.units} units` : ''}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#94a3b8"
          style={{ paddingHorizontal: 12 }}
        />
      </TouchableOpacity>

      {expanded ? (
        <View style={s.expandedWrap}>
          <IntentPreviewCard intent={intent} compact />
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  tabStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  tabBtnActive: { backgroundColor: tokens.color.brandTealDark },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  tabLabelActive: { color: '#ffffff' },
  listContent: { paddingVertical: 8, paddingHorizontal: 16, paddingBottom: 24 },
  separator: { height: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  sideBar: { width: 4 },
  sideBarBuy: { backgroundColor: '#15803d' },
  sideBarSell: { backgroundColor: '#b91c1c' },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowSymbol: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  rowMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748b',
    fontVariant: ['tabular-nums'],
  },
  expandedWrap: {
    paddingTop: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { flex: 1, fontSize: 12, color: '#b91c1c' },
  loading: {
    padding: 32,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  emptyBody: {
    maxWidth: 280,
    textAlign: 'center',
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
});
