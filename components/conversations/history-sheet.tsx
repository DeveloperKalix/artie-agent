import { useEffect } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import type { Conversation } from '@/lib/conversations/types';
import { useConversations } from '@/components/conversations/conversations-states';
import { tokens } from '@/styles/tokens';

interface HistorySheetProps {
  visible: boolean;
  onClose: () => void;
}

function formatStamp(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function ConversationRow({
  item,
  isCurrent,
  onPress,
}: {
  item: Conversation;
  isCurrent: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#e2e8f0' }}
      style={[s.row, isCurrent && s.rowCurrent]}>
      <View style={s.rowIcon}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={18}
          color={isCurrent ? tokens.color.brandTealDark : '#64748b'}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle} numberOfLines={1}>
          {item.title?.trim() || 'Untitled conversation'}
        </Text>
        <Text style={s.rowStamp} numberOfLines={1}>
          {formatStamp(item.last_message_at ?? item.updated_at)}
        </Text>
      </View>
      {isCurrent ? (
        <Ionicons name="checkmark" size={20} color={tokens.color.brandTealDark} />
      ) : null}
    </Pressable>
  );
}

export function HistorySheet({ visible, onClose }: HistorySheetProps) {
  const {
    conversations,
    currentConversationId,
    refreshConversations,
    switchTo,
    startNew,
  } = useConversations();

  // Refresh when the sheet opens so titles/timestamps are current.
  useEffect(() => {
    if (visible) void refreshConversations();
  }, [visible, refreshConversations]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <Text style={s.title}>History</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close" activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={s.newRow}
          activeOpacity={0.8}
          onPress={() => {
            startNew();
            onClose();
          }}>
          <View style={s.newIcon}>
            <Ionicons name="add" size={20} color={tokens.color.brandTealDark} />
          </View>
          <Text style={s.newLabel}>New conversation</Text>
        </TouchableOpacity>

        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          renderItem={({ item }) => (
            <ConversationRow
              item={item}
              isCurrent={item.id === currentConversationId}
              onPress={() => {
                if (item.id !== currentConversationId) switchTo(item.id);
                onClose();
              }}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => void refreshConversations()}
              tintColor={tokens.color.brandTealDark}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="chatbubbles-outline" size={36} color="#94a3b8" />
              <Text style={s.emptyText}>No conversations yet. Start one by sending a message.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </SafeAreaView>
    </Modal>
  );
}

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
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  newIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.brandTealLight,
  },
  newLabel: { fontSize: 16, fontWeight: '600', color: tokens.color.brandTealDark },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: '#fff',
  },
  rowCurrent: { backgroundColor: '#ecfeff' },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  rowStamp: { marginTop: 2, fontSize: 12, color: '#94a3b8' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#e2e8f0', marginHorizontal: 20 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  emptyText: { textAlign: 'center', color: '#64748b', fontSize: 14 },
});
