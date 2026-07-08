import { useEffect, useRef } from 'react';
import { EMOJI_CHOICES } from '../../lib/avatar';

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  onClose: () => void;
}

/** Small popover of curated emojis. */
export function EmojiPicker({ onPick, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-[calc(100%+8px)] z-40 w-[268px] rounded-xl border border-line bg-elevated p-2 shadow-2xl"
    >
      <div className="grid grid-cols-8 gap-0.5">
        {EMOJI_CHOICES.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onPick(emoji)}
            className="flex aspect-square items-center justify-center rounded-md text-[18px] transition-colors hover:bg-surface-2"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
