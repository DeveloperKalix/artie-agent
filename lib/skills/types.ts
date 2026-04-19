/**
 * Backend contract for skills / memory notes. See
 * `frontend-phase3-integration.md` § 2.2.
 */

export type MemoryNoteSource = 'skill' | 'system' | 'inferred';

export interface MemoryNote {
  id: string;
  user_id: string;
  content: string;
  source: MemoryNoteSource;
  created_at: string;
}

export interface ListSkillsResponse {
  notes: MemoryNote[];
}

export type SkillKind = 'note_appended' | 'level_updated' | 'invalid';

export interface SkillResponse {
  /** May be null when `kind` is `invalid` or `level_updated`. */
  note: MemoryNote | null;
  /** User-facing confirmation string. */
  reply: string;
  kind: SkillKind;
}

export interface CreateSkillRequest {
  content: string;
}

export interface DeleteSkillResponse {
  deleted: boolean;
}
