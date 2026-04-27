/**
 * Backend network shapes for Phase 6 trading (SnapTrade equities + crypto).
 * See `frontend-phase6-integration.md` § 2.
 *
 * Conventions mirrored from the rest of the lib/<domain>/types.ts files:
 *   - Every optional server field is `| null` (never `?:`), so network decoding
 *     is lossless across JSON <-> TS.
 *   - The opaque `raw: Record<string, unknown>` bag on SnapTrade payloads is
 *     deliberately left untyped — we don't model the upstream schema.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type AssetClass = 'equity' | 'crypto';
export type OrderAction = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type TimeInForce = 'day' | 'gtc' | 'fok' | 'ioc';
export type IntentSource = 'ui' | 'llm';

export type IntentStatus =
  | 'awaiting_confirmation'
  | 'previewed'
  | 'confirmed'
  | 'scheduled_for_market_open'
  | 'submitted'
  | 'filled'
  | 'cancelled'
  | 'failed'
  | 'rejected';

/**
 * Statuses that are "done" — polling `GET /trade/intents/{id}` can stop.
 * (Scheduled is *not* terminal: the reminder flow wakes it back up.)
 */
export const TERMINAL_INTENT_STATUSES: readonly IntentStatus[] = [
  'filled',
  'cancelled',
  'failed',
  'rejected',
] as const;

export function isTerminalStatus(s: IntentStatus): boolean {
  return (TERMINAL_INTENT_STATUSES as readonly IntentStatus[]).includes(s);
}

/** In-flight statuses worth polling every 3s. */
export const POLLABLE_INTENT_STATUSES: readonly IntentStatus[] = [
  'submitted',
  'confirmed',
  'previewed',
] as const;

export function isPollableStatus(s: IntentStatus): boolean {
  return (POLLABLE_INTENT_STATUSES as readonly IntentStatus[]).includes(s);
}

// ---------------------------------------------------------------------------
// ImpactPreview / OrderIntent
// ---------------------------------------------------------------------------

export interface ImpactPreview {
  trade_id: string | null;
  symbol: string | null;
  action: string | null;
  order_type: string | null;
  time_in_force: string | null;
  units: number | null;
  price: number | null;
  estimated_value: number | null;
  commission: number | null;
  currency: string | null;
  buying_power_effect: number | null;
  remaining_buying_power: number | null;
  /** ISO-8601 — when the preview stops being valid. Drives the live countdown. */
  expires_at: string | null;
  warnings: string[];
  raw: Record<string, unknown>;
}

export interface OrderIntent {
  id: string;
  user_id: string;
  conversation_id: string | null;
  source: IntentSource;
  asset_class: AssetClass;

  account_id: string;
  universal_symbol_id: string | null;
  symbol: string;
  action: OrderAction;
  order_type: OrderType;
  time_in_force: TimeInForce;
  units: number | null;
  notional_value: number | null;
  price: number | null;
  stop: number | null;

  status: IntentStatus;
  snaptrade_trade_id: string | null;
  snaptrade_order_id: string | null;
  impact: ImpactPreview | null;
  impact_expires_at: string | null;
  estimated_value: number | null;

  scheduled_for: string | null;
  reminder_fires_at: string | null;
  reminded_at: string | null;
  acknowledged_at: string | null;
  confirmed_at: string | null;
  submitted_at: string | null;
  filled_at: string | null;

  error: Record<string, unknown> | null;
  risk_checks: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Request shapes
// ---------------------------------------------------------------------------

export interface CreateOrderIntent {
  asset_class: AssetClass;
  account_id: string;
  symbol: string;
  universal_symbol_id?: string | null;
  action: OrderAction;
  /** Defaults to `"market"` server-side. */
  order_type?: OrderType;
  /** Defaults to `"day"` server-side. */
  time_in_force?: TimeInForce;
  /** Provide exactly one of `units` | `notional_value`. */
  units?: number;
  notional_value?: number;
  /** Required for limit / stop_limit. */
  price?: number;
  /** Required for stop / stop_limit. */
  stop?: number;
  conversation_id?: string | null;
}

export interface SymbolSearchRequest {
  query: string;
  account_id?: string;
}

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export interface OrderIntentResponse {
  intent: OrderIntent;
}

export interface OrderIntentListResponse {
  intents: OrderIntent[];
}

export interface TradeStatusResponse {
  /** Drives the bell-badge count on the Agent tab header. */
  pending_reminder_count: number;
  active_intent_count: number;
  market_open: boolean;
  next_market_open: string | null;
  trading_enabled: boolean;
  disclaimer_acknowledged: boolean;
}

export interface TradeRemindersResponse {
  reminders: OrderIntent[];
}

export interface SymbolSearchResult {
  symbol: string;
  description: string | null;
  universal_symbol_id: string | null;
  exchange: string | null;
  currency: string | null;
  raw: Record<string, unknown>;
}

export interface SymbolSearchResponse {
  results: SymbolSearchResult[];
}

export interface TradeQuoteResponse {
  symbol: string;
  bid: number | null;
  ask: number | null;
  last: number | null;
  currency: string | null;
  raw: Record<string, unknown>;
}

export interface MarketOpenResponse {
  asset_class: AssetClass;
  open: boolean;
  next_open: string | null;
}

// ---------------------------------------------------------------------------
// TradingConfig (profile settings)
// ---------------------------------------------------------------------------

export interface TradingConfig {
  enabled: boolean;
  max_order_usd: number;
  max_daily_usd: number;
  llm_proposals_enabled: boolean;
  disclaimer_acknowledged_at: string | null;
}

export interface PatchTradingConfigRequest {
  enabled?: boolean;
  max_order_usd?: number;
  max_daily_usd?: number;
  llm_proposals_enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Chat-message metadata shapes (for MessageBubble branching)
// ---------------------------------------------------------------------------

/**
 * Assistant message emitted by the LLM `propose_order` tool call. The intent
 * is always server-side pre-previewed so the bubble can render the impact
 * numbers immediately without an additional round-trip.
 */
export interface TradeProposalMetadata {
  source: 'trade_proposal';
  intent_id: string;
  symbol: string;
  action: OrderAction;
  asset_class: AssetClass;
  impact_expires_at: string | null;
  estimated_value: number | null;
}

/**
 * System message posted by the scheduler after a rescheduled order's market
 * window opens. The reminder's intent has already been re-woken server-side.
 */
export interface TradeReminderMetadata {
  source: 'trade_reminder';
  intent_id: string;
  symbol: string;
  action: OrderAction;
}

// ---------------------------------------------------------------------------
// Type guards (cheap runtime narrowing for `message.metadata`)
// ---------------------------------------------------------------------------

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export function isTradeProposalMetadata(m: unknown): m is TradeProposalMetadata {
  if (!isRecord(m)) return false;
  if (m.source !== 'trade_proposal') return false;
  return typeof m.intent_id === 'string' && m.intent_id.length > 0;
}

export function isTradeReminderMetadata(m: unknown): m is TradeReminderMetadata {
  if (!isRecord(m)) return false;
  if (m.source !== 'trade_reminder') return false;
  return typeof m.intent_id === 'string' && m.intent_id.length > 0;
}

/** Convenience — any trade-related chat card. */
export function isTradeMessageMetadata(
  m: unknown,
): m is TradeProposalMetadata | TradeReminderMetadata {
  return isTradeProposalMetadata(m) || isTradeReminderMetadata(m);
}
