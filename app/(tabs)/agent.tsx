import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Composer, HistorySheet, MessageBubble, useConversations } from '@/components/conversations';
import type { UIMessage } from '@/components/conversations';
import { AuraGlow } from '@/styles/animations/aura-glow';
import { tokens } from '@/styles/tokens';

export default function AgentScreen() {
  const insets = useSafeAreaInsets();
  const {
    messages,
    status,
    pending,
    error,
    send,
    sendVoice,
    startNew,
  } = useConversations();

  const [historyOpen, setHistoryOpen] = useState(false);
  const listRef = useRef<FlatList<UIMessage>>(null);

  // Autoscroll to newest message whenever the list grows.
  useEffect(() => {
    if (messages.length === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length]);

  const onRetry = useCallback(
    async (message: UIMessage) => {
      await send(message.content);
    },
    [send],
  );

  const isEmpty = messages.length === 0;

  // Tab bar sits below this screen; KAV needs its height in the offset so the
  // composer doesn't end up behind the keyboard.
  const tabBarHeight = 52 + Math.max(insets.bottom, 14) + 10 + 8;
  const kavOffset = Platform.OS === 'ios' ? tabBarHeight : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={kavOffset}>

        {/* Header — tap anywhere to dismiss keyboard */}
        <Pressable style={styles.headerRow} onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Agent</Text>
            <Text style={styles.subtitle}>Send audio or text to your AI assistant.</Text>
          </View>
          <TouchableOpacity
            style={styles.headerBtn}
            activeOpacity={0.7}
            accessibilityLabel="Start new conversation"
            onPress={startNew}>
            <Ionicons name="create-outline" size={20} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            activeOpacity={0.7}
            accessibilityLabel="Open conversation history"
            onPress={() => setHistoryOpen(true)}>
            <Ionicons name="time-outline" size={20} color="#475569" />
          </TouchableOpacity>
        </Pressable>

        {/* Scrollable content area */}
        {status === 'loading' && isEmpty ? (
          <View style={styles.center}>
            <ActivityIndicator color={tokens.color.brandTealDark} />
          </View>
        ) : isEmpty ? (
          <ScrollView
            style={styles.fill}
            contentContainerStyle={styles.heroContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}>
            <Pressable style={styles.hero} onPress={Keyboard.dismiss}>
              <View
                style={{
                  width: tokens.aura.haloContainerSize,
                  height: tokens.aura.haloContainerSize,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <AuraGlow />
                <Image
                  source={require('../../assets/images/artie-favicon.png')}
                  style={styles.favicon}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.heroTitle}>What can I help with?</Text>
              <Text style={styles.heroSub}>
                Type a message or tap the mic below. Start with /skill to teach me preferences.
              </Text>
            </Pressable>
          </ScrollView>
        ) : (
          <FlatList
            ref={listRef}
            style={styles.fill}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <MessageBubble message={item} onRetry={onRetry} />}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              pending ? (
                <View style={styles.typingRow}>
                  <ActivityIndicator size="small" color={tokens.color.brandTealDark} />
                  <Text style={styles.typingText}>Artie is thinking…</Text>
                </View>
              ) : null
            }
          />
        )}

        {/* Error banner */}
        {error && status === 'error' ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={14} color="#be123c" />
            <Text style={styles.errorText} numberOfLines={2}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Composer — always at the bottom of the KAV */}
        <View style={styles.composerWrap}>
          <Composer
            onSendText={(text) => void send(text)}
            onSendVoice={(uri) => void sendVoice(uri)}
            pending={pending}
          />
        </View>

      </KeyboardAvoidingView>

      <HistorySheet visible={historyOpen} onClose={() => setHistoryOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardRoot: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: '#64748b',
  },
  fill: {
    flex: 1,
  },
  heroContent: {
    flexGrow: 1,
  },
  hero: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  favicon: {
    width: 96,
    height: 96,
  },
  heroTitle: {
    marginTop: 24,
    fontSize: 17,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  heroSub: {
    marginTop: 6,
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 8,
    marginHorizontal: -24,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 13,
    color: '#64748b',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#be123c',
  },
  composerWrap: {
    paddingBottom: 8,
  },
});
