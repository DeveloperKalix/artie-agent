import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

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
 * Call once from the root layout. On every app-foreground transition:
 *  1. Checks `GET /api/v1/recommendations/status` (~200 ms, no LLM).
 *  2. If `has_new=true`, fires a local notification so iOS shows a banner
 *     even if the app is backgrounded.
 *  3. Updates the app badge count.
 *
 * Important: local notifications are sufficient for the current architecture
 * because the check happens when the app foregrounds. For true background
 * push (when the app is fully closed) you would need a push token registered
 * with the backend + APNs, which requires a paid Apple developer account and
 * a production build. This hook handles the in-app + foregrounding case.
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

        // Always sync badge to the current new_count.
        await Notifications.setBadgeCountAsync(data.has_new ? data.new_count : 0);

        if (data.has_new && data.new_count > 0) {
          await fireNewRecommendationsNotification(data.new_count, data.tickers);
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
