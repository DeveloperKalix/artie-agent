import * as Notifications from 'expo-notifications';

/**
 * Tiny in-memory coordinator for the iOS app badge.
 *
 * We have more than one source of "unread-ish" count that wants to surface on
 * the app icon (recommendations, pending trade reminders, future sources).
 * Calling `setBadgeCountAsync(n)` directly from each source would race — the
 * last writer wins, so the badge would flicker between sources.
 *
 * Instead, each source owns a key and updates *its* contribution here; the
 * coordinator writes the sum to the OS. This keeps each notification module
 * independent but produces a single, correct badge number.
 *
 * Not persisted — we re-populate on each foreground transition because every
 * notification hook polls its backend `/status` endpoint when the app becomes
 * active.
 */

type BadgeSource = 'recommendations' | 'trade_reminders';

const counts: Record<BadgeSource, number> = {
  recommendations: 0,
  trade_reminders: 0,
};

let lastWritten = -1;

function total(): number {
  return counts.recommendations + counts.trade_reminders;
}

export async function setBadgeContribution(
  source: BadgeSource,
  count: number,
): Promise<void> {
  const next = Math.max(0, Math.floor(count));
  if (counts[source] === next) {
    // Still make sure the OS badge reflects our current total on the first
    // write after app launch, even if this particular source didn't change.
    if (lastWritten !== total()) {
      await flushBadge();
    }
    return;
  }
  counts[source] = next;
  await flushBadge();
}

async function flushBadge(): Promise<void> {
  const t = total();
  lastWritten = t;
  try {
    await Notifications.setBadgeCountAsync(t);
  } catch {
    // Best-effort — the badge is cosmetic.
  }
}
