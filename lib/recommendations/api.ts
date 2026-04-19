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
 *
 * Phase 5: this endpoint auto-generates inline when `new[]` would be empty
 * AND news is available (first call for a new user can block on Groq for
 * 5–15 s). Subsequent calls within the backend's 3-minute cooldown window
 * return immediately. We default the timeout to 45 s so the auto-gen path
 * has enough room without starving the UI.
 */
export function listRecommendations(
  token: string,
  userId: string,
  opts: { timeoutMs?: number } = {},
) {
  return query<RecommendationsListResponse>('/api/v1/recommendations', {
    token,
    headers: { 'X-User-Id': userId },
    timeoutMs: opts.timeoutMs ?? 45_000,
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
