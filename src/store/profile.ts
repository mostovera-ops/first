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
  /** Switch to a preset animal avatar. */
  setAnimalAvatar: (slug: string) => Promise<void>;
  /** Switch to a custom emoji avatar. */
  setEmojiAvatar: (emoji: string) => Promise<void>;
  /** Upload a cropped image to Storage and switch to it. */
  uploadAvatarImage: (blob: Blob) => Promise<void>;
  clear: () => void;
}

const AVATAR_BUCKET = 'avatars';

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
    avatar_emoji: null,
    welcomed_at: null,
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

    let resolved: Profile;
    if (error) {
      resolved = fallbackProfile(user);
    } else if (data) {
      resolved = data as Profile;
    } else {
      // No row yet (trigger missing or race) — create a minimal one.
      const { data: created } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email ?? null,
          first_name: fallbackProfile(user).first_name,
          last_name: fallbackProfile(user).last_name,
        })
        .select('*')
        .single();
      resolved = (created as Profile) ?? fallbackProfile(user);
    }

    // Ensure a default animal exists for empty rows.
    if (resolved.avatar_type === 'animal' && !resolved.avatar_animal) {
      resolved.avatar_animal = defaultAnimalForId(user.id);
    }
    set({ profile: resolved, loading: false });

    // One-time welcome email, once the address is confirmed / first login.
    const confirmed = Boolean(user.email_confirmed_at ?? user.confirmed_at);
    if (!resolved.welcomed_at && confirmed) {
      try {
        await supabase.functions.invoke('send-email', {
          body: { type: 'welcome' },
        });
        await get().updateProfile({ welcomed_at: new Date().toISOString() });
      } catch {
        // Function not deployed yet or a transient error — retry next login.
      }
    }
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

  setAnimalAvatar: async (slug) => {
    await get().updateProfile({ avatar_type: 'animal', avatar_animal: slug });
  },

  setEmojiAvatar: async (emoji) => {
    await get().updateProfile({ avatar_type: 'emoji', avatar_emoji: emoji });
  },

  uploadAvatarImage: async (blob) => {
    const profile = get().profile;
    if (!profile) return;

    // No backend configured — preview locally with an object URL.
    if (!supabase) {
      const url = URL.createObjectURL(blob);
      await get().updateProfile({ avatar_type: 'upload', avatar_url: url });
      return;
    }

    const path = `${profile.id}/avatar.png`;
    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, blob, { upsert: true, contentType: 'image/png' });
    if (error) throw error;

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    // Cache-bust so the new image shows immediately behind the stable path.
    const url = `${data.publicUrl}?t=${Date.now()}`;
    await get().updateProfile({ avatar_type: 'upload', avatar_url: url });
  },

  clear: () => set({ profile: null, loading: false }),
}));
