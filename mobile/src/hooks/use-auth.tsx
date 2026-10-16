import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

/** Your public profile, from the "profiles" table online. */
export type Profile = {
  displayName: string;
  homeCountry?: string;
  createdAt: string;
};

type AuthContextValue = {
  /** False when the app was built without account settings (see mobile/.env.example). */
  available: boolean;
  /** True until we know whether you're signed in. */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<string | undefined>;
  /** Returns an error message, or undefined on success. `needsConfirmation` means check your email. */
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (changes: Partial<Pick<Profile, 'displayName' | 'homeCountry'>>) => Promise<string | undefined>;
};

const AuthContext = createContext<AuthContextValue>({
  available: false,
  loading: false,
  session: null,
  profile: null,
  signIn: async () => 'Accounts are not set up.',
  signUp: async () => ({ error: 'Accounts are not set up.' }),
  signOut: async () => {},
  updateProfile: async () => 'Accounts are not set up.',
});

type ProfileRow = { display_name: string | null; home_country: string | null; created_at: string };

function profileFromRow(row: ProfileRow, fallbackName: string): Profile {
  return {
    displayName: row.display_name || fallbackName,
    homeCountry: row.home_country ?? undefined,
    createdAt: row.created_at,
  };
}

/** Your account: whether you're signed in, and your profile. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(supabase !== null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const email = session?.user.email ?? '';

  useEffect(() => {
    if (!supabase || !userId) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('display_name, home_country, created_at')
      .eq('id', userId)
      .maybeSingle<ProfileRow>()
      .then(({ data }) => {
        if (cancelled) return;
        const fallbackName = email.split('@')[0];
        setProfile(
          data
            ? profileFromRow(data, fallbackName)
            : { displayName: fallbackName, createdAt: new Date().toISOString() },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [userId, email]);

  const value = useMemo<AuthContextValue>(
    () => ({
      available: supabase !== null,
      loading,
      session,
      profile,
      signIn: async (signInEmail, password) => {
        if (!supabase) return 'Accounts are not set up.';
        const { error } = await supabase.auth.signInWithPassword({ email: signInEmail.trim(), password });
        return error?.message;
      },
      signUp: async (signUpEmail, password, displayName) => {
        if (!supabase) return { error: 'Accounts are not set up.' };
        const { data, error } = await supabase.auth.signUp({
          email: signUpEmail.trim(),
          password,
          // The database copies this into your profile (see supabase/schema.sql).
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) return { error: error.message };
        return { needsConfirmation: !data.session };
      },
      signOut: async () => {
        await supabase?.auth.signOut();
      },
      updateProfile: async (changes) => {
        if (!supabase || !userId) return 'You are not signed in.';
        const row: Partial<ProfileRow> = {};
        if (changes.displayName !== undefined) row.display_name = changes.displayName.trim();
        if (changes.homeCountry !== undefined) row.home_country = changes.homeCountry.trim() || null;
        const { error } = await supabase.from('profiles').upsert({ id: userId, ...row });
        if (error) return error.message;
        setProfile((current) => ({
          displayName: row.display_name ?? current?.displayName ?? '',
          homeCountry: row.home_country === undefined ? current?.homeCountry : (row.home_country ?? undefined),
          createdAt: current?.createdAt ?? new Date().toISOString(),
        }));
        return undefined;
      },
    }),
    [loading, session, profile, userId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
