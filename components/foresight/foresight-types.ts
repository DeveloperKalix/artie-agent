import type { NewsItem } from '@/lib/news/types';
import type {
  Confidence,
  PortfolioRecommendation,
  RecommendationAction,
} from '@/lib/recommendations/types';

/**
 * UI action variant used by `RecommendationIcon` / `tokens.foresight`.
 * This is a narrowed, visually meaningful subset — the backend emits a wider
 * set (`buy | sell | hold | increase | reduce`). See `toUiAction()` for the
 * mapping.
 */
export type ForesightAction = 'buy' | 'sell' | 'liquidate';

/**
 * UI-shaped recommendation consumed by the Foresight card/list.
 * Keeps the legacy fields (`id`, `title`, `timestamp`, `viewed`) so the
 * existing list renderer keeps working, and layers the Phase 3 backend fields
 * on top for richer card content.
 */
export interface Recommendation {
  id: string;
  title: string;
  /** ISO 8601 string */
  timestamp: string;
  action: ForesightAction;
  viewed: boolean;

  ticker?: string;
  confidence?: Confidence;
  explanation?: string;
  supporting_articles?: NewsItem[];
  /** Raw backend action for screens that want full fidelity. */
  rawAction?: RecommendationAction;
}

/**
 * Map the backend's 5-way action to the 3-way UI variant.
 *
 *   - `buy`       → `buy`
 *   - `increase`  → `buy`    (UI treats as add-to-position)
 *   - `sell`      → `sell`
 *   - `reduce`    → `sell`   (UI treats as trim-position)
 *   - `hold`      → `sell`   (fallback; hold has no dedicated visual yet — the
 *                             amber "sell" glow reads as neutral-caution)
 *
 * A high-confidence `sell` maps to the dramatic `liquidate` visual.
 */
export function toUiAction(
  action: RecommendationAction,
  confidence: Confidence,
): ForesightAction {
  if (action === 'buy' || action === 'increase') return 'buy';
  if (action === 'sell' && confidence === 'high') return 'liquidate';
  return 'sell';
}

/** Adapt a backend recommendation to the UI shape consumed by `RecommendationCard`. */
export function toUiRecommendation(
  rec: PortfolioRecommendation,
  generatedAt: string,
): Recommendation {
  const title = rec.ticker
    ? `${rec.action.toUpperCase()} ${rec.ticker} · ${rec.confidence} confidence`
    : rec.explanation.split('. ')[0] ?? rec.explanation;

  return {
    id: `${rec.ticker}-${rec.action}-${generatedAt}`,
    title,
    timestamp: generatedAt,
    action: toUiAction(rec.action, rec.confidence),
    viewed: false,
    ticker: rec.ticker,
    confidence: rec.confidence,
    explanation: rec.explanation,
    supporting_articles: rec.supporting_articles,
    rawAction: rec.action,
  };
}
