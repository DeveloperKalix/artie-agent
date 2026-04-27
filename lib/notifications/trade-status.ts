import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

import { getTradeStatus } from '@/lib/trade/api';
import { setBadgeContribution } from '@/lib/notifications/badge-coordinator';
import { useAuth } from '@/context/auth-context';

// ---------------------------------------------------------------------------
// Trade-reminder notifications
// ---------------------------------------------------------------------------
//
// Mirrors `lib/notifications/recommendations.ts`:
//   - Request permission once.
//   - On every foreground transition, hit `/trade/status` and decide whether
//     to fire a local notification.
//   - Dedupe via SecureStore (`pending_reminder_count` must actually grow
//     since the last notify).
//   - Contribute our count to the shared badge coordinator so the Agent bell
//     icon badge and the iOS app-icon badge stay in sync.
//
// We do NOT call `Notifications.setNotificationHandler` here — the
// recommendations module already installs a module-level handler that is
// perfectly fine for trade notifications too (alert + badge, no sound).
// ---------------------------------------------------------------------------

function lastNotifiedKey(userId: string) {
  return `artie.trade.lastNotifiedRemindersCount.${userId}`;
}

async function readLastNotifiedCount(userId: string): Promise<number> {
  try {
    const raw = await SecureStore.getItemAsync(lastNotifiedKey(userId));
    if (!raw) return 0;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

async function writeLastNotifiedCount(userId: string, count: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(lastNotifiedKey(userId), String(count));
  } catch {
    // Best-effort.
  }
}

async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!Device.isDevice) return true;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function fireRemindersNotification(count: number, marketOpen: boolean) {
  // Market-open copy matters here: if the market is still closed, telling
  // the user "ready to place" would be misleading. The backend only reminds
  // us when a scheduled-for-open intent becomes actionable OR when a stale
  // preview needs re-confirmation, so most reminders imply "act now".
  const body =
    count === 1
      ? marketOpen
        ? 'A scheduled trade is ready for you to confirm.'
        : 'You have a pending trade reminder. Tap to review.'
      : marketOpen
        ? `${count} scheduled trades are ready for you to confirm.`
        : `${count} pending trade reminders. Tap to review.`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Artie: Trade Reminder',
      body,
      // Deep-link to the Agent tab; the bell icon there opens the sheet.
      data: { url: '/(tabs)/agent' },
    },
    trigger: null,
  });
}

/**
 * Call once from the root layout, alongside `useRecommendationNotifications`.
 * Polls `/trade/status` on foreground and on first mount after sign-in; emits
 * a local notification when `pending_reminder_count` grows.
 */
export function useTradeNotifications() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  const permissionGranted = useRef(false);
  const checking = useRef(false);

  useEffect(() => {
    if (!token || !userId) return;
    requestPermission()
      .then((granted) => {
        permissionGranted.current = granted;
      })
      .catch(() => {});
  }, [token, userId]);

  useEffect(() => {
    if (!token || !userId) return;

    const checkStatus = async () => {
      if (checking.current) return;
      checking.current = true;
      try {
        const { data } = await getTradeStatus(token, userId);
        if (!data) return;

        const currentCount = data.pending_reminder_count ?? 0;

        // Always update the shared app-badge contribution so the dot on the
        // Agent header and the iOS icon badge stay in sync with the server.
        await setBadgeContribution('trade_reminders', currentCount);

        // Notifications are gated on permission; the badge update above is
        // cheap and safe to do regardless.
        if (!permissionGranted.current) return;

        const lastNotified = await readLastNotifiedCount(userId);

        if (currentCount === 0) {
          if (lastNotified !== 0) {
            await writeLastNotifiedCount(userId, 0);
          }
          return;
        }

        if (currentCount > lastNotified) {
          await fireRemindersNotification(currentCount, !!data.market_open);
          await writeLastNotifiedCount(userId, currentCount);
        }
      } catch {
        // Silent — notifications are best-effort.
      } finally {
        checking.current = false;
      }
    };

    void checkStatus();

    const subscription = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state === 'active') {
          void checkStatus();
        }
      },
    );

    return () => subscription.remove();
  }, [token, userId]);
}
