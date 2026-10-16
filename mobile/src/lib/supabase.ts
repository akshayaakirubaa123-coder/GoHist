import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Accounts are stored with Supabase (https://supabase.com), a hosted database
// with sign-in built in. The project's address and public key come from
// mobile/.env (see .env.example). Without them the app still works, just
// without accounts: everything stays on the phone as before.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// The web build is pre-rendered on a server with no storage; skip accounts there.
const canStoreSession = Platform.OS !== 'web' || typeof window !== 'undefined';

/** The Supabase connection, or null when accounts aren't set up. */
export const supabase: SupabaseClient | null =
  url && anonKey && canStoreSession
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// Keep the sign-in fresh only while the app is open.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
