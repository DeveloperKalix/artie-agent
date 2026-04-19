import type { User } from '@supabase/supabase-js';

import { useAuth } from '../context/auth-context';

function pickString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === 'string') {
      const t = c.trim();
      if (t.length > 0) return t;
    }
  }
  return null;
}

/**
 * Google / Supabase may put the photo in `user_metadata`, or only on the OAuth identity row.
 */
function resolveAvatarUrl(user: User | null): string | null {
  if (!user) return null;

  const meta = user.user_metadata ?? {};
  const fromMeta = pickString(meta.avatar_url, meta.picture);
  if (fromMeta) return fromMeta;

  const google = user.identities?.find((i) => i.provider === 'google');
  const idData = google?.identity_data as Record<string, unknown> | undefined;
  if (idData) {
    const fromIdentity = pickString(idData.avatar_url, idData.picture, idData.image_url);
    if (fromIdentity) return fromIdentity;
  }

  return null;
}

/**
 * Display fields from Supabase user (Google OAuth stores full_name, avatar_url, picture in user_metadata).
 */
export function useUserProfile() {
  const { user } = useAuth();
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;

  const displayName =
    pickString(metadata.full_name, metadata.name) ||
    user?.email?.split('@')[0] ||
    'User';

  const avatarUrl = resolveAvatarUrl(user);

  return {
    displayName,
    avatarUrl,
    email: user?.email ?? null,
  };
}
