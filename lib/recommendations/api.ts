import { query } from '@/lib/api/query';
import type {
  MarkViewedResponse,
  RecommendationResponse,
  RecommendationStatus,
  RecommendationsListResponse,
} from './types';

export interface PostRecommendationsOptions {
  /** Override the default timeout; LLM calls can take a while. */
  timeoutMs?: number;
}

/**
 * Lightweight status check — no LLM call, no cursor advance (~150 ms).
 * Call on every app-foreground event to decide whether to show a badge.
 */
export function getRecommendationStatus(token: string, userId: string) {
  return query<RecommendationStatus>('/api/v1/recommendations/status', {
    token,
    headers: { 'X-User-Id': userId },
  });
}

/**
 * Fetch the user's persisted foresight feed, bucketed by view state.
 * Cheap — no LLM call. Render `new[]` above `viewed[]`.
 */
export function listRecommendations(token: string, userId: string) {
  return query<RecommendationsListResponse>('/api/v1/recommendations', {
    token,
    headers: { 'X-User-Id': userId },
  });
}

/**
 * Trigger a fresh generation. Inserts new rows by fingerprint; already-stored
 * foresights stay untouched. Returns the full unviewed feed + how many rows
 * this call actually inserted (`new_count`).
 */
export function postRecommendations(
  token: string,
  userId: string,
  opts: PostRecommendationsOptions = {},
) {
  return query<RecommendationResponse>('/api/v1/recommendations', {
    method: 'POST',
    token,
    headers: { 'X-User-Id': userId },
    body: {},
    timeoutMs: opts.timeoutMs ?? 45_000,
  });
}

/**
 * Mark a single foresight as viewed. The row moves from the "new" bucket to
 * the "viewed" bucket server-side on the next GET.
 *
 * 404 = id doesn't belong to this user (stale / switched accounts) — treat as no-op.
 */
export function markRecommendationViewed(token: string, userId: string, recommendationId: string) {
  return query<MarkViewedResponse>(
    `/api/v1/recommendations/${encodeURIComponent(recommendationId)}/viewed`,
    {
      method: 'POST',
      token,
      headers: { 'X-User-Id': userId },
      body: {},
    },
  );
}
