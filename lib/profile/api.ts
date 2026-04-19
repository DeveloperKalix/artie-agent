import { query } from '@/lib/api/query';
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
