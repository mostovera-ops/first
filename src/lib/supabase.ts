import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * True only when both env vars are present. When false, the app still renders
 * the auth screens (in a "needs setup" state) instead of crashing — see
 * SETUP.md for how to fill in `.env.local`.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * The Supabase client, or `null` when env vars are missing. Everything that
 * touches auth/db must handle the null case.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** The redirect target for confirmation / OAuth / recovery links. */
export const authRedirectTo =
  typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
