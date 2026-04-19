import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { MemoryNote } from '@/lib/skills/types';
import { useMemoryNotes } from './memory-states';
import { tokens } from '@/styles/tokens';

export { useMemoryNotes } from './memory-states';

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function confirmDelete(onConfirm: () => void) {
  Alert.alert(
    'Delete note',
    'Artie will forget this preference on the next message.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ],
  );
}

function NoteRow({
  note,
  onDelete,
}: {
  note: MemoryNote;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={s.row}>
      <View style={s.rowBody}>
        <Text style={s.rowContent}>{note.content}</Text>
        <Text style={s.rowMeta}>
          {formatWhen(note.created_at)} · {note.source}
        </Text>
      </View>
      <TouchableOpacity
        accessibilityLabel="Delete note"
        activeOpacity={0.7}
        onPress={() => confirmDelete(() => onDelete(note.id))}
        hitSlop={8}>
        <Ionicons name="trash-outline" size={20} color="#be123c" />
      </TouchableOpacity>
    </View>
  );
}

function Composer({
  saving,
  onSubmit,
}: {
  saving: boolean;
  onSubmit: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState('');
  const canSubmit = text.trim().length > 0 && !saving;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    const ok = await onSubmit(text);
    if (ok) setText('');
  }, [canSubmit, text, onSubmit]);

  return (
    <View style={s.composer}>
      <TextInput
        style={s.input}
        placeholder="Teach Artie a preference, e.g. I prefer dividend stocks"
        placeholderTextColor="#94a3b8"
        multiline
        value={text}
        onChangeText={setText}
      />
      <TouchableOpacity
        style={[s.addBtn, { opacity: canSubmit ? 1 : 0.5 }]}
        activeOpacity={0.85}
        onPress={() => void submit()}
        disabled={!canSubmit}>
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addLabel}>Add note</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name="bookmark-outline" size={28} color={tokens.color.brandTealDark} />
      </View>
      <Text style={s.emptyTitle}>Nothing memorized yet</Text>
      <Text style={s.emptyBody}>
        Add notes Artie should keep in mind. You can also say things like
        “/skill I prefer dividends” in the Agent tab.
      </Text>
    </View>
  );
}

export function MemoryManager() {
  const { notes, status, error, saving, refresh, addNote, removeNote } = useMemoryNotes();

  return (
    <KeyboardAvoidingView
      style={s.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Composer saving={saving} onSubmit={addNote} />

      {status === 'loading' && notes.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator color={tokens.color.brandTealDark} />
        </View>
      ) : status === 'error' && notes.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="cloud-offline-outline" size={32} color="#be123c" />
          <Text style={s.errorTitle}>Could not load memory</Text>
          {error ? <Text style={s.errorBody}>{error}</Text> : null}
          <Pressable style={s.retry} onPress={() => void refresh()}>
            <Text style={s.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NoteRow note={item} onDelete={(id) => void removeNote(id)} />}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={status === 'loading'}
              onRefresh={() => void refresh()}
              tintColor={tokens.color.brandTealDark}
            />
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  composer: {
    margin: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  input: {
    minHeight: 72,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 15,
    color: '#0f172a',
    textAlignVertical: 'top',
  },
  addBtn: {
    marginTop: 8,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 10,
    backgroundColor: tokens.color.brandTealDark,
  },
  addLabel: { color: '#fff', fontWeight: '600', fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  rowBody: { flex: 1 },
  rowContent: { fontSize: 15, color: '#0f172a', lineHeight: 20 },
  rowMeta: { marginTop: 4, fontSize: 12, color: '#94a3b8' },
  separator: { height: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  errorTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginTop: 8 },
  errorBody: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  retry: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0f172a',
  },
  retryLabel: { color: '#fff', fontWeight: '600' },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.brandTealLight,
  },
  emptyTitle: { marginTop: 8, fontSize: 16, fontWeight: '600', color: '#0f172a' },
  emptyBody: { textAlign: 'center', fontSize: 13, color: '#64748b', lineHeight: 19 },
});
