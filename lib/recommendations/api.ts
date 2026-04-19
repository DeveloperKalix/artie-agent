import { query } from '@/lib/api/query';
import type { RecommendationResponse, RecommendationStatus } from './types';

export interface PostRecommendationsOptions {
  /** Override the default timeout; LLM calls can take a while. */
  timeoutMs?: number;
}

/**
 * Lightweight status check — no LLM call, no cursor advance (~200 ms).
 * Call on every app-foreground event to decide whether to fire a notification.
 */
export function getRecommendationStatus(token: string, userId: string) {
  return query<RecommendationStatus>('/api/v1/recommendations/status', {
    token,
    headers: { 'X-User-Id': userId },
  });
}

/**
 * Ask the backend to generate fresh portfolio recommendations for the caller.
 * Body is empty; the server derives context from `X-User-Id`.
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
