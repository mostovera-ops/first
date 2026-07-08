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

    // Reflect the current session immediately, then subscribe to changes.
    supabase.auth.getSession().then(({ data }) => {
      set({
        session: data.session,
        user: data.session?.user ?? null,
        status: data.session ? 'signedIn' : 'signedOut',
      });
    });

    supabase.auth.onAuthStateChange((event, session) => {
      set({
        session,
        user: session?.user ?? null,
        status: session ? 'signedIn' : 'signedOut',
        recoveryMode:
          event === 'PASSWORD_RECOVERY' ? true : get().recoveryMode,
      });
    });
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
}));
