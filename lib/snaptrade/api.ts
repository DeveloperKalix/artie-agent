import { query } from '@/lib/api/query';
import type {
  SnapTradeAccountsResponse,
  SnapTradeConnectRequest,
  SnapTradeConnectResponse,
  SnapTradeConnectionsResponse,
  SnapTradeOrdersResponse,
  SnapTradePositionsResponse,
  SnapTradeTransactionsResponse,
} from './types';

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

/** First-time registration + portal URL. */
export function snapTradeConnect(token: string, body: SnapTradeConnectRequest) {
  return query<SnapTradeConnectResponse>('/api/v1/snaptrade/connect', {
    method: 'POST',
    token,
    body,
  });
}

/**
 * Add another brokerage for an already-registered user.
 * Safe to call unlimited times — never re-registers.
 */
export function snapTradeAddBroker(token: string, body: SnapTradeConnectRequest) {
  return query<SnapTradeConnectResponse>('/api/v1/snaptrade/add-broker', {
    method: 'POST',
    token,
    body,
  });
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export function fetchSnapTradeAccounts(token: string, userId: string) {
  return query<SnapTradeAccountsResponse>(
    `/api/v1/snaptrade/accounts?user_id=${encodeURIComponent(userId)}`,
    { token, headers: { 'X-User-Id': userId } },
  );
}

// ---------------------------------------------------------------------------
// Connections (brokerage authorizations)
// ---------------------------------------------------------------------------

/** List all brokerage connections. Each item's `id` is the authorization UUID needed for deletion. */
export function fetchSnapTradeConnections(token: string, userId: string) {
  return query<SnapTradeConnectionsResponse>(
    `/api/v1/snaptrade/connections?user_id=${encodeURIComponent(userId)}`,
    { token, headers: { 'X-User-Id': userId } },
  );
}

/**
 * Remove a brokerage authorization (and all accounts under it).
 *
 * `authorizationId` must come from `GET /api/v1/snaptrade/connections[].id`.
 *
 * 204 — disconnected
 * 404 — user not registered or authorization not found
 */
export function deleteSnapTradeConnection(token: string, userId: string, authorizationId: string) {
  return query<void>(`/api/v1/snaptrade/connections/${encodeURIComponent(authorizationId)}`, {
    method: 'DELETE',
    token,
    headers: { 'X-User-Id': userId },
  });
}

// ---------------------------------------------------------------------------
// Positions
// ---------------------------------------------------------------------------

export function fetchSnapTradePositions(token: string, userId: string) {
  return query<SnapTradePositionsResponse>(
    `/api/v1/snaptrade/positions?user_id=${encodeURIComponent(userId)}`,
    { token, headers: { 'X-User-Id': userId } },
  );
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export interface FetchTransactionsOptions {
  startDate?: string; // ISO-8601 e.g. "2025-01-01"
  endDate?: string;   // ISO-8601 e.g. "2026-04-19"
}

export function fetchSnapTradeTransactions(
  token: string,
  userId: string,
  opts: FetchTransactionsOptions = {},
) {
  const params = new URLSearchParams({ user_id: userId });
  if (opts.startDate) params.set('start_date', opts.startDate);
  if (opts.endDate) params.set('end_date', opts.endDate);
  return query<SnapTradeTransactionsResponse>(`/api/v1/snaptrade/transactions?${params.toString()}`, {
    token,
    headers: { 'X-User-Id': userId },
  });
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export function fetchSnapTradeOrders(token: string, userId: string) {
  return query<SnapTradeOrdersResponse>(
    `/api/v1/snaptrade/orders?user_id=${encodeURIComponent(userId)}`,
    { token, headers: { 'X-User-Id': userId } },
  );
}

