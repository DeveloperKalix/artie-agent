import type { NewsItem } from '@/lib/news/types';

/**
 * Backend contract for on-demand recommendations. See
 * `frontend-phase3-integration.md` § 2.5 / § 3.
 */

export type RecommendationAction = 'buy' | 'sell' | 'hold' | 'increase' | 'reduce';
export type Confidence = 'high' | 'medium' | 'low';

export interface PortfolioRecommendation {
  ticker: string;
  action: RecommendationAction;
  confidence: Confidence;
  explanation: string;
  supporting_articles: NewsItem[];
}

export interface RecommendationResponse {
  user_id: string;
  generated_at: string;
  recommendations: PortfolioRecommendation[];
  disclaimer: string;
}

/** Response from `GET /api/v1/recommendations/status` — zero-LLM, zero-cursor-advance. */
export interface RecommendationStatus {
  has_new: boolean;
  new_count: number;
  last_seen_at: string | null;
  tickers: string[];
}
