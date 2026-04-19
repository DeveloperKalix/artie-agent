// ---------------------------------------------------------------------------
// SnapTrade — typed API shapes
// ---------------------------------------------------------------------------

/** POST /api/v1/snaptrade/connect  |  /api/v1/snaptrade/add-broker */
export interface SnapTradeConnectRequest {
  user_id: string;
  /** Deep-link URI SnapTrade redirects to when user taps Done (e.g. artie://snaptrade-complete) */
  custom_redirect?: string;
  /** "read" (default) or "trade" */
  connection_type?: 'read' | 'trade';
  /** Pre-select a broker slug e.g. "ALPACA" */
  broker?: string | null;
}

export interface SnapTradeConnectResponse {
  redirect_uri: string;
  /** Identical to redirect_uri */
  url: string;
  snaptrade_user_id: string;
  session_id: string | null;
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export interface SnapTradeAccount {
  id: string;
  name: string;
  number: string;
  institution_name: string;
  account_type: string;
  status: string;
  is_paper: boolean;
  balance_total: number;
  balance_currency: string;
  raw: Record<string, unknown>;
}

export interface SnapTradeAccountsResponse {
  accounts: SnapTradeAccount[];
}

// ---------------------------------------------------------------------------
// Positions
// ---------------------------------------------------------------------------

export interface SnapTradePosition {
  account_id: string;
  symbol: string;
  description: string;
  quantity: number;
  average_purchase_price: number;
  current_price: number;
  market_value: number;
  unrealized_gain: number;
  currency: string;
  asset_class: string;
  raw: Record<string, unknown>;
}

export interface SnapTradePositionsResponse {
  positions: SnapTradePosition[];
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export type SnapTradeTransactionType =
  | 'BUY'
  | 'SELL'
  | 'DIVIDEND'
  | 'INTEREST'
  | 'CONTRIBUTION'
  | 'WITHDRAWAL';

export interface SnapTradeTransaction {
  account_id: string;
  transaction_id: string;
  type: SnapTradeTransactionType;
  symbol: string;
  description: string;
  quantity: number;
  price: number;
  amount: number;
  currency: string;
  trade_date: string;
  settlement_date: string;
  raw: Record<string, unknown>;
}

export interface SnapTradeTransactionsResponse {
  transactions: SnapTradeTransaction[];
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface SnapTradeOrder {
  account_id: string;
  brokerage_order_id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  order_type: string;
  status: string;
  quantity: number;
  limit_price: number | null;
  filled_quantity: number;
  execution_price: number | null;
  time_placed: string;
  time_filled: string | null;
  time_in_force: string;
  raw: Record<string, unknown>;
}

export interface SnapTradeOrdersResponse {
  orders: SnapTradeOrder[];
}
