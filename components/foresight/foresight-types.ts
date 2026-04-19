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
  /** Stored recommendation UUID from the backend — required for markViewed. */
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
  /** ISO-8601 string set when the user has marked this foresight viewed. */
  viewedAt?: string | null;
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
  fallbackTimestamp: string,
): Recommendation {
  // All fields are defensively coerced because a single malformed row
  // shouldn't be able to poison Array.map() and wipe out the whole list.
  const action: RecommendationAction = rec.action ?? 'hold';
  const confidence: Confidence = rec.confidence ?? 'low';
  const explanation = typeof rec.explanation === 'string' ? rec.explanation : '';
  const ticker = rec.ticker ?? '';

  let title: string;
  if (ticker) {
    title = `${action.toUpperCase()} ${ticker} · ${confidence} confidence`;
  } else if (explanation) {
    const firstSentence = explanation.split('. ')[0];
    title = firstSentence && firstSentence.length > 0 ? firstSentence : explanation;
  } else {
    title = 'Recommendation';
  }

  // Prefer the stored UUID so markViewed() can reach the right row. Fall back
  // to a deterministic synthetic key only if the backend omits id (shouldn't
  // happen for persisted foresights but keeps the list renderer safe).
  const id =
    rec.id && rec.id.length > 0
      ? rec.id
      : `${ticker || 'unknown'}-${action}-${rec.generated_at ?? fallbackTimestamp}`;

  return {
    id,
    title,
    timestamp: rec.generated_at ?? fallbackTimestamp,
    action: toUiAction(action, confidence),
    viewed: rec.viewed_at != null,
    ticker: ticker || undefined,
    confidence,
    explanation: explanation || undefined,
    supporting_articles: rec.supporting_articles,
    rawAction: action,
    viewedAt: rec.viewed_at,
  };
}
