import type { Profile } from '../types';

/** Stable 32-bit hash of a string (FNV-1a). */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The preset animal set. Final 3D renders live in /public/avatars/animals/<slug>.png */
export const ANIMALS: { slug: string; name: string; emoji: string }[] = [
  { slug: 'fox', name: 'Fox', emoji: '🦊' },
  { slug: 'octopus', name: 'Octopus', emoji: '🐙' },
  { slug: 'bee', name: 'Bee', emoji: '🐝' },
  { slug: 'chick', name: 'Chick', emoji: '🐥' },
  { slug: 'elephant', name: 'Elephant', emoji: '🐘' },
  { slug: 'turtle', name: 'Turtle', emoji: '🐢' },
  { slug: 'pig', name: 'Pig', emoji: '🐷' },
  { slug: 'frog', name: 'Frog', emoji: '🐸' },
  { slug: 'penguin', name: 'Penguin', emoji: '🐧' },
  { slug: 'giraffe', name: 'Giraffe', emoji: '🦒' },
  { slug: 'koala', name: 'Koala', emoji: '🐨' },
  { slug: 'dino', name: 'Dino', emoji: '🦕' },
];

export const ANIMAL_BY_SLUG = Object.fromEntries(
  ANIMALS.map((a) => [a.slug, a]),
);

/** Deterministic animal slug for a user id (stable across sessions). */
export function defaultAnimalForId(id: string): string {
  return ANIMALS[hashString(id) % ANIMALS.length].slug;
}

/**
 * Deterministic soft two-stop gradient for a user id. Used as the background
 * behind an emoji/initials fallback so every user gets a stable, unique tint.
 */
export function gradientForId(id: string): string {
  const h = hashString(id);
  const hue1 = h % 360;
  const hue2 = (hue1 + 40 + ((h >> 8) % 60)) % 360;
  return `linear-gradient(135deg, hsl(${hue1} 65% 55%), hsl(${hue2} 60% 45%))`;
}

/** Single-letter initial from a profile (first name, else email). */
export function initialsFor(profile: Profile | null, email?: string): string {
  const first = profile?.first_name?.trim();
  if (first) return first[0].toUpperCase();
  const last = profile?.last_name?.trim();
  if (last) return last[0].toUpperCase();
  const source = (profile?.email ?? email ?? '').trim();
  return (source[0] ?? '?').toUpperCase();
}

/** A curated set of emojis for the "choose your own emoji" avatar option. */
export const EMOJI_CHOICES: string[] = [
  '😀', '😎', '🤓', '🥳', '😊', '🤔', '😴', '🤗',
  '🚀', '⭐', '🔥', '⚡', '🌈', '🌸', '🍀', '🌊',
  '🎨', '🎧', '🎮', '📚', '💡', '🧠', '🦄', '👾',
  '🐙', '🦊', '🐼', '🐨', '🦁', '🐸', '🐝', '🦋',
  '🍕', '🍩', '☕', '🌮', '🍉', '🥑', '🌵', '🪐',
];

/** Full display name, falling back to the email local-part, then "there". */
export function displayName(profile: Profile | null, email?: string): string {
  const name = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (name) return name;
  const mail = profile?.email ?? email;
  if (mail) return mail.split('@')[0];
  return 'there';
}
