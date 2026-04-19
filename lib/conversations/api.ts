import { query } from '@/lib/api/query';
import type {
  Conversation,
  CreateConversationRequest,
  ListConversationsResponse,
  ListMessagesResponse,
  Message,
  PostTextMessageRequest,
} from './types';

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export function listConversations(token: string, userId: string) {
  return query<ListConversationsResponse>('/api/v1/conversations', {
    token,
    headers: { 'X-User-Id': userId },
  });
}

export function createConversation(
  token: string,
  userId: string,
  body: CreateConversationRequest = {},
) {
  return query<Conversation, CreateConversationRequest>('/api/v1/conversations', {
    method: 'POST',
    token,
    headers: { 'X-User-Id': userId },
    body,
  });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export function listMessages(
  token: string,
  userId: string,
  conversationId: string,
  limit = 50,
) {
  return query<ListMessagesResponse>(
    `/api/v1/conversations/${conversationId}/messages?limit=${encodeURIComponent(String(limit))}`,
    {
      token,
      headers: { 'X-User-Id': userId },
    },
  );
}

/**
 * Send a text turn. Returns the assistant `Message`. The backend has already
 * persisted the user turn — re-fetch with `listMessages` to reconcile optimistic
 * placeholders.
 */
export function postTextMessage(
  token: string,
  userId: string,
  conversationId: string,
  body: PostTextMessageRequest,
) {
  return query<Message, PostTextMessageRequest>(
    `/api/v1/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      token,
      headers: { 'X-User-Id': userId },
      body,
      timeoutMs: 30_000,
    },
  );
}

/**
 * Upload a recorded audio file (expo-audio `audioRecorder.uri`) as the user turn.
 * Backend runs Whisper → orchestrator and returns the assistant `Message`.
 *
 * React Native FormData requires the `{ uri, name, type }` triple; we never
 * read the file into memory. `Content-Type` must NOT be set explicitly — fetch
 * adds the multipart boundary.
 */
export function postVoiceMessage(
  token: string,
  userId: string,
  conversationId: string,
  uri: string,
) {
  const form = new FormData();
  form.append('file', {
    uri,
    name: 'recording.m4a',
    type: 'audio/m4a',
  } as unknown as Blob);
  return query<Message>(
    `/api/v1/conversations/${conversationId}/messages/voice`,
    {
      method: 'POST',
      token,
      body: form,
      headers: { 'X-User-Id': userId },
      timeoutMs: 60_000,
    },
  );
}
