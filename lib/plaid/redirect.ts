/**
 * Plaid + Expo redirect URIs — two values on purpose.
 *
 * 1) `link_token.redirect_uri` (backend `PLAID_REDIRECT_URI`, Plaid Dashboard):
 *      https://artieagent.tech/plaid-callback
 *    Must be HTTPS — Plaid requires this for OAuth institutions.
 *
 * 2) `openAuthSessionAsync` callback in the app (this file):
 *      artie://plaid-callback
 *    iOS `ASWebAuthenticationSession` only closes on a URL whose scheme the app owns
 *    (`expo.scheme` in app.json). HTTPS would hang the sheet on pre-17.4 devices and
 *    is flaky even with Associated Domains.
 *
 * Handoff: the backend's `/plaid-callback` HTML serves a tiny redirect to
 * `artie://plaid-callback` carrying the full query string (`public_token`,
 * `oauth_state_id`, etc.). That hop is what lets iOS finish the session.
 */
const DEFAULT_PLAID_AUTH_CALLBACK = 'artie://plaid-callback';

/**
 * Custom-scheme URL used as the second argument to `WebBrowser.openAuthSessionAsync`.
 * NOT the same as the Plaid link token's `redirect_uri` (which is HTTPS and lives on the server).
 */
export function getPlaidRedirectUri(): string {
  const raw = process.env.EXPO_PUBLIC_PLAID_REDIRECT_URI ?? DEFAULT_PLAID_AUTH_CALLBACK;
  return raw.trim().replace(/\/+$/, '');
}

/** @deprecated Prefer `getPlaidRedirectUri()` */
export const PLAID_REDIRECT_URI = getPlaidRedirectUri();
