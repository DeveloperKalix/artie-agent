import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Stay under iOS SecureStore’s ~2048-byte warning threshold per entry. */
const CHUNK_SIZE = 1800;

function metaKey(key: string) {
  return `${key}.sbmeta`;
}

function partKey(key: string, i: number) {
  return `${key}.sbpart.${i}`;
}

/**
 * Large Supabase session JSON split across multiple SecureStore keys (each chunk under the limit).
 */
const chunkedSecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const metaRaw = await SecureStore.getItemAsync(metaKey(key));
    if (metaRaw) {
      try {
        const { parts } = JSON.parse(metaRaw) as { parts: number };
        let out = '';
        for (let i = 0; i < parts; i++) {
          const piece = await SecureStore.getItemAsync(partKey(key, i));
          if (piece == null) return null;
          out += piece;
        }
        return out;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    await chunkedSecureStoreAdapter.removeItem(key);
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const parts = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(metaKey(key), JSON.stringify({ parts }));
    for (let i = 0; i < parts; i++) {
      await SecureStore.setItemAsync(
        partKey(key, i),
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      );
    }
  },

  async removeItem(key: string): Promise<void> {
    const metaRaw = await SecureStore.getItemAsync(metaKey(key));
    if (metaRaw) {
      try {
        const { parts } = JSON.parse(metaRaw) as { parts: number };
        for (let i = 0; i < parts; i++) {
          await SecureStore.deleteItemAsync(partKey(key, i));
        }
      } catch {
        /* ignore */
      }
    }
    await SecureStore.deleteItemAsync(metaKey(key));
    await SecureStore.deleteItemAsync(key);
  },
};

function getLocalStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      return globalThis.localStorage as Storage;
    }
  } catch {
    /* SSR / privacy mode */
  }
  return null;
}

const webStorageAdapter = {
  getItem(key: string): Promise<string | null> {
    const ls = getLocalStorage();
    return Promise.resolve(ls ? ls.getItem(key) : null);
  },
  setItem(key: string, value: string): Promise<void> {
    const ls = getLocalStorage();
    if (ls) ls.setItem(key, value);
    return Promise.resolve();
  },
  removeItem(key: string): Promise<void> {
    const ls = getLocalStorage();
    if (ls) ls.removeItem(key);
    return Promise.resolve();
  },
};

/** Supabase auth storage: Keychain-backed chunks on native; localStorage on web (no AsyncStorage native module). */
export const supabaseStorageAdapter =
  Platform.OS === 'web' ? webStorageAdapter : chunkedSecureStoreAdapter;
