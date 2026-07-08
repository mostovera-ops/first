import { useState } from 'react';
import { Check, SmilePlus } from 'lucide-react';
import { useProfile } from '../../store/profile';
import { ANIMALS } from '../../lib/avatar';
import { animalImageSrc } from './Avatar';
import { EmojiPicker } from './EmojiPicker';
import { cn } from '../../lib/utils';

export function AvatarPicker() {
  const profile = useProfile((s) => s.profile);
  const setAnimalAvatar = useProfile((s) => s.setAnimalAvatar);
  const setEmojiAvatar = useProfile((s) => s.setEmojiAvatar);

  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiSelected = profile?.avatar_type === 'emoji';

  return (
    <div>
      {/* Exactly two rows: [choose-your-emoji] + 12 animals across 7 columns. */}
      <div className="grid grid-cols-7 gap-2">
        {/* First tile — choose your own emoji */}
        <div className="relative">
          <button
            aria-label="Choose your own emoji"
            title="Choose your own emoji"
            onClick={() => setEmojiOpen((v) => !v)}
            className={cn(
              'flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border transition',
              emojiSelected
                ? 'border-accent ring-2 ring-accent/40'
                : 'border-dashed border-line hover:border-white/20 hover:bg-surface-2',
            )}
          >
            {emojiSelected && profile?.avatar_emoji ? (
              <span className="text-[22px] leading-none">
                {profile.avatar_emoji}
              </span>
            ) : (
              <SmilePlus size={18} className="text-ink-faint" />
            )}
            {emojiSelected && (
              <span className="absolute right-0.5 top-0.5 rounded-full bg-accent p-0.5 text-white">
                <Check size={10} />
              </span>
            )}
          </button>
          {emojiOpen && (
            <EmojiPicker
              onPick={(emoji) => {
                void setEmojiAvatar(emoji);
                setEmojiOpen(false);
              }}
              onClose={() => setEmojiOpen(false)}
            />
          )}
        </div>

        {/* Preset animals */}
        {ANIMALS.map((animal) => {
          const selected =
            profile?.avatar_type === 'animal' &&
            profile.avatar_animal === animal.slug;
          return (
            <button
              key={animal.slug}
              title={animal.name}
              aria-label={animal.name}
              onClick={() => void setAnimalAvatar(animal.slug)}
              className={cn(
                'relative aspect-square overflow-hidden rounded-xl border transition',
                selected
                  ? 'border-accent ring-2 ring-accent/40'
                  : 'border-line hover:border-white/20 hover:bg-surface-2',
              )}
            >
              <AnimalTile slug={animal.slug} emoji={animal.emoji} />
              {selected && (
                <span className="absolute right-0.5 top-0.5 rounded-full bg-accent p-0.5 text-white">
                  <Check size={10} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 text-[11px] text-ink-faint">
        Pick a character or your own emoji. To use a photo, click your avatar
        above.
      </p>
    </div>
  );
}

/** Animal tile: real render if present, else emoji on a soft surface. */
function AnimalTile({ slug, emoji }: { slug: string; emoji: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-surface-2 text-[22px]">
        {emoji}
      </span>
    );
  }
  return (
    <img
      src={animalImageSrc(slug)}
      alt=""
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
