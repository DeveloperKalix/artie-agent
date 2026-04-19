import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  createConversation,
  listConversations,
  listMessages,
  postTextMessage,
  postVoiceMessage,
} from '@/lib/conversations/api';
import type { Conversation, Message } from '@/lib/conversations/types';
import { useAuth } from '@/context/auth-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConversationsStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Message with client-side augmentation for optimistic UI.
 * `_pending` is true while an assistant reply is in-flight.
 * `_failed` is true when the send errored; the bubble shows a retry affordance.
 * `_temp` is true when `id` is a client-generated placeholder not yet on the server.
 */
export interface UIMessage extends Message {
  _pending?: boolean;
  _failed?: boolean;
  _temp?: boolean;
}

interface ConversationsState {
  /** Ordered newest conversations first (per backend contract). */
  conversations: Conversation[];
  currentConversationId: string | null;

  /** Messages for the current conversation, oldest→newest. */
  messages: UIMessage[];

  /** Overall status of the message list for the current conversation. */
  status: ConversationsStatus;
  /** True while a send/sendVoice round-trip is in flight. */
  pending: boolean;
  /** Last error surfaced from list/send; UI may show inline or ignore. */
  error: string | null;

  /** Fetch (or refetch) the full conversations list. */
  refreshConversations: () => Promise<void>;
  /** Fetch (or refetch) messages for the current conversation. */
  refreshMessages: () => Promise<void>;

  /** Send a text turn; lazily creates the conversation on first send. */
  send: (content: string) => Promise<void>;
  /** Upload a voice recording; lazily creates the conversation on first send. */
  sendVoice: (uri: string) => Promise<void>;

  /** Switch the current thread without a route push. */
  switchTo: (conversationId: string) => void;
  /** Clear the current thread id so the next send creates a new one. */
  startNew: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ConversationsContext = createContext<ConversationsState>({
  conversations: [],
  currentConversationId: null,
  messages: [],
  status: 'idle',
  pending: false,
  error: null,
  refreshConversations: async () => {},
  refreshMessages: async () => {},
  send: async () => {},
  sendVoice: async () => {},
  switchTo: () => {},
  startNew: () => {},
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function tempUserMessage(conversationId: string, content: string): UIMessage {
  return {
    id: makeTempId(),
    conversation_id: conversationId,
    role: 'user',
    content,
    audio_url: null,
    transcript: null,
    metadata: { input: 'text' },
    created_at: new Date().toISOString(),
    _pending: true,
    _temp: true,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [status, setStatus] = useState<ConversationsStatus>('idle');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Latest conversation id in a ref so async callbacks don't capture stale state.
  const currentIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentIdRef.current = currentConversationId;
  }, [currentConversationId]);

  // ── Reset on sign-out ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !userId) {
      setConversations([]);
      setCurrentConversationId(null);
      setMessages([]);
      setStatus('idle');
      setPending(false);
      setError(null);
    }
  }, [token, userId]);

  // ── Refresh conversations list ────────────────────────────────────────────
  const refreshConversations = useCallback(async () => {
    if (!token || !userId) return;
    const { data, error: err } = await listConversations(token, userId);
    if (err) {
      // Don't clobber messages-level status; history sheet can surface this itself.
      setError(err);
      return;
    }
    setConversations(data?.conversations ?? []);
  }, [token, userId]);

  // ── Refresh messages for the current conversation ─────────────────────────
  const refreshMessages = useCallback(async () => {
    if (!token || !userId) return;
    const id = currentIdRef.current;
    if (!id) {
      setMessages([]);
      setStatus('success');
      return;
    }
    setStatus('loading');
    setError(null);
    const { data, error: err } = await listMessages(token, userId, id);
    if (err) {
      setError(err);
      setStatus('error');
      return;
    }
    // Server messages take precedence — drop any optimistic temps.
    setMessages(data?.messages ?? []);
    setStatus('success');
  }, [token, userId]);

  // ── Initial load when auth becomes available ──────────────────────────────
  useEffect(() => {
    if (!token || !userId) return;
    void refreshConversations();
  }, [token, userId, refreshConversations]);

  // When the current conversation changes (and we have auth), fetch its messages.
  useEffect(() => {
    if (!token || !userId || !currentConversationId) return;
    void refreshMessages();
  }, [token, userId, currentConversationId, refreshMessages]);

  // ── Ensure a conversation exists; returns its id or null on failure. ──────
  const ensureConversation = useCallback(async (): Promise<string | null> => {
    if (!token || !userId) return null;
    if (currentIdRef.current) return currentIdRef.current;
    const { data, error: err } = await createConversation(token, userId);
    if (err || !data) {
      setError(err ?? 'Could not create conversation.');
      return null;
    }
    setCurrentConversationId(data.id);
    setConversations((prev) => [data, ...prev]);
    currentIdRef.current = data.id;
    return data.id;
  }, [token, userId]);

  // ── Send text ─────────────────────────────────────────────────────────────
  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      if (!token || !userId) {
        setError('You must be signed in.');
        return;
      }

      setPending(true);
      setError(null);

      const conversationId = await ensureConversation();
      if (!conversationId) {
        setPending(false);
        return;
      }

      // Optimistic user bubble
      const optimistic = tempUserMessage(conversationId, trimmed);
      setMessages((prev) => [...prev, optimistic]);

      const { data, error: err } = await postTextMessage(
        token,
        userId,
        conversationId,
        { content: trimmed },
      );

      if (err || !data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimistic.id ? { ...m, _pending: false, _failed: true } : m,
          ),
        );
        setError(err ?? 'Message failed.');
        setPending(false);
        return;
      }

      // Append assistant turn immediately so the UI feels responsive, then
      // reconcile with the server (replaces the temp user id with the real one).
      setMessages((prev) => [
        ...prev.map((m) =>
          m.id === optimistic.id ? { ...m, _pending: false } : m,
        ),
        data,
      ]);
      setPending(false);

      // Fire-and-forget reconcile + bump conversation timestamp in the sidebar.
      void refreshMessages();
      void refreshConversations();
    },
    [token, userId, ensureConversation, refreshMessages, refreshConversations],
  );

  // ── Send voice ────────────────────────────────────────────────────────────
  const sendVoice = useCallback(
    async (uri: string) => {
      if (!token || !userId) {
        setError('You must be signed in.');
        return;
      }
      setPending(true);
      setError(null);

      const conversationId = await ensureConversation();
      if (!conversationId) {
        setPending(false);
        return;
      }

      const { data, error: err } = await postVoiceMessage(
        token,
        userId,
        conversationId,
        uri,
      );
      if (err || !data) {
        setError(err ?? 'Voice upload failed.');
        setPending(false);
        return;
      }

      // User transcript lives server-side only — refetch to render both turns.
      await refreshMessages();
      void refreshConversations();
      setPending(false);
    },
    [token, userId, ensureConversation, refreshMessages, refreshConversations],
  );

  // ── Imperative helpers ────────────────────────────────────────────────────
  const switchTo = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
    setMessages([]);
    setStatus('loading');
    setError(null);
  }, []);

  const startNew = useCallback(() => {
    setCurrentConversationId(null);
    currentIdRef.current = null;
    setMessages([]);
    setStatus('idle');
    setError(null);
  }, []);

  const value = useMemo<ConversationsState>(
    () => ({
      conversations,
      currentConversationId,
      messages,
      status,
      pending,
      error,
      refreshConversations,
      refreshMessages,
      send,
      sendVoice,
      switchTo,
      startNew,
    }),
    [
      conversations,
      currentConversationId,
      messages,
      status,
      pending,
      error,
      refreshConversations,
      refreshMessages,
      send,
      sendVoice,
      switchTo,
      startNew,
    ],
  );

  return (
    <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useConversations() {
  return useContext(ConversationsContext);
}
