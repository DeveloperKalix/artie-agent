/**
 * Centralised trading error mapper. Call sites:
 *
 *   const { error, status } = await confirmOrderIntent(...);
 *   if (error) {
 *     const { message, route } = handleTradeError(status, error);
 *     alertError('Order failed', message);
 *     if (route === 'settings') router.push('/(tabs)/profile');
 *   }
 *
 * Keep it pure — no imports of `Alert` or router so the hook layer can choose
 * when to surface. See `frontend-phase6-integration.md` § 3.4 status codes.
 */

export type TradeErrorRoute = 'settings' | 'orders';

export interface TradeErrorResolution {
  message: string;
  /** Suggested navigation target when the user needs to act. */
  route?: TradeErrorRoute;
}

/**
 * Some backend 422 bodies carry `{ detail: { message, risk_checks, ... } }`
 * where the nested `message` is user-facing. Try to extract it defensively;
 * callers see strings from `query()` so `body` can be a bare string, an
 * object, or a JSON-stringified object.
 */
function extractNestedMessage(body: unknown): string | null {
  if (typeof body === 'string') {
    // `query()` already stringified; try JSON-parsing to pull out a `message`.
    try {
      const parsed = JSON.parse(body);
      return extractNestedMessage(parsed);
    } catch {
      return null;
    }
  }
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (typeof b.message === 'string' && b.message.length > 0) return b.message;
    if (b.detail && typeof b.detail === 'object') {
      const d = b.detail as Record<string, unknown>;
      if (typeof d.message === 'string' && d.message.length > 0) return d.message;
    }
    if (typeof b.detail === 'string' && b.detail.length > 0) return b.detail;
  }
  return null;
}

export function handleTradeError(
  httpStatus: number | null | undefined,
  body: unknown,
): TradeErrorResolution {
  // `body` from `query()` is typically the error string, but we still do
  // best-effort JSON parsing in case the caller passed the raw response.
  const nested = extractNestedMessage(body);

  switch (httpStatus) {
    case 403:
      return {
        message:
          nested ??
          'Trading is disabled or the disclaimer has not been acknowledged.',
        route: 'settings',
      };
    case 404:
      return {
        message: nested ?? 'Order not found.',
        route: 'orders',
      };
    case 409:
      return {
        message:
          nested ??
          'This order can no longer be changed — it already moved to a final state.',
      };
    case 422:
      return {
        message:
          nested ??
          'The order was rejected. Check your limits in Settings and try again.',
        // Risk-check rejections almost always mean raising a cap — route to settings.
        route: 'settings',
      };
    case 502:
      return {
        message:
          nested ??
          'The broker is temporarily unavailable. Try again in a moment.',
      };
    default:
      return {
        message:
          nested ?? (typeof body === 'string' && body.length > 0
            ? body
            : 'Something went wrong. Try again.'),
      };
  }
}
