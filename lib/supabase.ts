import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { supabaseStorageAdapter } from '@/lib/supabase-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: supabaseStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // Prevent an idle WebSocket connection — we don't use Realtime.
  realtime: {
    params: { eventsPerSecond: 0 },
  },
});
