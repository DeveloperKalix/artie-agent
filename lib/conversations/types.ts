/**
 * Backend network shapes for conversations + messages.
 * Mirror Phase 3 contract in `frontend-phase3-integration.md` § 2.1 / § 3.
 */

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

/** Value of `metadata.source` on assistant messages. */
export type MessageSource = 'skill' | 'chat' | 'error';

/** Value of `metadata.kind` when `metadata.source === 'skill'`. */
export type SkillKind = 'note_appended' | 'level_updated' | 'invalid';

export interface MessageMetadata {
  /** 'text' | 'voice' on user messages. */
  input?: 'text' | 'voice';
  source?: MessageSource;
  kind?: SkillKind;
  /** Only present when `kind === 'note_appended'`. */
  note_id?: string;
  /** Anything else the backend attaches. */
  [key: string]: unknown;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  audio_url?: string | null;
  transcript?: string | null;
  metadata?: MessageMetadata | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title?: string | null;
  created_at: string;
  updated_at: string;
  last_message_at?: string | null;
}

export interface ListConversationsResponse {
  conversations: Conversation[];
}

export interface ListMessagesResponse {
  messages: Message[];
}

export interface CreateConversationRequest {
  title?: string | null;
}

export interface PostTextMessageRequest {
  content: string;
}
