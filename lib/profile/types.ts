/**
 * Backend contract for user profile. See `frontend-phase3-integration.md` § 2.3.
 */

export type ExperienceLevel = 'novice' | 'intermediate' | 'veteran';

export interface UserProfile {
  user_id: string;
  experience_level: ExperienceLevel;
  onboarded_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PatchProfileRequest {
  experience_level?: ExperienceLevel;
}
