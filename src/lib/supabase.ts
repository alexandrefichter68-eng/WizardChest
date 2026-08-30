import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY — check .env');
}

/**
 * The `anon`/publishable key is meant to ship in client code (that's what it's for) — the real
 * security boundary is Postgres Row Level Security on every table, not keeping this key secret.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No OAuth redirect flow in this app (yet) — parsing the URL for a session on every load is
    // unnecessary work and, on web, an occasional source of false-positive parsing errors.
    detectSessionInUrl: false,
  },
});
