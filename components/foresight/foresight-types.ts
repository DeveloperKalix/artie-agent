export type ForesightAction = 'buy' | 'sell' | 'liquidate';

export interface Recommendation {
  id: string;
  title: string;
  /** ISO 8601 string */
  timestamp: string;
  action: ForesightAction;
  viewed: boolean;
}
