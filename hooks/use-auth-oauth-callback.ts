import { useEffect } from 'react';
import { handleOAuthDeepLinks } from '@/lib/auth/oauth';

/**
 * Mount once at the root layout.
 * Handles OAuth returns from cold start (Linking.getInitialURL) and warm app (Linking event).
 */
export function useAuthOAuthCallback() {
  useEffect(() => handleOAuthDeepLinks(), []);
}
