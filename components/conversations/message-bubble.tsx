import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { UIMessage } from '@/components/conversations/conversations-states';
import { tokens } from '@/styles/tokens';

interface MessageBubbleProps {
  message: UIMessage;
  /** Invoked when the user taps the retry affordance on a failed send. */
  onRetry?: (message: UIMessage) => void;
}

/**
 * Renders a conversation turn. Visual language switches on:
 *   - `role` (user right-aligned / assistant left-aligned)
 *   - `metadata.source` for assistant turns (chat | skill | error)
 *   - `metadata.kind` for skill turns (note_appended | level_updated | invalid)
 */
export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const source = message.metadata?.source;
  const kind = message.metadata?.kind;

  // ── User bubble ──────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <View className="mb-2 w-full flex-row justify-end px-4">
        <View
          className="max-w-[80%] rounded-2xl px-4 py-2.5"
          style={{ backgroundColor: tokens.color.brandTeal }}>
          <Text className="text-base text-white">{message.content}</Text>
          <View className="mt-1 flex-row items-center justify-end gap-1.5">
            {message._pending ? (
              <ActivityIndicator size="small" color="#ffffffcc" />
            ) : null}
            {message._failed ? (
              <Pressable
                onPress={() => onRetry?.(message)}
                className="flex-row items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5"
                accessibilityLabel="Retry sending message">
                <Ionicons name="refresh" size={12} color="#ffffff" />
                <Text className="text-xs font-semibold text-white">Retry</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  // ── Assistant: skill — level updated ─────────────────────────────────────
  if (source === 'skill' && kind === 'level_updated') {
    return (
      <View className="mb-2 w-full px-4">
        <View className="flex-row items-center gap-2 self-start rounded-xl border border-teal-200 bg-teal-50 px-3 py-2">
          <Ionicons name="checkmark-circle" size={18} color={tokens.color.brandTealDark} />
          <Text className="text-sm text-slate-700">{message.content}</Text>
        </View>
      </View>
    );
  }

  // ── Assistant: skill — note appended ─────────────────────────────────────
  if (source === 'skill' && kind === 'note_appended') {
    return (
      <View className="mb-2 w-full px-4">
        <View className="max-w-[80%] self-start rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
          <View className="mb-1 flex-row items-center gap-1.5">
            <Ionicons name="bookmark" size={12} color={tokens.color.brandTealDark} />
            <Text
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: tokens.color.brandTealDark }}>
              Remembered
            </Text>
          </View>
          <Text className="text-base text-slate-700">{message.content}</Text>
        </View>
      </View>
    );
  }

  // ── Assistant: skill — invalid ───────────────────────────────────────────
  if (source === 'skill' && kind === 'invalid') {
    return (
      <View className="mb-2 w-full px-4">
        <View className="max-w-[80%] self-start rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <Text className="text-base text-amber-900">{message.content}</Text>
        </View>
      </View>
    );
  }

  // ── Assistant: error ─────────────────────────────────────────────────────
  if (source === 'error') {
    return (
      <View className="mb-2 w-full px-4">
        <View className="max-w-[80%] flex-row items-start gap-2 self-start rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5">
          <Ionicons name="warning-outline" size={18} color="#be123c" style={{ marginTop: 1 }} />
          <Text className="flex-1 text-base text-rose-900">{message.content}</Text>
        </View>
      </View>
    );
  }

  // ── Assistant: default chat ──────────────────────────────────────────────
  return (
    <View className="mb-2 w-full px-4">
      <View className="max-w-[80%] self-start rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <Text className="text-base text-slate-900">{message.content}</Text>
      </View>
    </View>
  );
}
