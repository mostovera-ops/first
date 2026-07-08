import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../../types';
import {
  ANIMAL_BY_SLUG,
  avatarColorForId,
  initialsFor,
} from '../../lib/avatar';
import { cn } from '../../lib/utils';

interface AvatarProps {
  profile: Profile | null;
  user?: User | null;
  size?: number;
  className?: string;
}

/** Path where the user's final 3D animal renders live. */
export function animalImageSrc(slug: string): string {
  return `/avatars/animals/${slug}.png`;
}

/**
 * Renders a user's avatar with graceful fallbacks:
 *   upload → uploaded image
 *   animal → /public/avatars/animals/<slug>.png, falling back to the animal's
 *            emoji on a deterministic gradient when the file is missing
 *   otherwise → initials on a deterministic gradient
 */
export function Avatar({ profile, user, size = 32, className }: AvatarProps) {
  const id = profile?.id ?? user?.id ?? 'anon';
  const bg = avatarColorForId(id);
  const [imgError, setImgError] = useState(false);

  // Reset the error flag when the underlying image source changes.
  const srcKey =
    profile?.avatar_type === 'upload'
      ? profile.avatar_url
      : profile?.avatar_animal;
  useEffect(() => setImgError(false), [srcKey]);

  const dimension = { width: size, height: size };
  const base = cn(
    'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full leading-none',
    className,
  );

  // Custom emoji avatar.
  if (profile?.avatar_type === 'emoji' && profile.avatar_emoji) {
    return (
      <span
        className={base}
        style={{ ...dimension, background: bg }}
        aria-hidden
      >
        <span style={{ fontSize: size * 0.7, lineHeight: 1 }}>
          {profile.avatar_emoji}
        </span>
      </span>
    );
  }

  // Uploaded image.
  if (profile?.avatar_type === 'upload' && profile.avatar_url && !imgError) {
    return (
      <span className={base} style={dimension}>
        <img
          src={profile.avatar_url}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      </span>
    );
  }

  // Animal render, with emoji-on-gradient fallback when the file is missing.
  if (profile?.avatar_type === 'animal' && profile.avatar_animal) {
    const animal = ANIMAL_BY_SLUG[profile.avatar_animal];
    if (!imgError) {
      return (
        <span className={base} style={{ ...dimension, background: bg }}>
          <img
            src={animalImageSrc(profile.avatar_animal)}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        </span>
      );
    }
    return (
      <span
        className={base}
        style={{ ...dimension, background: bg }}
        aria-hidden
      >
        <span style={{ fontSize: size * 0.7, lineHeight: 1 }}>
          {animal?.emoji ?? '🙂'}
        </span>
      </span>
    );
  }

  // Single-letter initial on gradient — large and centered.
  return (
    <span
      className={cn(base, 'font-semibold text-white')}
      style={{ ...dimension, background: bg }}
    >
      <span style={{ fontSize: size * 0.8, lineHeight: 1 }}>
        {initialsFor(profile, user?.email ?? undefined)}
      </span>
    </span>
  );
}
