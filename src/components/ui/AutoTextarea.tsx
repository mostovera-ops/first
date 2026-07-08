import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

type AutoTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  minRows?: number;
};

/** Textarea that grows with its content (no scrollbar until very tall). */
export function AutoTextarea({
  className,
  minRows = 2,
  value,
  onChange,
  ...rest
}: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(resize, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      onChange={(e) => {
        onChange?.(e);
        resize();
      }}
      className={cn(
        'w-full resize-none overflow-hidden rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent/50 focus:ring-2 focus:ring-accent/20',
        className,
      )}
      {...rest}
    />
  );
}
