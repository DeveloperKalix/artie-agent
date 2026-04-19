/**
 * Backend contract for news items. See `frontend-phase3-integration.md` § 2.4 / § 3.
 */

export type NewsSentiment = 'positive' | 'negative' | 'neutral';

export interface NewsItem {
  id?: string | null;
  url: string;
  title: string;
  summary?: string | null;
  source: string;
  tickers: string[];
  published_at?: string | null;
  sentiment?: NewsSentiment | null;
}

export interface FetchNewsResponse {
  items: NewsItem[];
  total: number;
}
