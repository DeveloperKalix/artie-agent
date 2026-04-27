import { query } from '@/lib/api/query';
import type { PatchTradingConfigRequest, TradingConfig } from '@/lib/trade/types';
import type { PatchProfileRequest, UserProfile } from './types';

/**
 * The backend auto-creates the profile as `novice` on first hit, so `GET` is
 * always safe to call after sign-in.
 */
export function getProfile(token: string, userId: string) {
  return query<UserProfile>('/api/v1/profile', {
    token,
    headers: { 'X-User-Id': userId },
  });
}

export function patchProfile(
  token: string,
  userId: string,
  body: PatchProfileRequest,
) {
  return query<UserProfile, PatchProfileRequest>('/api/v1/profile', {
    method: 'PATCH',
    token,
    headers: { 'X-User-Id': userId },
    body,
  });
}

// ---------------------------------------------------------------------------
// Phase 6 — trading config
// ---------------------------------------------------------------------------

/**
 * Phase 6: trading settings live on a nested endpoint so the profile GET
 * stays small. Backend returns defaults on first read.
 */
export function getTradingConfig(token: string, userId: string) {
  return query<TradingConfig>('/api/v1/profile/trading', {
    token,
    headers: { 'X-User-Id': userId },
  });
}

export function patchTradingConfig(
  token: string,
  userId: string,
  body: PatchTradingConfigRequest,
) {
  return query<TradingConfig, PatchTradingConfigRequest>(
    '/api/v1/profile/trading',
    {
      method: 'PATCH',
      token,
      headers: { 'X-User-Id': userId },
      body,
    },
  );
}

/**
 * Acknowledge the trading disclaimer. Must be called before any `/trade/*`
 * state change will be accepted; otherwise the server returns 403. Response
 * is the updated `TradingConfig` with `disclaimer_acknowledged_at` set.
 */
export function postTradingDisclaimer(token: string, userId: string) {
  return query<TradingConfig>('/api/v1/profile/trading/disclaimer', {
    method: 'POST',
    token,
    headers: { 'X-User-Id': userId },
    body: {},
  });
}
