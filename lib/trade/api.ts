import { query } from '@/lib/api/query';
import type {
  CreateOrderIntent,
  MarketOpenResponse,
  OrderIntentListResponse,
  OrderIntentResponse,
  SymbolSearchRequest,
  SymbolSearchResponse,
  TradeQuoteResponse,
  TradeRemindersResponse,
  TradeStatusResponse,
  AssetClass,
  IntentStatus,
} from './types';

/**
 * Phase 6 trade endpoints — one thin wrapper per route.
 *
 * All endpoints live under `/api/v1/trade/*` and require the `X-User-Id`
 * header. The generic `query<T>()` helper already handles JSON encoding,
 * timeouts, 204-no-content, and auth. Bodyless POSTs still need `body: {}`
 * so `query()` sets `Content-Type: application/json`.
 *
 * Timeouts differ per endpoint:
 *   - Preview / confirm: 30 s (can hit SnapTrade upstream).
 *   - Everything else: default 8 s.
 */

// ---------------------------------------------------------------------------
// Symbol search / quote
// ---------------------------------------------------------------------------

export function searchSymbols(
  token: string,
  userId: string,
  body: SymbolSearchRequest,
) {
  return query<SymbolSearchResponse, SymbolSearchRequest>(
    '/api/v1/trade/symbols/search',
    {
      method: 'POST',
      token,
      headers: { 'X-User-Id': userId },
      body,
      timeoutMs: 15_000,
    },
  );
}

export function getTradeQuote(
  token: string,
  userId: string,
  params: { accountId: string; symbol: string },
) {
  const qs = new URLSearchParams({
    account_id: params.accountId,
    symbol: params.symbol,
  }).toString();
  return query<TradeQuoteResponse>(`/api/v1/trade/quote?${qs}`, {
    token,
    headers: { 'X-User-Id': userId },
    timeoutMs: 15_000,
  });
}

// ---------------------------------------------------------------------------
// Status / reminders / market
// ---------------------------------------------------------------------------

/**
 * Cheap — mirrors `GET /recommendations/status`. Poll on every app-foreground
 * event to drive the bell badge on the Agent tab header.
 */
export function getTradeStatus(token: string, userId: string) {
  return query<TradeStatusResponse>('/api/v1/trade/status', {
    token,
    headers: { 'X-User-Id': userId },
  });
}

export function getTradeReminders(token: string, userId: string) {
  return query<TradeRemindersResponse>('/api/v1/trade/reminders', {
    token,
    headers: { 'X-User-Id': userId },
  });
}

export function getMarketOpen(
  token: string,
  userId: string,
  assetClass: AssetClass,
) {
  const qs = new URLSearchParams({ asset_class: assetClass }).toString();
  return query<MarketOpenResponse>(`/api/v1/trade/market/open?${qs}`, {
    token,
    headers: { 'X-User-Id': userId },
  });
}

// ---------------------------------------------------------------------------
// Intent lifecycle
// ---------------------------------------------------------------------------

export function createOrderIntent(
  token: string,
  userId: string,
  body: CreateOrderIntent,
) {
  return query<OrderIntentResponse, CreateOrderIntent>('/api/v1/trade/intents', {
    method: 'POST',
    token,
    headers: { 'X-User-Id': userId },
    body,
    timeoutMs: 20_000,
  });
}

export function previewOrderIntent(
  token: string,
  userId: string,
  intentId: string,
) {
  return query<OrderIntentResponse>(
    `/api/v1/trade/intents/${encodeURIComponent(intentId)}/preview`,
    {
      method: 'POST',
      token,
      headers: { 'X-User-Id': userId },
      body: {},
      timeoutMs: 30_000,
    },
  );
}

/**
 * Confirm an intent. Response may come back with:
 *   - `status = "submitted"` — order sent to broker, start polling detail.
 *   - `status = "scheduled_for_market_open"` — NOT an error; equity order
 *     during after-hours. `intent.scheduled_for` is the humanised ETA.
 *   - `status = "previewed"` — **backend auto-re-previewed** because the
 *     original `snaptrade_trade_id` expired. The impact numbers are fresh;
 *     the UI should flash and ask the user to confirm again.
 *   - `status = "failed"` — `intent.error` has the reason.
 *
 * Per phase-6 § 2, the backend never treats scheduled-for-market-open as
 * an error and never returns 4xx for a stale preview.
 */
export function confirmOrderIntent(
  token: string,
  userId: string,
  intentId: string,
) {
  return query<OrderIntentResponse>(
    `/api/v1/trade/intents/${encodeURIComponent(intentId)}/confirm`,
    {
      method: 'POST',
      token,
      headers: { 'X-User-Id': userId },
      body: {},
      timeoutMs: 30_000,
    },
  );
}

export function cancelOrderIntent(
  token: string,
  userId: string,
  intentId: string,
) {
  return query<OrderIntentResponse>(
    `/api/v1/trade/intents/${encodeURIComponent(intentId)}/cancel`,
    {
      method: 'POST',
      token,
      headers: { 'X-User-Id': userId },
      body: {},
      timeoutMs: 15_000,
    },
  );
}

/** Call after the user sees and acts on a reminder so it drops from the queue. */
export function acknowledgeOrderIntent(
  token: string,
  userId: string,
  intentId: string,
) {
  return query<OrderIntentResponse>(
    `/api/v1/trade/intents/${encodeURIComponent(intentId)}/acknowledge`,
    {
      method: 'POST',
      token,
      headers: { 'X-User-Id': userId },
      body: {},
    },
  );
}

export function getOrderIntent(
  token: string,
  userId: string,
  intentId: string,
) {
  return query<OrderIntentResponse>(
    `/api/v1/trade/intents/${encodeURIComponent(intentId)}`,
    {
      token,
      headers: { 'X-User-Id': userId },
    },
  );
}

export interface ListOrderIntentsOptions {
  /** Comma-separated list of statuses or an array we'll join. */
  status?: IntentStatus[] | string;
  limit?: number;
}

export function listOrderIntents(
  token: string,
  userId: string,
  opts: ListOrderIntentsOptions = {},
) {
  const params = new URLSearchParams();
  if (opts.status) {
    const statusParam = Array.isArray(opts.status)
      ? opts.status.join(',')
      : opts.status;
    if (statusParam) params.set('status', statusParam);
  }
  if (typeof opts.limit === 'number') {
    params.set('limit', String(opts.limit));
  }
  const qs = params.toString();
  const path = qs ? `/api/v1/trade/intents?${qs}` : '/api/v1/trade/intents';
  return query<OrderIntentListResponse>(path, {
    token,
    headers: { 'X-User-Id': userId },
  });
}
