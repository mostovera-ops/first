import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../types';
import { supabase } from '../lib/supabase';
import { defaultAnimalForId } from '../lib/avatar';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;

  /** Load (or lazily create) the profile row for the given auth user. */
  loadProfile: (user: User) => Promise<void>;
  /** Patch fields and persist; optimistic local update. */
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  clear: () => void;
}

/** Provider that created this account, for display ("Password" vs "Google"). */
export function providerLabel(user: User | null): string {
  const provider =
    user?.app_metadata?.provider ??
    user?.identities?.[0]?.provider ??
    'email';
  if (provider === 'google') return 'Google';
  if (provider === 'email') return 'Password';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function fallbackProfile(user: User): Profile {
  const meta = user.user_metadata ?? {};
  const full = (meta.name as string) || (meta.full_name as string) || '';
  const [firstGuess, ...rest] = full.split(' ');
  return {
    id: user.id,
    email: user.email ?? null,
    first_name: (meta.given_name as string) || firstGuess || null,
    last_name: (meta.family_name as string) || rest.join(' ') || null,
    avatar_type: 'animal',
    avatar_animal: defaultAnimalForId(user.id),
    avatar_url: null,
  };
}

export const useProfile = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,

  loadProfile: async (user) => {
    if (!supabase) {
      // No backend configured — surface a local fallback so the UI renders.
      set({ profile: fallbackProfile(user), loading: false });
      return;
    }
    set({ loading: true });

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      set({ profile: fallbackProfile(user), loading: false });
      return;
    }

    if (data) {
      // Ensure a default animal exists for older/empty rows.
      const profile = data as Profile;
      if (profile.avatar_type === 'animal' && !profile.avatar_animal) {
        profile.avatar_animal = defaultAnimalForId(user.id);
      }
      set({ profile, loading: false });
      return;
    }

    // No row yet (trigger missing or race) — create one.
    const seed = fallbackProfile(user);
    const { data: created, error: insErr } = await supabase
      .from('profiles')
      .insert(seed)
      .select('*')
      .single();
    set({
      profile: (insErr ? seed : (created as Profile)) ?? seed,
      loading: false,
    });
  },

  updateProfile: async (patch) => {
    const current = get().profile;
    if (!current) return;
    const next = { ...current, ...patch };
    set({ profile: next }); // optimistic

    if (!supabase) return;
    const { error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', current.id);
    if (error) {
      // Roll back on failure.
      set({ profile: current });
      throw error;
    }
  },

  clear: () => set({ profile: null, loading: false }),
}));
