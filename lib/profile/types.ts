/**
 * Backend contract for user profile. See `frontend-phase3-integration.md` § 2.3
 * and `frontend-phase6-integration.md` § 2 (trading config extension).
 */

import type { TradingConfig } from '@/lib/trade/types';

export type ExperienceLevel = 'novice' | 'intermediate' | 'veteran';

export interface UserProfile {
  user_id: string;
  experience_level: ExperienceLevel;
  onboarded_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  /**
   * Phase 6: nested trading config. Backend always returns a value (defaults
   * applied server-side on first read), but we keep it nullable for forward
   * compatibility with older server versions that may still be in flight.
   */
  trading?: TradingConfig | null;
}

export interface PatchProfileRequest {
  experience_level?: ExperienceLevel;
}
