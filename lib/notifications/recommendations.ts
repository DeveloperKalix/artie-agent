import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

import { getRecommendationStatus } from '@/lib/recommendations/api';
import { useAuth } from '@/context/auth-context';

// ---------------------------------------------------------------------------
// Module-level notification handler — set once, before any component mounts.
// Controls how notifications appear when the app is in the foreground.
// ---------------------------------------------------------------------------
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ---------------------------------------------------------------------------
// Persistence — de-dupe notifications across foreground events / restarts.
// Keyed per user so switching accounts doesn't inherit old state.
// ---------------------------------------------------------------------------

function lastNotifiedKey(userId: string) {
  return `artie.rec.lastNotifiedCount.${userId}`;
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
    // Best-effort — don't crash if keychain is unavailable.
  }
}

// ---------------------------------------------------------------------------
// Permission helper
// ---------------------------------------------------------------------------

async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!Device.isDevice) {
    // Simulators can schedule local notifications but can't receive push;
    // still useful for testing the flow.
    return true;
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ---------------------------------------------------------------------------
// Local notification
// ---------------------------------------------------------------------------

async function fireNewRecommendationsNotification(count: number, tickers: string[]) {
  // `tickers` comes from `/status` and represents the user's SnapTrade position
  // tickers — not necessarily the exact tickers of the stored foresights, but a
  // useful hint so the notification feels personalized.
  const tickerLabel =
    tickers.length > 0 ? ` for ${tickers.slice(0, 3).join(', ')}` : '';
  const body =
    count === 1
      ? `1 new recommendation${tickerLabel}. Tap to view.`
      : `${count} new recommendations${tickerLabel}. Tap to view.`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Artie: New Insights',
      body,
      // Deep-link directly to the Foresight tab when the user taps.
      data: { url: '/(tabs)/foresight' },
      badge: count,
    },
    trigger: null, // fire immediately
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Call once from the root layout.
 *
 * On every foreground transition we hit `/recommendations/status` (cheap,
 * ~150 ms) and decide whether to fire a local notification. The notification
 * is rate-limited by `lastNotifiedCount` persisted in SecureStore, so we
 * don't spam the user on repeat foregrounds.
 *
 * Rules:
 *  - Fire only when `new_count > lastNotifiedCount` (i.e. actual increase).
 *  - Reset `lastNotifiedCount` to 0 when `new_count` drops to 0 (user viewed
 *    everything, so the *next* increase should notify again).
 *  - Badge count always mirrors the current `new_count`.
 *
 * For true "app fully killed" push you'd need APNs push tokens registered
 * with the backend. This hook covers the "open / foreground" case which is
 * enough for the current product surface.
 */
export function useRecommendationNotifications() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  const permissionGranted = useRef(false);
  // Prevent parallel status checks if two foreground events fire quickly.
  const checking = useRef(false);

  // Request permission once after sign-in.
  useEffect(() => {
    if (!token || !userId) return;
    requestPermission()
      .then((granted) => {
        permissionGranted.current = granted;
      })
      .catch(() => {});
  }, [token, userId]);

  // Check status on every foreground transition.
  useEffect(() => {
    if (!token || !userId) return;

    const checkStatus = async () => {
      if (!permissionGranted.current || checking.current) return;
      checking.current = true;
      try {
        const { data } = await getRecommendationStatus(token, userId);
        if (!data) return;

        const currentCount = data.new_count ?? 0;

        // Badge always mirrors current unviewed count.
        await Notifications.setBadgeCountAsync(currentCount);

        const lastNotified = await readLastNotifiedCount(userId);

        if (currentCount === 0) {
          // User is caught up — allow the next increase to notify again.
          if (lastNotified !== 0) {
            await writeLastNotifiedCount(userId, 0);
          }
          return;
        }

        // Only fire if the count actually grew since we last notified.
        if (currentCount > lastNotified) {
          await fireNewRecommendationsNotification(currentCount, data.tickers ?? []);
          await writeLastNotifiedCount(userId, currentCount);
        }
      } catch {
        // Silent — notification is best-effort, never crash the app.
      } finally {
        checking.current = false;
      }
    };

    // Check immediately when the hook mounts (app just opened / user signed in).
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
