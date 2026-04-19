import { query } from '@/lib/api/query';
import type { FetchNewsResponse } from './types';

export interface FetchNewsOptions {
  tickers?: string[];
  query?: string;
  limit?: number;
}

/**
 * Public (no `X-User-Id` header) news query. Priority is
 * `tickers > query > recent` — supplying both uses `tickers`.
 */
export function fetchNews(opts: FetchNewsOptions = {}) {
  const params = new URLSearchParams();
  if (opts.tickers && opts.tickers.length > 0) {
    params.set('tickers', opts.tickers.join(','));
  }
  if (opts.query) params.set('query', opts.query);
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  return query<FetchNewsResponse>(`/api/v1/news${qs ? `?${qs}` : ''}`);
}
