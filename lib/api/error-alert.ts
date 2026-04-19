import { Alert } from 'react-native';

/**
 * Show a native alert for a backend error string from `query()` results.
 * No-op when `error` is null/empty. Keeps error UX consistent across screens
 * without introducing a toast library.
 *
 * Usage:
 *   const { error } = await postTextMessage(...);
 *   alertError('Could not send message', error);
 */
export function alertError(title: string, error: string | null | undefined): void {
  if (!error) return;
  Alert.alert(title, error);
}
