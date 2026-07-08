import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, authRedirectTo } from '../lib/supabase';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

interface AuthResult {
  ok: boolean;
  /** User-facing message (error or info like "check your email"). */
  message?: string;
}

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  configured: boolean;
  /** True while the user arrived via a password-recovery link. */
  recoveryMode: boolean;

  init: () => void;
  signUpWithEmail: (
    email: string,
    password: string,
  ) => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<AuthResult>;
}

function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return 'Something went wrong. Please try again.';
}

export const useAuth = create<AuthState>((set, get) => ({
  status: isSupabaseConfigured ? 'loading' : 'signedOut',
  session: null,
  user: null,
  configured: isSupabaseConfigured,
  recoveryMode: false,

  init: () => {
    if (!supabase) {
      set({ status: 'signedOut' });
      return;
    }

    const applySession = (session: Session | null, event: string | null) => {
      set({
        session,
        user: session?.user ?? null,
        status: session ? 'signedIn' : 'signedOut',
        recoveryMode:
          event === 'PASSWORD_RECOVERY'
            ? true
            : event === 'SIGNED_OUT'
              ? false
              : get().recoveryMode,
      });
    };

    // Primary signal: onAuthStateChange fires INITIAL_SESSION on setup and on
    // every change (including sessions parsed from the confirmation/OAuth URL).
    supabase.auth.onAuthStateChange((event, session) => applySession(session, event));

    // Safety net for the rare case onAuthStateChange never fires. IMPORTANT:
    // calling getSession() *while* supabase-js is parsing a session out of the
    // redirect URL (the "#access_token=..." hash) deadlocks on its internal
    // lock and pins the app on the spinner — the exact hang seen after
    // OAuth/email-confirm. So we (a) let onAuthStateChange resolve the normal
    // case, and (b) only poll getSession after a delay, once URL parsing has
    // released the lock — racing each call against a timeout as belt-and-braces.
    const getSessionSafe = () =>
      Promise.race<{ session: Session | null }>([
        supabase!.auth.getSession().then((r) => ({ session: r.data.session })),
        new Promise<{ session: Session | null }>((res) =>
          setTimeout(() => res({ session: null }), 2000),
        ),
      ]);

    const resolveInitial = async (attempt = 0) => {
      if (get().status !== 'loading') return;
      let session: Session | null = null;
      try {
        session = (await getSessionSafe()).session;
      } catch {
        /* ignore and retry */
      }
      if (get().status !== 'loading') return; // onAuthStateChange won the race
      if (session) {
        applySession(session, null);
      } else if (attempt < 3) {
        setTimeout(() => void resolveInitial(attempt + 1), 800);
      } else {
        set({ status: 'signedOut' });
      }
    };
    // Delay the first poll so it can't contend with the redirect-URL parsing.
    setTimeout(() => void resolveInitial(), 1600);
  },

  signUpWithEmail: async (email, password) => {
    if (!supabase) return { ok: false, message: 'Auth is not configured yet.' };
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: authRedirectTo },
      });
      if (error) return { ok: false, message: error.message };
      // With double opt-in enabled, there is no session until confirmation.
      if (data.session) return { ok: true };
      return {
        ok: true,
        message:
          'Check your inbox — we sent a confirmation link to finish creating your account.',
      };
    } catch (e) {
      return { ok: false, message: errorMessage(e) };
    }
  },

  signInWithEmail: async (email, password) => {
    if (!supabase) return { ok: false, message: 'Auth is not configured yet.' };
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { ok: false, message: error.message };
      return { ok: true };
    } catch (e) {
      return { ok: false, message: errorMessage(e) };
    }
  },

  signInWithGoogle: async () => {
    if (!supabase) return { ok: false, message: 'Auth is not configured yet.' };
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: authRedirectTo,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) return { ok: false, message: error.message };
      return { ok: true }; // browser redirects to Google
    } catch (e) {
      return { ok: false, message: errorMessage(e) };
    }
  },

  sendPasswordReset: async (email) => {
    if (!supabase) return { ok: false, message: 'Auth is not configured yet.' };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirectTo,
      });
      if (error) return { ok: false, message: error.message };
      return {
        ok: true,
        message: 'If that address has an account, a reset link is on its way.',
      };
    } catch (e) {
      return { ok: false, message: errorMessage(e) };
    }
  },

  updatePassword: async (password) => {
    if (!supabase) return { ok: false, message: 'Auth is not configured yet.' };
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { ok: false, message: error.message };
      set({ recoveryMode: false });
      return { ok: true, message: 'Your password has been updated.' };
    } catch (e) {
      return { ok: false, message: errorMessage(e) };
    }
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ session: null, user: null, status: 'signedOut', recoveryMode: false });
  },

  deleteAccount: async () => {
    if (!supabase) {
      // No backend — just clear the local (preview) session.
      set({ session: null, user: null, status: 'signedOut' });
      return { ok: true };
    }
    try {
      const { data, error } = await supabase.functions.invoke('delete-account');
      if (error) return { ok: false, message: error.message };
      if (data && (data as { error?: string }).error) {
        return { ok: false, message: (data as { error: string }).error };
      }
      // Account is gone — clear the now-invalid session locally.
      await supabase.auth.signOut();
      set({
        session: null,
        user: null,
        status: 'signedOut',
        recoveryMode: false,
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, message: errorMessage(e) };
    }
  },
}));
