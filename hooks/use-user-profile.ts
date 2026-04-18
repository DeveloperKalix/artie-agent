import { useAuth } from '../context/auth-context';

/**
 * Display fields from Supabase user (Google OAuth stores full_name, avatar_url, picture in user_metadata).
 */
export function useUserProfile() {
  const { user } = useAuth();
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;

  const displayName =
    (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata.name === 'string' && metadata.name.trim()) ||
    user?.email?.split('@')[0] ||
    'User';

  const avatarUrl =
    (typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
    (typeof metadata.picture === 'string' && metadata.picture) ||
    null;

  return {
    displayName,
    avatarUrl,
    email: user?.email ?? null,
  };
}
