import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

// ─── Private helpers ─────────────────────────────────────────────────────────

/** Redirect URI Supabase sends the browser back to after Google auth.
 *  Supabase Redirect Allowlist must include: exp://** (Expo Go) + artie://** (builds). */
function redirectUri(): string {
  return Linking.createURL('auth/callback');
}

/** Only act on URLs that actually carry an OAuth result. */
function isCallbackUrl(url: string): boolean {
  return (
    url.includes('auth/callback') ||
    url.includes('code=') ||
    url.includes('access_token') ||
    url.includes('error=')
  );
}

/** Poll for a Supabase session (covers root Linking handler establishing it first). */
async function waitForSession(maxMs = 4000): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

// Dedupe: prevent double-applying the same callback URL.
let inFlight: string | null = null;
const recentlyFinalized = new Set<string>();

/** Exchange the callback URL for a persisted Supabase session (PKCE or implicit). */
async function finalizeSession(url: string): Promise<{ ok: boolean; error?: Error }> {
  if (!isCallbackUrl(url)) return { ok: false, error: new Error('Not an OAuth callback URL') };

  const key = url.length > 200 ? url.slice(0, 160) : url;
  if (recentlyFinalized.has(key)) return { ok: true };
  if (inFlight === url) return { ok: false, error: new Error('OAuth already in progress') };

  inFlight = url;
  try {
    const { params, errorCode } = QueryParams.getQueryParams(url);

    if (errorCode || params.error) {
      return { ok: false, error: new Error(params.error_description || params.error || errorCode || 'OAuth failed') };
    }

    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (!error || (await supabase.auth.getSession()).data.session) {
        recentlyFinalized.add(key);
        setTimeout(() => recentlyFinalized.delete(key), 60_000);
        return { ok: true };
      }
      return { ok: false, error: new Error(error.message) };
    }

    if (params.access_token && params.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (!error || (await supabase.auth.getSession()).data.session) {
        recentlyFinalized.add(key);
        setTimeout(() => recentlyFinalized.delete(key), 60_000);
        return { ok: true };
      }
      return { ok: false, error: new Error(error.message) };
    }

    return { ok: false, error: new Error('No tokens in OAuth callback URL') };
  } finally {
    inFlight = null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Call from the login screen to start the Google OAuth flow. */
export async function signInWithGoogle(): Promise<{ ok: true } | { ok: false; error: Error }> {
  if (__DEV__) {
    console.log('[Auth] redirect URI:', redirectUri(), '— allowlist exp://** and artie://** in Supabase');
  }

  const redirectTo = redirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error) return { ok: false, error: new Error(error.message) };
  if (!data?.url) return { ok: false, error: new Error('No OAuth URL from Supabase. Check Google provider config.') };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  WebBrowser.maybeCompleteAuthSession();

  if (result.type === 'success' && result.url) {
    const finalized = await finalizeSession(result.url);
    if (finalized.ok) return { ok: true };
  }

  // Root Linking handler (or iOS) may have already established the session.
  if (await waitForSession()) return { ok: true };

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { ok: false, error: new Error('Sign-in was cancelled.') };
  }

  return { ok: false, error: new Error('Could not complete sign-in. Try again.') };
}

/** Mount once at the root layout to handle OAuth returns via deep link (cold + warm start). */
export function handleOAuthDeepLinks(): () => void {
  const run = (url: string | null) => {
    if (url) void finalizeSession(url);
  };

  void Linking.getInitialURL().then(run);
  const sub = Linking.addEventListener('url', ({ url }) => run(url));
  return () => sub.remove();
}
