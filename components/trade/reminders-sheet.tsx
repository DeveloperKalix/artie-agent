import { useEffect } from 'react';
import {
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

import { TradeReminderCard } from '@/components/trade/trade-chat-cards';
import { useTradeReminders } from '@/components/trade/use-trade-reminders';
import type { OrderIntent } from '@/lib/trade/types';
import { tokens } from '@/styles/tokens';

interface RemindersSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Modal surfacing `GET /trade/reminders`. Each row embeds the same
 * `TradeReminderCard` used inside chat so re-confirm / cancel behavior
 * stays consistent with the chat-driven flow. Mirrors
 * `components/conversations/history-sheet.tsx` for visual consistency.
 */
export function RemindersSheet({ visible, onClose }: RemindersSheetProps) {
  const { reminders, status, error, refresh } = useTradeReminders();

  // Refresh on open so the list is current. The hook itself also fetches on
  // mount, but this covers the "sheet opened twice in one session" case.
  useEffect(() => {
    if (visible) void refresh();
  }, [visible, refresh]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Reminders</Text>
            <Text style={s.subtitle}>
              Orders waiting on you since market open.
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close" activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={s.errorBanner}>
            <Ionicons name="warning-outline" size={14} color="#b91c1c" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <FlatList
          data={reminders}
          keyExtractor={(item: OrderIntent) => item.id}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={status === 'loading'}
              onRefresh={() => void refresh()}
              tintColor={tokens.color.brandTealDark}
            />
          }
          renderItem={({ item }) => (
            // Reuse the chat card; the user sees the same layout in both places.
            <TradeReminderCard intentId={item.id} />
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          ListEmptyComponent={
            status === 'success' ? (
              <View style={s.empty}>
                <View style={s.emptyIcon}>
                  <Ionicons name="notifications-off-outline" size={28} color="#94a3b8" />
                </View>
                <Text style={s.emptyTitle}>No pending reminders</Text>
                <Text style={s.emptyBody}>
                  When an after-hours order is ready to be re-confirmed, it will
                  show up here and in the chat.
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  subtitle: { marginTop: 2, fontSize: 13, color: '#64748b' },
  listContent: { paddingVertical: 12, paddingBottom: 24 },
  separator: { height: 8 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { flex: 1, fontSize: 12, color: '#b91c1c' },
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
