import { query } from '@/lib/api/query';
import type {
  CreateSkillRequest,
  DeleteSkillResponse,
  ListSkillsResponse,
  SkillResponse,
} from './types';

export function listSkills(token: string, userId: string, limit = 50) {
  return query<ListSkillsResponse>(
    `/api/v1/skills?limit=${encodeURIComponent(String(limit))}`,
    {
      token,
      headers: { 'X-User-Id': userId },
    },
  );
}

/**
 * Append a free-form note, or honor subcommands like `/skill set-level veteran`.
 * The backend decides based on the `content` prefix; UI should render `reply`
 * to the user.
 */
export function createSkill(token: string, userId: string, body: CreateSkillRequest) {
  return query<SkillResponse, CreateSkillRequest>('/api/v1/skills', {
    method: 'POST',
    token,
    headers: { 'X-User-Id': userId },
    body,
  });
}

export function deleteSkill(token: string, userId: string, noteId: string) {
  return query<DeleteSkillResponse>(
    `/api/v1/skills/${encodeURIComponent(noteId)}`,
    {
      method: 'DELETE',
      token,
      headers: { 'X-User-Id': userId },
    },
  );
}
