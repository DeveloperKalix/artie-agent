import type { NewsItem } from '@/lib/news/types';

/**
 * Backend contract for persistent recommendations (foresights). See
 * `frontend-phase4-integration.md` § 2.5 / § 3.
 */

export type RecommendationAction = 'buy' | 'sell' | 'hold' | 'increase' | 'reduce';
export type Confidence = 'high' | 'medium' | 'low';

export interface PortfolioRecommendation {
  /** Stored UUID — present on everything from /recommendations endpoints. */
  id: string | null;
  ticker: string;
  action: RecommendationAction;
  confidence: Confidence;
  explanation: string;
  supporting_articles: NewsItem[];
  /** ISO-8601 of when the foresight was generated. */
  generated_at: string | null;
  /** null = unviewed (new); non-null ISO-8601 = viewed at that time. */
  viewed_at: string | null;
}

/** Response from `POST /api/v1/recommendations` — fresh generation. */
export interface RecommendationResponse {
  user_id: string;
  generated_at: string;
  /** How many rows this call actually inserted (newly generated). */
  new_count: number;
  /** Full unviewed feed after this generation. */
  recommendations: PortfolioRecommendation[];
  disclaimer: string;
}

/** Response from `GET /api/v1/recommendations` — bucketed feed. */
export interface RecommendationsListResponse {
  new: PortfolioRecommendation[];
  viewed: PortfolioRecommendation[];
}

/** Response from `GET /api/v1/recommendations/status` — zero-LLM, zero-cursor-advance. */
export interface RecommendationStatus {
  has_new: boolean;
  /** Unviewed stored foresights — primary badge number. */
  new_count: number;
  /** News items since last generation — enables a "refresh" affordance. */
  pending_news_count: number;
  last_seen_at: string | null;
  tickers: string[];
}

/** Response from `POST /api/v1/recommendations/{id}/viewed`. */
export interface MarkViewedResponse {
  marked: boolean;
}
